import { execa } from "execa";
import { rename, rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import {
  finishBuild,
  isBuildCancelRequested,
  startHeartbeat,
  updateBuildProgress,
} from "@/lib/builds/build-queue";
import { registerBuildOutput } from "@/lib/builds/build-register";
import {
  buildFfmpegAudioOrdinalArgs,
  parseFfmpegProgressLine,
} from "@/lib/builds/build-ffmpeg";
import {
  buildMkvmergeArgs,
  parseMkvmergeProgress,
  tempTranscodedAudioPath,
  type MkvMergeInputFile,
} from "@/lib/builds/build-mkvmerge";
import {
  buildPartPath,
  ffprobeOrdinalAmongType,
} from "@/lib/builds/build-inspection";
import {
  inspectReleaseFile,
  resolveMkvTrackIdForStream,
} from "@/lib/builds/build-inspect-runtime";
import type { ChannelTarget, TranscodeCodec } from "@/lib/builds/build-presets";
import { buildInclude } from "@/lib/builds/build-queue";

interface ResolvedTrack {
  sortOrder: number;
  kind: "video" | "audio" | "subtitle";
  filePath: string;
  mkvTrackId: number;
  isDefault: boolean;
  offsetMs: number;
  syncFileIndex: number;
}

export async function runBuildJob(buildId: number, signal?: AbortSignal) {
  const stopHeartbeat = startHeartbeat(buildId);
  const tempFiles: string[] = [];

  try {
    const build = await prisma.releaseBuild.findUnique({
      where: { id: buildId },
      include: { tracks: { orderBy: { sortOrder: "asc" } } },
    });
    if (!build) throw new Error("Сборка не найдена");

    await updateBuildProgress(buildId, {
      phase: "prepare",
      progressPercent: 2,
      progressMessage: "Подготовка",
    });

    const partPath = buildPartPath(build.outputPath, buildId);
    tempFiles.push(partPath);

    const inspectedCache = new Map<number, Awaited<ReturnType<typeof inspectReleaseFile>>>();
    for (const releaseId of new Set(
      build.tracks.map((t) => t.sourceReleaseId).filter((id): id is number => id != null),
    )) {
      const track = build.tracks.find((t) => t.sourceReleaseId === releaseId);
      if (!track) continue;
      inspectedCache.set(
        releaseId,
        await inspectReleaseFile(releaseId, track.sourceFilePath, signal),
      );
    }

    const resolvedTracks: ResolvedTrack[] = [];
    let fileIndex = 0;
    const inputFiles: MkvMergeInputFile[] = [];
    const filePathToIndex = new Map<string, number>();

    const videoTrack = build.tracks.find((t) => t.kind === "VIDEO");
    if (!videoTrack?.sourceReleaseId) throw new Error("Не задан видео-источник");

    const videoInspected = inspectedCache.get(videoTrack.sourceReleaseId)!;
    const videoMkvId = resolveMkvTrackIdForStream(
      videoInspected,
      "video",
      videoTrack.sourceStreamIndex,
    );
    if (videoMkvId == null) throw new Error("Видеодорожка не сопоставлена");

    filePathToIndex.set(videoInspected.filePath, fileIndex);
    inputFiles.push({
      filePath: videoInspected.filePath,
      videoTrackIds: [videoMkvId],
      noChapters: false,
      noAttachments: false,
    });
    resolvedTracks.push({
      sortOrder: videoTrack.sortOrder,
      kind: "video",
      filePath: videoInspected.filePath,
      mkvTrackId: videoMkvId,
      isDefault: false,
      offsetMs: 0,
      syncFileIndex: fileIndex,
    });
    fileIndex++;

    for (const track of build.tracks.filter((t) => t.kind === "AUDIO")) {
      if (await isBuildCancelRequested(buildId)) {
        await finishBuild(buildId, "CANCELLED", {
          errorMessage: "Отменено пользователем",
        });
        return;
      }

      const releaseId = track.sourceReleaseId;
      if (!releaseId) throw new Error("Аудио без источника");
      const inspected = inspectedCache.get(releaseId)!;
      const audioOrdinal = ffprobeOrdinalAmongType(
        inspected.ffprobeStreams,
        track.sourceStreamIndex,
        "audio",
      );
      if (audioOrdinal < 0) throw new Error(`Аудиопоток ${track.sourceStreamIndex} не найден`);

      let audioFilePath = inspected.filePath;
      let mkvTrackId: number;

      if (track.audioMode === "TRANSCODE") {
        await updateBuildProgress(buildId, {
          phase: "transcode",
          progressMessage: `Перекодирование аудио #${track.sortOrder + 1}`,
        });
        const outDir = path.dirname(build.outputPath);
        const tempPath = tempTranscodedAudioPath(buildId, track.sortOrder, outDir);
        tempFiles.push(tempPath);

        const args = buildFfmpegAudioOrdinalArgs(
          {
            inputPath: inspected.filePath,
            streamIndex: track.sourceStreamIndex,
            outputPath: tempPath,
            codec: (track.transcodeCodec ?? "eac3") as TranscodeCodec,
            bitrateKbps: track.transcodeBitrate ?? 768,
            channelTarget: (track.channelTarget === "STEREO"
              ? "stereo"
              : "up_to_51") as ChannelTarget,
            offsetMs: track.offsetMs,
          },
          audioOrdinal,
        );

        await runFfmpegWithProgress(buildId, args, signal, 10, 55);
        audioFilePath = tempPath;

        const tempInspected = await inspectReleaseFile(
          releaseId,
          tempPath,
          signal,
        );
        const tempMkvId = resolveMkvTrackIdForStream(
          tempInspected,
          "audio",
          tempInspected.probe.audio[0]?.streamIndex ?? 0,
        );
        if (tempMkvId == null) throw new Error("Не удалось прочитать перекодированное аудио");
        mkvTrackId = tempMkvId;
      } else {
        const id = resolveMkvTrackIdForStream(
          inspected,
          "audio",
          track.sourceStreamIndex,
        );
        if (id == null) throw new Error(`Аудио ${track.sourceStreamIndex} не сопоставлено`);
        mkvTrackId = id;
      }

      let syncFileIndex = filePathToIndex.get(audioFilePath);
      if (syncFileIndex == null) {
        syncFileIndex = fileIndex;
        filePathToIndex.set(audioFilePath, fileIndex);
        inputFiles.push({
          filePath: audioFilePath,
          videoTrackIds: [],
          audioTrackIds: [mkvTrackId],
          noChapters: true,
          noAttachments: true,
        });
        fileIndex++;
      } else {
        const existing = inputFiles[syncFileIndex]!;
        existing.audioTrackIds = [...(existing.audioTrackIds ?? []), mkvTrackId];
      }

      resolvedTracks.push({
        sortOrder: track.sortOrder,
        kind: "audio",
        filePath: audioFilePath,
        mkvTrackId,
        isDefault: track.isDefault,
        offsetMs: track.audioMode === "TRANSCODE" ? 0 : track.offsetMs,
        syncFileIndex,
      });
    }

    for (const track of build.tracks.filter((t) => t.kind === "SUBTITLE")) {
      const releaseId = track.sourceReleaseId;
      if (!releaseId) throw new Error("Субтитры без источника");
      const inspected = inspectedCache.get(releaseId)!;
      const mkvId = resolveMkvTrackIdForStream(
        inspected,
        "subtitle",
        track.sourceStreamIndex,
      );
      if (mkvId == null) throw new Error(`Субтитр ${track.sourceStreamIndex} не сопоставлен`);

      let syncFileIndex = filePathToIndex.get(inspected.filePath);
      if (syncFileIndex == null) {
        syncFileIndex = fileIndex;
        filePathToIndex.set(inspected.filePath, fileIndex);
        inputFiles.push({
          filePath: inspected.filePath,
          subtitleTrackIds: [mkvId],
          noChapters: true,
          noAttachments: true,
        });
        fileIndex++;
      } else {
        const existing = inputFiles[syncFileIndex]!;
        existing.subtitleTrackIds = [
          ...(existing.subtitleTrackIds ?? []),
          mkvId,
        ];
      }

      resolvedTracks.push({
        sortOrder: track.sortOrder,
        kind: "subtitle",
        filePath: inspected.filePath,
        mkvTrackId: mkvId,
        isDefault: false,
        offsetMs: 0,
        syncFileIndex,
      });
    }

    if (await isBuildCancelRequested(buildId)) {
      await finishBuild(buildId, "CANCELLED", {
        errorMessage: "Отменено пользователем",
      });
      return;
    }

    await updateBuildProgress(buildId, {
      phase: "mux",
      progressPercent: 60,
      progressMessage: "Сборка MKV",
    });

    const muxArgs = buildMkvmergeArgs({
      outputPath: partPath,
      inputs: inputFiles,
    });

    await runMkvmergeWithProgress(buildId, muxArgs, signal);

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
    await finishBuild(buildId, "SUCCEEDED", { outputReleaseId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка сборки";
    if (message.includes("abort") || (signal?.aborted ?? false)) {
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

async function runFfmpegWithProgress(
  buildId: number,
  args: string[],
  signal: AbortSignal | undefined,
  minPct: number,
  maxPct: number,
) {
  const child = execa("ffmpeg", args, {
    cancelSignal: signal,
    stdout: "pipe",
    stderr: "pipe",
  });

  child.stdout?.on("data", (chunk: Buffer) => {
    const lines = chunk.toString().split("\n");
    for (const line of lines) {
      const progress = parseFfmpegProgressLine(line);
      if (progress?.outTimeMs != null) {
        const pct = Math.min(maxPct, minPct + (progress.outTimeMs / 1_000_000) * 5);
        void updateBuildProgress(buildId, {
          progressPercent: pct,
          progressMessage: progress.speed
            ? `Перекодирование (${progress.speed}x)`
            : "Перекодирование",
        });
      }
    }
  });

  await child;
}

async function runMkvmergeWithProgress(
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
          progressPercent: 60 + pct * 0.3,
          progressMessage: `Сборка MKV ${pct}%`,
        });
      }
    }
  };

  child.stdout?.on("data", handleChunk);
  child.stderr?.on("data", handleChunk);
  await child;
}

export async function loadBuildForRun(buildId: number) {
  return prisma.releaseBuild.findUnique({
    where: { id: buildId },
    include: buildInclude,
  });
}
