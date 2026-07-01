import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movie-form-types";
import { DEFAULT_MOVIE_VERSION } from "@/lib/dictionaries";
import {
  trimInput,
  trimInputOptional,
  trimMultilineOptional,
} from "@/lib/text-trim";

export function buildVideoTrackPayload(video: VideoFieldState) {
  return {
    width: video.width,
    height: video.height,
    resolutionLabel: trimInputOptional(video.resolutionLabel),
    codec: trimInputOptional(video.codec),
    hdr: trimInputOptional(video.hdr),
    fps: trimInputOptional(video.fps),
    bitrate: video.bitrate,
  };
}

export function buildAudioTracksPayload(
  rows: AudioFormRow[],
  options?: { filterEmpty?: boolean },
) {
  const filtered = options?.filterEmpty
    ? rows.filter((row) => row.codec || row.channelLayout || row.language)
    : rows;

  return filtered.map((row, index) => ({
    streamIndex: index,
    codec: trimInputOptional(row.codec),
    profile: row.profile && row.profile !== "None" ? row.profile : null,
    channelLayout: trimInputOptional(row.channelLayout),
    language: trimInputOptional(row.language),
    translationType: trimInputOptional(row.translationType),
    bitrate: row.bitrate,
    title: trimInputOptional(row.title),
    isDefault: row.isDefault,
  }));
}

export function buildSubtitleTracksPayload(
  rows: SubtitleFormRow[],
  options?: { filterEmpty?: boolean },
) {
  const filtered = options?.filterEmpty
    ? rows.filter((row) => row.codecLabel || row.language)
    : rows;

  return filtered.map((row, index) => ({
    streamIndex: index,
    codecLabel: trimInputOptional(row.codecLabel),
    language: trimInputOptional(row.language),
    forced: row.forced,
    isDefault: row.isDefault,
    title: trimInputOptional(row.title),
  }));
}

export interface MovieCreatePayloadInput {
  title: string;
  year: number | null;
  description: string | null;
  storageId: number | null;
  releaseType: string | null;
  version?: string | null;
  genres: string[];
  durationSeconds: number | null;
  filePath: string | null;
  video: VideoFieldState;
  audioRows: AudioFormRow[];
  subtitleRows: SubtitleFormRow[];
}

export function buildMovieCreatePayload(input: MovieCreatePayloadInput) {
  return {
    title: trimInput(input.title),
    year: input.year,
    description: trimMultilineOptional(input.description),
    storageId: input.storageId,
    releaseType: trimInputOptional(input.releaseType),
    version: trimInputOptional(input.version) || DEFAULT_MOVIE_VERSION,
    genres: input.genres,
    durationSeconds: input.durationSeconds,
    filePath: trimInputOptional(input.filePath),
    status: "CATALOG" as const,
    skipProbe: true,
    videoTrack: buildVideoTrackPayload(input.video),
    audioTracks: buildAudioTracksPayload(input.audioRows, { filterEmpty: true }),
    subtitleTracks: buildSubtitleTracksPayload(input.subtitleRows, {
      filterEmpty: true,
    }),
  };
}

export interface MovieFileMetaPayload {
  fileSize: number;
  fileMtime: string;
  fileHash: string;
}

export interface MovieUpdatePayloadInput {
  title: string;
  year: number | null;
  description: string | null;
  releaseType: string | null;
  version?: string | null;
  filePath: string | null;
  fileMeta: MovieFileMetaPayload | null;
  storageId: number | null;
  genres: string[];
  durationSeconds: number | null;
  rating: number | null;
  watchedAt: string;
  video: VideoFieldState;
  audioRows: AudioFormRow[];
  subtitleRows: SubtitleFormRow[];
}

export function buildMovieUpdatePayload(input: MovieUpdatePayloadInput) {
  return {
    title: trimInput(input.title),
    year: input.year,
    description: trimMultilineOptional(input.description),
    releaseType: trimInputOptional(input.releaseType),
    version: trimInputOptional(input.version) || DEFAULT_MOVIE_VERSION,
    filePath: trimInputOptional(input.filePath),
    ...(input.fileMeta
      ? {
          fileSize: input.fileMeta.fileSize,
          fileMtime: input.fileMeta.fileMtime,
          fileHash: input.fileMeta.fileHash,
        }
      : {}),
    storageId: input.storageId,
    genres: input.genres,
    durationSeconds: input.durationSeconds,
    rating: input.rating,
    watchedAt: input.watchedAt ? new Date(input.watchedAt).toISOString() : null,
    videoTrack: buildVideoTrackPayload(input.video),
    audioTracks: buildAudioTracksPayload(input.audioRows),
    subtitleTracks: buildSubtitleTracksPayload(input.subtitleRows),
  };
}
