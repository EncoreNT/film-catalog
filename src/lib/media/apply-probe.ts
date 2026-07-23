import type { ProbeResult } from "@/lib/media/ffprobe";
import { validateAudioProfileForCodec } from "@/lib/shared/dictionaries";
import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movies/movie-form-types";
import {
  createAudioRowKey,
  createSubtitleRowKey,
} from "@/lib/movies/movie-form-types";

export function probeToVideoFields(
  video: ProbeResult["video"],
): Partial<VideoFieldState> {
  if (!video) return {};
  return {
    codec: video.codec ?? "",
    hdr: video.hdr ?? "SDR",
    resolutionLabel: video.resolutionLabel ?? "",
    width: video.width,
    height: video.height,
    fps: video.fps ?? "",
    bitrate: video.bitrate,
  };
}

export function probeToAudioRows(audio: ProbeResult["audio"]): AudioFormRow[] {
  return audio.map((track) => ({
    rowKey: createAudioRowKey(),
    codec: track.codec ?? "",
    profile: validateAudioProfileForCodec(track.codec ?? "", track.profile ?? "None"),
    channelLayout: track.channelLayout ?? "",
    language: track.language ?? "",
    translationType: track.translationType ?? "",
    bitrate: track.bitrate,
    title: track.title ?? "",
    isDefault: track.isDefault,
  }));
}

export function probeToSubtitleRows(
  subtitles: ProbeResult["subtitles"],
): SubtitleFormRow[] {
  return subtitles.map((track) => ({
    rowKey: createSubtitleRowKey(),
    codecLabel: track.codecLabel ?? "SRT",
    language: track.language ?? "",
    forced: track.forced,
    isDefault: track.isDefault,
    title: track.title ?? "",
  }));
}
