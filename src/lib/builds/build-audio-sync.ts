/** How an audio track is aligned to the video timeline in a build. */
export type BuildAudioSyncMode = "none" | "shift" | "fit";

export function normalizeAudioSyncMode(input: {
  audioSyncMode?: BuildAudioSyncMode;
  offsetMs?: number;
}): BuildAudioSyncMode {
  if (input.audioSyncMode) return input.audioSyncMode;
  if (input.offsetMs != null && input.offsetMs !== 0) return "shift";
  return "none";
}

/** Stretch factor: output_duration = input_duration / tempo, so tempo = audio/video. */
export function computeFitTempoRatio(
  videoDurationSeconds: number,
  audioDurationSeconds: number,
): number | null {
  if (
    !Number.isFinite(videoDurationSeconds) ||
    !Number.isFinite(audioDurationSeconds) ||
    videoDurationSeconds <= 0 ||
    audioDurationSeconds <= 0
  ) {
    return null;
  }
  const ratio = audioDurationSeconds / videoDurationSeconds;
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  return ratio;
}

/** ffmpeg atempo accepts 0.5–2.0 per filter; chain for wider range. */
export function buildAtempoFilterChain(tempo: number): string {
  if (!Number.isFinite(tempo) || tempo <= 0) {
    throw new Error("Некорректный tempo");
  }

  const factors: number[] = [];
  let remaining = tempo;

  while (remaining > 2.0 + 1e-6) {
    factors.push(2);
    remaining /= 2;
  }
  while (remaining < 0.5 - 1e-6) {
    factors.push(0.5);
    remaining /= 0.5;
  }
  factors.push(Math.min(2, Math.max(0.5, remaining)));

  return factors.map((f) => `atempo=${f.toFixed(6).replace(/\.?0+$/, "")}`).join(",");
}

export function formatFitTempoSummary(tempo: number): string {
  const stretch = 1 / tempo;
  const pct = Math.abs((stretch - 1) * 100);
  if (pct < 0.05) return "×1,000 к видео";
  const direction = stretch > 1 ? "растянуть" : "сжать";
  const factor = stretch.toLocaleString("ru-RU", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
  return `×${factor} · ${direction}`;
}

export function audioSyncModeLabel(mode: BuildAudioSyncMode): string {
  switch (mode) {
    case "shift":
      return "Сдвиг";
    case "fit":
      return "Под видео";
    default:
      return "Как есть";
  }
}

export type PrismaAudioSyncMode = "NONE" | "SHIFT" | "FIT";

export function clientSyncModeToPrisma(mode: BuildAudioSyncMode): PrismaAudioSyncMode {
  switch (mode) {
    case "shift":
      return "SHIFT";
    case "fit":
      return "FIT";
    default:
      return "NONE";
  }
}

export function prismaSyncModeToClient(
  mode: PrismaAudioSyncMode | null | undefined,
  offsetMs?: number,
): BuildAudioSyncMode {
  if (mode === "FIT") return "fit";
  if (mode === "SHIFT") return "shift";
  if (offsetMs != null && offsetMs !== 0) return "shift";
  return "none";
}
