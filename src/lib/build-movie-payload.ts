import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movie-form-types";

export function buildVideoTrackPayload(video: VideoFieldState) {
  return {
    width: video.width,
    height: video.height,
    resolutionLabel: video.resolutionLabel || null,
    codec: video.codec || null,
    hdr: video.hdr || null,
    fps: video.fps || null,
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
    codec: row.codec || null,
    profile: row.profile && row.profile !== "None" ? row.profile : null,
    channelLayout: row.channelLayout || null,
    language: row.language || null,
    translationType: row.translationType || null,
    bitrate: row.bitrate,
    title: row.title || null,
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
    codecLabel: row.codecLabel || null,
    language: row.language || null,
    forced: row.forced,
    isDefault: row.isDefault,
    title: row.title || null,
  }));
}

export interface MovieCreatePayloadInput {
  title: string;
  year: number | null;
  description: string | null;
  storageId: number | null;
  releaseType: string | null;
  genres: string[];
  durationSeconds: number | null;
  filePath: string | null;
  video: VideoFieldState;
  audioRows: AudioFormRow[];
  subtitleRows: SubtitleFormRow[];
}

export function buildMovieCreatePayload(input: MovieCreatePayloadInput) {
  return {
    title: input.title.trim(),
    year: input.year,
    description: input.description,
    storageId: input.storageId,
    releaseType: input.releaseType,
    genres: input.genres,
    durationSeconds: input.durationSeconds,
    filePath: input.filePath,
    status: "CATALOG" as const,
    skipProbe: true,
    videoTrack: buildVideoTrackPayload(input.video),
    audioTracks: buildAudioTracksPayload(input.audioRows, { filterEmpty: true }),
    subtitleTracks: buildSubtitleTracksPayload(input.subtitleRows, {
      filterEmpty: true,
    }),
  };
}

export interface MovieUpdatePayloadInput {
  title: string;
  year: number | null;
  description: string | null;
  releaseType: string | null;
  filePath: string | null;
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
    title: input.title,
    year: input.year,
    description: input.description || null,
    releaseType: input.releaseType || null,
    filePath: input.filePath?.trim() || null,
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
