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
import {
  buildAudioTracksPayload,
  buildSubtitleTracksPayload,
  buildVideoTrackPayload,
} from "./build-movie-payload-tracks";

export {
  buildVideoTrackPayload,
  buildAudioTracksPayload,
  buildSubtitleTracksPayload,
} from "./build-movie-payload-tracks";

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
    genres: input.genres,
    status: "CATALOG" as const,
    release: {
      storageId: input.storageId,
      releaseType: trimInputOptional(input.releaseType),
      version: trimInputOptional(input.version) || DEFAULT_MOVIE_VERSION,
      durationSeconds: input.durationSeconds,
      filePath: trimInputOptional(input.filePath),
      skipProbe: true,
      videoTrack: buildVideoTrackPayload(input.video),
      audioTracks: buildAudioTracksPayload(input.audioRows, { filterEmpty: true }),
      subtitleTracks: buildSubtitleTracksPayload(input.subtitleRows, {
        filterEmpty: true,
      }),
    },
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
  genres: string[];
  rating: number | null;
  watchedAt: string;
}

export interface ReleaseUpdatePayloadInput {
  releaseType: string | null;
  version?: string | null;
  filePath: string | null;
  fileMeta: MovieFileMetaPayload | null;
  storageId: number | null;
  durationSeconds: number | null;
  video: VideoFieldState;
  audioRows: AudioFormRow[];
  subtitleRows: SubtitleFormRow[];
}

export function buildMovieUpdatePayload(input: MovieUpdatePayloadInput) {
  return {
    title: trimInput(input.title),
    year: input.year,
    description: trimMultilineOptional(input.description),
    genres: input.genres,
    rating: input.rating,
    watchedAt: input.watchedAt ? new Date(input.watchedAt).toISOString() : null,
  };
}

export function buildReleaseUpdatePayload(input: ReleaseUpdatePayloadInput) {
  return {
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
    durationSeconds: input.durationSeconds,
    videoTrack: buildVideoTrackPayload(input.video),
    audioTracks: buildAudioTracksPayload(input.audioRows),
    subtitleTracks: buildSubtitleTracksPayload(input.subtitleRows),
  };
}
