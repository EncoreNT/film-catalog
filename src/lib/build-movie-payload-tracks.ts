import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movie-form-types";
import {
  trimInputOptional,
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
