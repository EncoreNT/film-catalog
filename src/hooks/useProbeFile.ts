"use client";

import type { ProbeResult } from "@/lib/media/ffprobe";
import {
  probeToAudioRows,
  probeToSubtitleRows,
  probeToVideoFields,
} from "@/lib/media/apply-probe";
import type {
  AudioFormRow,
  SubtitleFormRow,
  VideoFieldState,
} from "@/lib/movies/movie-form-types";
import type { MovieFileMetaPayload } from "@/lib/movies/build-movie-payload";
import {
  parseMoviePath,
  type ParsedName,
} from "@/lib/media/name-parser";

export interface ProbeTrackEditor {
  setDurationSeconds?: (seconds: number) => void;
  setVideo: (updater: (current: VideoFieldState) => VideoFieldState) => void;
  setAudioRowsFromProbe: (rows: AudioFormRow[]) => void;
  setSubtitleRowsFromProbe: (rows: SubtitleFormRow[]) => void;
  setPendingFileMeta?: (meta: MovieFileMetaPayload) => void;
}

export interface ParsedFilePathFieldSetters {
  setTitle?: (value: string) => void;
  setYear?: (value: number | null) => void;
  setReleaseType?: (value: string) => void;
  title?: string;
  year?: number | null;
  releaseType?: string;
}

/** Parse title/year/releaseType from a file path without overwriting user input. */
export function applyParsedFilePathFields(
  filePath: string,
  setters: ParsedFilePathFieldSetters,
): ParsedName {
  const parsed = parseMoviePath(filePath);
  if (setters.setTitle && !setters.title?.trim() && parsed.title) {
    setters.setTitle(parsed.title);
  }
  if (setters.setYear && setters.year == null && parsed.year) {
    setters.setYear(parsed.year);
  }
  if (setters.setReleaseType && !setters.releaseType && parsed.releaseType) {
    setters.setReleaseType(parsed.releaseType);
  }
  return parsed;
}

export async function probeFilePath(
  filePath: string,
  options?: { title?: string },
): Promise<ProbeResult & Partial<MovieFileMetaPayload>> {
  const res = await fetch("/api/movies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: options?.title ?? "probe",
      probeOnly: true,
      filePath: filePath.trim(),
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Не удалось прочитать файл");
  }
  return data;
}

export function applyProbeToTrackEditor(
  data: ProbeResult & Partial<MovieFileMetaPayload>,
  editor: ProbeTrackEditor,
): void {
  if (data.durationSeconds != null) {
    editor.setDurationSeconds?.(data.durationSeconds);
  }
  editor.setVideo((current) => ({ ...current, ...probeToVideoFields(data.video) }));
  if (data.audio.length) {
    editor.setAudioRowsFromProbe(probeToAudioRows(data.audio));
  }
  if (data.subtitles.length) {
    editor.setSubtitleRowsFromProbe(probeToSubtitleRows(data.subtitles));
  }
  if (
    data.fileSize != null &&
    data.fileMtime != null &&
    data.fileHash != null &&
    editor.setPendingFileMeta
  ) {
    editor.setPendingFileMeta({
      fileSize: data.fileSize,
      fileMtime: data.fileMtime,
      fileHash: data.fileHash,
    });
  }
}
