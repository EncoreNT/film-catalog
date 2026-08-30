import { access, constants } from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import type { z } from "zod";
import type { bdmvRemuxCreateSchema } from "@/lib/api/validators/bdmv";
import { inspectBdmv, type BdmvInspectSelected } from "@/lib/media/bdmv/bdmv-inspect";
import {
  assertMovieHasNoActiveBuilds,
  buildInclude,
  nextQueueOrder,
} from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";
import { getBuildCapabilities } from "@/lib/builds/build-capabilities";
import { assertWslDriveMounted } from "@/lib/shared/wsl-drive-mount";
import { normalizeFilePathInput } from "@/lib/shared/display-path";
import { assertTargetDirFits } from "@/lib/shared/disk-space-fit";

const accessAsync = promisify(access);
const GIGABYTE = 1024 ** 3;

type BdmvRemuxInput = z.infer<typeof bdmvRemuxCreateSchema>;

const ACK_WARNING_CODES = new Set(["multiple-bdmv", "short-playlists"]);

export function assertBdmvTracksMatchIdentify(
  tracks: Array<{ kind: "video" | "audio" | "subtitle"; sourceStreamIndex: number }>,
  selected: BdmvInspectSelected,
): void {
  const allowed = new Map<number, "video" | "audio" | "subtitle">();
  for (const track of selected.tracks.video) allowed.set(track.id, "video");
  for (const track of selected.tracks.audio) allowed.set(track.id, "audio");
  for (const track of selected.tracks.subtitles) allowed.set(track.id, "subtitle");

  for (const track of tracks) {
    const actual = allowed.get(track.sourceStreamIndex);
    if (actual == null) {
      throw new Error(
        `Неизвестная дорожка mkvmerge id ${track.sourceStreamIndex}`,
      );
    }
    if (actual !== track.kind) {
      throw new Error(
        `Дорожка ${track.sourceStreamIndex} имеет тип ${actual}, а не ${track.kind}`,
      );
    }
  }
  if (!tracks.some((track) => track.kind === "video")) {
    throw new Error("В составе должна быть видеодорожка");
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await accessAsync(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function enqueueBdmvRemux(movieId: number, input: BdmvRemuxInput) {
  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true, coverPath: true },
  });
  if (!movie) throw new Error("Фильм не найден");

  const caps = await getBuildCapabilities();
  if (!caps.mkvmerge.available) throw new Error("mkvmerge не найден в PATH");
  if (!caps.ffprobe.available) throw new Error("ffprobe не найден в PATH");

  await assertMovieHasNoActiveBuilds(movieId);

  const playlistPath = normalizeFilePathInput(input.playlistPath);
  const outputPath = normalizeFilePathInput(input.outputPath);
  const bdmvRootInput = normalizeFilePathInput(input.bdmvRoot);
  if (!playlistPath || !outputPath || !bdmvRootInput) {
    throw new Error("Укажите папку BDMV, плейлист и путь вывода");
  }
  if (!outputPath.toLowerCase().endsWith(".mkv")) {
    throw new Error("Файл результата должен иметь расширение .mkv");
  }

  await assertWslDriveMounted(playlistPath);
  await assertWslDriveMounted(outputPath);

  const inspected = await inspectBdmv(bdmvRootInput, playlistPath);
  const selectedPlaylist = inspected.playlists.find((p) => p.path === playlistPath);
  if (!selectedPlaylist || !inspected.selected) {
    throw new Error("Выбранный плейлист не найден");
  }
  if (selectedPlaylist.missingClips.length > 0) {
    throw new Error(
      `В STREAM нет клипов: ${selectedPlaylist.missingClips.join(", ")}`,
    );
  }
  if (!inspected.selected.tracks.video.length) {
    throw new Error("mkvmerge не смог прочитать выбранный плейлист");
  }

  const needsAck = inspected.warnings.some((w) => ACK_WARNING_CODES.has(w.code));
  if (needsAck && !input.acknowledgeWarnings) {
    throw new Error("Подтвердите предупреждения перед запуском сборки");
  }

  assertBdmvTracksMatchIdentify(input.tracks, inspected.selected);

  if (input.moviePartId != null) {
    const part = await prisma.moviePart.findFirst({
      where: { id: input.moviePartId, movieId },
      select: { id: true },
    });
    if (!part) throw new Error("Серия не найдена");
  }

  const existingRelease = await prisma.release.findFirst({
    where: { filePath: outputPath },
    select: { id: true },
  });
  if (existingRelease) {
    throw new Error("Файл по этому пути уже зарегистрирован как релиз");
  }

  const busy = await prisma.releaseBuild.findFirst({
    where: { outputPath, status: { in: ["QUEUED", "RUNNING"] } },
    select: { id: true },
  });
  if (busy) {
    throw new Error("На этот путь уже поставлена другая сборка");
  }

  if (await fileExists(outputPath)) {
    throw new Error("Файл уже существует");
  }

  const outputDir = path.dirname(outputPath);
  if (!(await fileExists(outputDir))) {
    throw new Error("Папка для файла результата не найдена");
  }

  await assertTargetDirFits(
    outputDir,
    selectedPlaylist.estimatedBytes + GIGABYTE,
  );

  const queueOrder = await nextQueueOrder();
  const build = await prisma.releaseBuild.create({
    data: {
      movieId,
      kind: "bdmv",
      status: "QUEUED",
      requiresTranscode: false,
      queueOrder,
      outputPath,
      outputReleaseType: input.outputReleaseType ?? "bdremux",
      outputVersion: input.outputVersion ?? "theatrical",
      externalStorageId: input.externalStorageId ?? null,
      moviePartId: input.moviePartId ?? null,
      acknowledgedWarnings: JSON.stringify(inspected.warnings),
      sources: {
        create: [
          { role: "bdmv-root", filePath: inspected.bdmvRoot, releaseId: null },
          { role: "bdmv-playlist", filePath: playlistPath, releaseId: null },
        ],
      },
      tracks: {
        create: input.tracks.map((track, sortOrder) => ({
          sortOrder,
          kind: track.kind.toUpperCase() as "VIDEO" | "AUDIO" | "SUBTITLE",
          sourceReleaseId: null,
          sourceStreamIndex: track.sourceStreamIndex,
          sourceFilePath: playlistPath,
          sourceTrackLabel: track.label ?? null,
          audioMode: track.kind === "audio" ? "COPY" : null,
          isDefault: track.isDefault ?? false,
          forced: track.forced ?? false,
        })),
      },
    },
    include: buildInclude,
  });

  return serializeBuild(build);
}
