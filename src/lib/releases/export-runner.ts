import { rename, rm, stat } from "node:fs/promises";
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
import {
  finishExport,
  isExportCancelRequested,
  startExportHeartbeat,
  updateExportProgress,
} from "@/lib/releases/export-queue";
import { assertWslDriveMounted } from "@/lib/shared/wsl-drive-mount";

const PROGRESS_DB_INTERVAL_MS = 2_000;

function exportProgressMessage(bytesCopied: number, totalBytes: number): string {
  return mediaJobProgressMessage(bytesCopied, totalBytes);
}

async function fileExists(filePath: string): Promise<boolean> {
  return mediaJobFileExists(filePath);
}

export async function runExportJob(exportId: number, signal?: AbortSignal) {
  const stopHeartbeat = startExportHeartbeat(exportId);
  let partPath: string | null = null;

  try {
    const job = await prisma.releaseExport.findUnique({
      where: { id: exportId },
    });
    if (!job) throw new Error("Экспорт не найден");

    if (await isExportCancelRequested(exportId)) {
      await finishExport(exportId, "CANCELLED", {
        errorMessage: "Отменено до запуска",
      });
      return;
    }

    await assertWslDriveMounted(job.targetPath);

    if (await fileExists(job.targetPath)) {
      await finishExport(exportId, "FAILED", {
        errorMessage: `Файл уже существует: ${displayFilePath(job.targetPath)}`,
      });
      return;
    }

    const sourceStat = await stat(job.sourceFilePath);
    const totalBytes = job.sourceFileSize ?? sourceStat.size;
    partPath = exportPartPath(job.targetPath, exportId);

    await updateExportProgress(exportId, {
      phase: "copying",
      progressPercent: 0,
      progressMessage: exportProgressMessage(0, totalBytes),
      progressSpeed: null,
    });

    let lastDbUpdate = 0;
    const speedWindow = createCopySpeedWindow();
    speedWindow.observe(0);

    const copyAbort = new AbortController();
    const onParentAbort = () => copyAbort.abort();
    signal?.addEventListener("abort", onParentAbort);
    const cancelPoll = setInterval(() => {
      void isExportCancelRequested(exportId).then((cancelled) => {
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

          void updateExportProgress(exportId, {
            phase: "copying",
            progressPercent: copyProgressPercent({ bytesCopied, totalBytes }),
            progressMessage: exportProgressMessage(bytesCopied, totalBytes),
            progressSpeed: speed,
          });
        },
      });
    } finally {
      speedWindow.clear();
      clearInterval(cancelPoll);
      signal?.removeEventListener("abort", onParentAbort);
    }

    if (copyAbort.signal.aborted || (await isExportCancelRequested(exportId))) {
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

    await finishExport(exportId, "SUCCEEDED");
  } catch (err) {
    const cancelled =
      signal?.aborted ||
      (err instanceof Error &&
        (err.name === "AbortError" || err.message === "Отменено"));

    if (partPath) {
      await rm(partPath, { force: true }).catch(() => undefined);
    }

    if (cancelled || (await isExportCancelRequested(exportId))) {
      await finishExport(exportId, "CANCELLED", {
        errorMessage: "Отменено",
      });
      return;
    }

    const message =
      err instanceof Error ? err.message : "Не удалось скопировать файл";
    await finishExport(exportId, "FAILED", { errorMessage: message });
  } finally {
    stopHeartbeat();
  }
}
