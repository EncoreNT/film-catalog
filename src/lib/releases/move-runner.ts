import { rename, rm, stat, unlink } from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";
import {
  copyFileWithProgress,
  copyProgressPercent,
} from "@/lib/shared/copy-with-progress";
import { displayFilePath } from "@/lib/shared/display-path";
import { mediaJobFileExists } from "@/lib/media-jobs/file-exists";
import { createCopySpeedWindow } from "@/lib/media-jobs/copy-speed-window";
import { mediaJobProgressMessage } from "@/lib/media-jobs/job-progress-message";
import { exportPartPath } from "@/lib/releases/export-part-path";
import { readMovieFileMeta } from "@/lib/releases/movie-file-meta";
import { resolveReleaseFileDownloadedAt } from "@/lib/releases/release-file-downloaded-at";
import {
  finishMove,
  isMoveCancelRequested,
  startMoveHeartbeat,
  updateMoveProgress,
} from "@/lib/releases/move-queue";
import { assertWslDriveMounted } from "@/lib/shared/wsl-drive-mount";

const PROGRESS_DB_INTERVAL_MS = 2_000;

function moveProgressMessage(bytesCopied: number, totalBytes: number): string {
  return mediaJobProgressMessage(bytesCopied, totalBytes);
}

async function fileExists(filePath: string): Promise<boolean> {
  return mediaJobFileExists(filePath);
}

export async function runMoveJob(moveId: number, signal?: AbortSignal) {
  const stopHeartbeat = startMoveHeartbeat(moveId);
  let partPath: string | null = null;

  try {
    const job = await prisma.releaseMove.findUnique({
      where: { id: moveId },
    });
    if (!job) throw new Error("Перемещение не найдено");

    if (await isMoveCancelRequested(moveId)) {
      await finishMove(moveId, "CANCELLED", {
        errorMessage: "Отменено до запуска",
      });
      return;
    }

    await assertWslDriveMounted(job.targetPath);

    if (await fileExists(job.targetPath)) {
      await finishMove(moveId, "FAILED", {
        errorMessage: `Файл уже существует: ${displayFilePath(job.targetPath)}`,
      });
      return;
    }

    const sourceStat = await stat(job.sourceFilePath);
    const totalBytes = job.sourceFileSize ?? sourceStat.size;
    partPath = exportPartPath(job.targetPath, moveId);

    await updateMoveProgress(moveId, {
      phase: "copying",
      progressPercent: 0,
      progressMessage: moveProgressMessage(0, totalBytes),
      progressSpeed: null,
    });

    let lastDbUpdate = 0;
    const speedWindow = createCopySpeedWindow();
    speedWindow.observe(0);

    const copyAbort = new AbortController();
    const onParentAbort = () => copyAbort.abort();
    signal?.addEventListener("abort", onParentAbort);
    const cancelPoll = setInterval(() => {
      void isMoveCancelRequested(moveId).then((cancelled) => {
        if (cancelled) copyAbort.abort();
      });
    }, 1_000);

    try {
      await copyFileWithProgress(job.sourceFilePath, partPath, {
        totalBytes,
        signal: copyAbort.signal,
        onProgress: ({ bytesCopied }) => {
          const now = Date.now();
          const speed = speedWindow.observe(bytesCopied, now);
          if (now - lastDbUpdate < PROGRESS_DB_INTERVAL_MS) return;
          lastDbUpdate = now;

          void updateMoveProgress(moveId, {
            phase: "copying",
            progressPercent: copyProgressPercent({ bytesCopied, totalBytes }),
            progressMessage: moveProgressMessage(bytesCopied, totalBytes),
            progressSpeed: speed,
          });
        },
      });
    } finally {
      speedWindow.clear();
      clearInterval(cancelPoll);
      signal?.removeEventListener("abort", onParentAbort);
    }

    if (copyAbort.signal.aborted || (await isMoveCancelRequested(moveId))) {
      throw Object.assign(new Error("Отменено"), { code: "CANCELLED" });
    }

    const [copied, source] = await Promise.all([
      stat(partPath),
      stat(job.sourceFilePath),
    ]);
    if (copied.size !== source.size) {
      throw new Error("Размер скопированного файла не совпадает с исходником");
    }

    await rename(partPath, job.targetPath);
    partPath = null;

    await updateMoveProgress(moveId, {
      phase: "updating",
      progressPercent: 99,
      progressMessage: "Обновление каталога…",
      progressSpeed: null,
    });

    const meta = await readMovieFileMeta(job.targetPath);

    const releaseBefore = await prisma.release.findUnique({
      where: { id: job.releaseId },
      select: {
        fileDownloadedAt: true,
        fileHash: true,
        fileSize: true,
      },
    });

    const nextFileDownloadedAt = releaseBefore
      ? resolveReleaseFileDownloadedAt(
          releaseBefore,
          meta.fileDownloadedAt,
          meta.fileHash,
          meta.fileSize,
        )
      : meta.fileDownloadedAt;

    await prisma.$transaction(async (tx) => {
      await tx.release.update({
        where: { id: job.releaseId },
        data: {
          filePath: job.targetPath,
          fileSize: meta.fileSize,
          fileMtime: meta.fileMtime,
          fileDownloadedAt: nextFileDownloadedAt,
          fileHash: meta.fileHash,
          ...(job.externalStorageId != null
            ? { externalStorage: { connect: { id: job.externalStorageId } } }
            : { externalStorage: { disconnect: true } }),
        },
      });
    });

    let warningMessage: string | undefined;
    try {
      await unlink(job.sourceFilePath);
    } catch {
      warningMessage =
        "Файл перемещён, но исходник на старом месте не удалён — удалите вручную";
    }

    await finishMove(moveId, "SUCCEEDED", { warningMessage });
  } catch (err) {
    const cancelled =
      signal?.aborted ||
      (err instanceof Error &&
        (err.name === "AbortError" || err.message === "Отменено"));

    if (partPath) {
      await rm(partPath, { force: true }).catch(() => undefined);
    }

    if (cancelled || (await isMoveCancelRequested(moveId))) {
      await finishMove(moveId, "CANCELLED", {
        errorMessage: "Отменено",
      });
      return;
    }

    const message =
      err instanceof Error ? err.message : "Не удалось переместить файл";
    await finishMove(moveId, "FAILED", { errorMessage: message });
  } finally {
    stopHeartbeat();
  }
}
