import type { Prisma } from "@/generated/prisma/client";
import { probeMediaFile } from "@/lib/media/ffprobe";
import { loadMovieFileMeta } from "@/lib/releases/load-movie-file-meta";
import { syncReleaseTracks } from "@/lib/releases/movie-tracks";
import type { z } from "zod";
import type { movieCreateSchema, releaseCreateSchema, releaseUpdateSchema } from "@/lib/api/validators";

type ReleaseCreateInput = z.infer<typeof releaseCreateSchema>;
type MovieCreateInput = z.infer<typeof movieCreateSchema>;
type ReleaseUpdateInput = z.infer<typeof releaseUpdateSchema>;

type Db = Pick<
  Prisma.TransactionClient,
  "release" | "videoTrack" | "audioTrack" | "subtitleTrack"
>;

function mapAudioCreate(
  audio: NonNullable<ReleaseCreateInput["audioTracks"]>,
) {
  return audio.map((t, i) => ({
    streamIndex: t.streamIndex ?? i,
    codec: t.codec ?? null,
    profile: t.profile ?? null,
    channels: t.channels ?? null,
    channelLayout: t.channelLayout ?? null,
    bitrate: t.bitrate ?? null,
    language: t.language ?? null,
    translationType: t.translationType ?? null,
    title: t.title ?? null,
    isDefault: t.isDefault ?? false,
  }));
}

function mapSubtitleCreate(
  subtitles: NonNullable<ReleaseCreateInput["subtitleTracks"]>,
) {
  return subtitles.map((t, i) => ({
    streamIndex: t.streamIndex ?? i,
    codec: t.codec ?? null,
    codecLabel: t.codecLabel ?? null,
    language: t.language ?? null,
    title: t.title ?? null,
    isDefault: t.isDefault ?? false,
    forced: t.forced ?? false,
  }));
}

export async function resolveReleaseProbeData(input: ReleaseCreateInput) {
  let video = input.videoTrack ?? null;
  let audio = input.audioTracks ?? [];
  let subtitles = input.subtitleTracks ?? [];
  let durationSeconds = input.durationSeconds ?? null;

  const shouldProbe = !!input.filePath?.trim() && !input.skipProbe;
  if (shouldProbe) {
    try {
      const probe = await probeMediaFile(input.filePath!.trim());
      if (probe.durationSeconds != null) durationSeconds = probe.durationSeconds;
      if (probe.video) video = probe.video;
      if (probe.audio.length) audio = probe.audio;
      if (probe.subtitles.length) subtitles = probe.subtitles;
    } catch {
      // keep manual values
    }
  }

  return { video, audio, subtitles, durationSeconds };
}

export async function readReleaseFileMeta(filePath: string | null | undefined) {
  if (!filePath?.trim()) {
    return { fileSize: null, fileMtime: null, fileHash: null, trimmedPath: null };
  }
  const { readMovieFileMeta } = await loadMovieFileMeta();
  const meta = await readMovieFileMeta(filePath.trim());
  return {
    fileSize: meta.fileSize,
    fileMtime: meta.fileMtime,
    fileHash: meta.fileHash,
    trimmedPath: filePath.trim(),
  };
}

export async function createReleaseWithTracks(
  db: Db,
  movieId: number,
  input: ReleaseCreateInput,
) {
  const { video, audio, subtitles, durationSeconds } =
    await resolveReleaseProbeData(input);
  const { fileSize, fileMtime, fileHash, trimmedPath } =
    await readReleaseFileMeta(input.filePath);

  const release = await db.release.create({
    data: {
      movieId,
      releaseType: input.releaseType ?? null,
      version: input.version ?? undefined,
      durationSeconds,
      filePath: trimmedPath,
      fileSize,
      fileMtime,
      fileHash,
      externalStorageId: input.externalStorageId ?? null,
    },
  });

  await syncReleaseTracks(db, release.id, {
    videoTrack: video ?? undefined,
    audioTracks: audio.length ? mapAudioCreate(audio) : undefined,
    subtitleTracks: subtitles.length ? mapSubtitleCreate(subtitles) : undefined,
  });

  return release;
}

export async function updateReleaseWithTracks(
  db: Db,
  releaseId: number,
  input: ReleaseUpdateInput,
) {
  const {
    videoTrack,
    audioTracks,
    subtitleTracks,
    filePath,
    fileSize,
    fileMtime,
    fileHash,
    externalStorageId,
    version,
    ...rest
  } = input;

  let nextFileSize = fileSize;
  let nextFileMtime = fileMtime ? new Date(fileMtime) : fileMtime;
  let nextFileHash = fileHash;

  if (filePath !== undefined) {
    const trimmed = filePath?.trim() || null;
    if (!trimmed) {
      nextFileSize = null;
      nextFileMtime = null;
      nextFileHash = null;
    }
  }

  await db.release.update({
    where: { id: releaseId },
    data: {
      ...rest,
      ...(version != null ? { version } : {}),
      filePath: filePath === undefined ? undefined : filePath ? filePath.trim() : null,
      fileSize: nextFileSize,
      fileMtime: nextFileMtime === undefined ? undefined : nextFileMtime,
      fileHash: nextFileHash,
      ...(externalStorageId === undefined
        ? {}
        : externalStorageId != null
          ? { externalStorage: { connect: { id: externalStorageId } } }
          : { externalStorage: { disconnect: true } }),
    },
  });

  if (
    videoTrack !== undefined ||
    audioTracks !== undefined ||
    subtitleTracks !== undefined
  ) {
    await syncReleaseTracks(db, releaseId, {
      videoTrack: videoTrack ?? undefined,
      audioTracks,
      subtitleTracks,
    });
  }
}

/** Normalize legacy flat movie create fields into release input. */
export function extractReleaseInputFromMovieCreate(
  data: MovieCreateInput,
): ReleaseCreateInput | null {
  if (data.release) return data.release;

  const hasReleaseData =
    data.filePath ||
    data.releaseType ||
    data.videoTrack ||
    (data.audioTracks && data.audioTracks.length > 0);

  if (!hasReleaseData) return null;

  return {
    filePath: data.filePath,
    externalStorageId: data.externalStorageId,
    releaseType: data.releaseType,
    version: data.version,
    durationSeconds: data.durationSeconds,
    videoTrack: data.videoTrack,
    audioTracks: data.audioTracks,
    subtitleTracks: data.subtitleTracks,
    skipProbe: data.skipProbe,
    probeOnly: data.probeOnly,
  };
}
