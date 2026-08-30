import { execa } from "execa";
import { rename, rm } from "fs/promises";
import { prisma } from "@/lib/db/prisma";
import {
  finishBuild,
  isBuildCancelRequested,
  startHeartbeat,
  updateBuildProgress,
} from "@/lib/builds/build-queue";
import { registerBuildOutput } from "@/lib/builds/build-register";
import { buildMkvmergeArgs, parseMkvmergeProgress } from "@/lib/builds/build-mkvmerge";
import { buildPartPath } from "@/lib/builds/build-inspection";
import { bdmvTracksToMkvmergePlan } from "@/lib/builds/bdmv-mux";
import { maybeExtractCover } from "@/lib/covers/cover-storage";
import { normalizeBuildTrackKind } from "@/lib/builds/build-track-source";

function wrapMkvmergeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/encrypted|aacs|bd\+|undecrypt/i.test(raw)) {
    return "Поток защищён или повреждён. mkvmerge не смог прочитать диск.";
  }
  if (/abort/i.test(raw)) return "Отменено";
  return raw.includes("mkvmerge") ? raw : `Ошибка mkvmerge: ${raw}`;
}

async function runMkvmergeMux(
  buildId: number,
  args: string[],
  signal: AbortSignal | undefined,
) {
  const child = execa("mkvmerge", args, {
    cancelSignal: signal,
    stdout: "pipe",
    stderr: "pipe",
  });

  const handleChunk = (chunk: Buffer) => {
    const lines = chunk.toString().split("\n");
    for (const line of lines) {
      const pct = parseMkvmergeProgress(line);
      if (pct != null) {
        void updateBuildProgress(buildId, {
          progressPercent: 10 + pct * 0.8,
          progressMessage: `Сборка MKV ${pct}%`,
        });
      }
    }
  };

  child.stdout?.on("data", handleChunk);
  child.stderr?.on("data", handleChunk);
  await child;
}

export async function runBdmvBuildJob(buildId: number, signal?: AbortSignal) {
  const stopHeartbeat = startHeartbeat(buildId);
  const tempFiles: string[] = [];

  try {
    const build = await prisma.releaseBuild.findUnique({
      where: { id: buildId },
      include: {
        tracks: { orderBy: { sortOrder: "asc" } },
        sources: true,
        movie: { select: { coverPath: true } },
      },
    });
    if (!build) throw new Error("Сборка не найдена");

    const playlist =
      build.sources.find((s) => s.role === "bdmv-playlist")?.filePath ??
      build.tracks[0]?.sourceFilePath;
    if (!playlist) throw new Error("Не задан плейлист BDMV");

    const videoTracks = build.tracks.filter((t) => t.kind === "VIDEO");
    if (videoTracks.length === 0) throw new Error("В составе должна быть видеодорожка");

    const partPath = buildPartPath(build.outputPath, buildId);
    tempFiles.push(partPath);

    await updateBuildProgress(buildId, {
      phase: "mux",
      progressPercent: 8,
      progressMessage: "Сборка MKV из плейлиста",
    });

    const plan = bdmvTracksToMkvmergePlan(
      partPath,
      playlist,
      build.tracks.map((track) => ({
        sortOrder: track.sortOrder,
        kind: normalizeBuildTrackKind(track.kind),
        mkvTrackId: track.sourceStreamIndex,
        isDefault: track.isDefault,
        forced: track.forced,
        name: track.sourceTrackLabel ?? undefined,
      })),
    );
    const args = buildMkvmergeArgs(plan);

    await runMkvmergeMux(buildId, args, signal);

    if (await isBuildCancelRequested(buildId)) {
      await finishBuild(buildId, "CANCELLED", {
        errorMessage: "Отменено пользователем",
      });
      return;
    }

    await updateBuildProgress(buildId, {
      phase: "finalize",
      progressPercent: 92,
      progressMessage: "Финализация файла",
    });

    await rename(partPath, build.outputPath);

    await updateBuildProgress(buildId, {
      phase: "register",
      progressPercent: 96,
      progressMessage: "Регистрация релиза",
    });

    const outputReleaseId = await registerBuildOutput(buildId, build.outputPath);
    await maybeExtractCover(
      build.movieId,
      build.outputPath,
      Boolean(build.movie.coverPath),
    ).catch(() => undefined);
    await finishBuild(buildId, "SUCCEEDED", { outputReleaseId });
  } catch (err) {
    const message = wrapMkvmergeError(err);
    if (message.includes("abort") || message === "Отменено" || (signal?.aborted ?? false)) {
      await finishBuild(buildId, "CANCELLED", { errorMessage: "Отменено" });
    } else {
      await finishBuild(buildId, "FAILED", { errorMessage: message });
    }
  } finally {
    stopHeartbeat();
    for (const file of tempFiles) {
      await rm(file, { force: true }).catch(() => undefined);
    }
  }
}
