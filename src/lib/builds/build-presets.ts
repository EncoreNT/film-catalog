export const TRANSCODE_CODECS = ["ac3", "eac3"] as const;
export type TranscodeCodec = (typeof TRANSCODE_CODECS)[number];

export const CHANNEL_TARGETS = ["stereo", "up_to_51"] as const;
export type ChannelTarget = (typeof CHANNEL_TARGETS)[number];

export const AC3_BITRATES = [128, 192, 256, 320, 384, 448, 512, 640] as const;
export const EAC3_BITRATES = [128, 192, 256, 320, 384, 448, 512, 640, 768, 1024] as const;

export const DURATION_WARNING_THRESHOLD_SECONDS = 1;
export const MAX_OFFSET_MS = 60_000;
export const MIN_OFFSET_MS = -60_000;

export const BUILD_HEARTBEAT_INTERVAL_MS = 5_000;
export const BUILD_STALE_LEASE_MS = 30_000;
/** Max concurrent build jobs that include ffmpeg audio transcode. Copy-only builds are unlimited. */
export const BUILD_TRANSCODE_MAX_CONCURRENCY = 2;

export function bitratePresetsForCodec(codec: TranscodeCodec): readonly number[] {
  return codec === "ac3" ? AC3_BITRATES : EAC3_BITRATES;
}

export function isValidBitrate(codec: TranscodeCodec, bitrate: number): boolean {
  return bitratePresetsForCodec(codec).includes(bitrate);
}

export function channelTargetToLayout(target: ChannelTarget): string {
  return target === "stereo" ? "stereo" : "5.1";
}

export function channelTargetLabel(target: ChannelTarget): string {
  return target === "stereo" ? "2.0" : "5.1";
}

/** Эффективное число каналов: `channels` или bed из layout (7.1 → 8). */
export function effectiveChannelCount(
  channels: number | null | undefined,
  channelLayout: string | null | undefined,
): number {
  if (channels != null && channels > 0) return channels;
  if (channelLayout && channelLayout !== "other") {
    const [wide, high] = channelLayout.split(".");
    const w = Number(wide);
    const h = Number(high);
    if (Number.isFinite(w) && Number.isFinite(h)) return w + h;
  }
  return 0;
}

/** Кодеки семейства AC-3/E-AC3 — перекодировать в E-AC3 бессмысленно. */
export const AC3_FAMILY_CODECS = new Set(["ac3", "eac3"]);

/** Кодеки выше AC-3/E-AC3 (lossless и высокобитрейт- surround) — перекодирование в E-AC3 имеет смысл. */
const HIGHER_THAN_AC3_PREFIXES = [
  "dts",
  "truehd",
  "mlp",
  "flac",
  "alac",
  "pcm",
  "wavpack",
  "s302m",
];

export function isAc3FamilyCodec(codec: string | null | undefined): boolean {
  if (!codec) return false;
  return AC3_FAMILY_CODECS.has(codec.toLowerCase());
}

export function isHigherThanAc3Codec(codec: string | null | undefined): boolean {
  if (!codec) return false;
  const c = codec.toLowerCase();
  return HIGHER_THAN_AC3_PREFIXES.some((p) => c === p || c.startsWith(p));
}

/** Идеальный битрейт по умолчанию для кодека (без учёта источника). */
export function idealTranscodeBitrate(codec: TranscodeCodec): number {
  return codec === "ac3" ? 448 : 768;
}

/** Битрейт перекодирования по умолчанию: идеальный, но не выше битрейта источника
 *  (без апскейла), округлённый вниз до ближайшего валидного пресета. */
export function defaultTranscodeBitrate(
  codec: TranscodeCodec,
  sourceBitrateKbps: number | null | undefined,
): number {
  const presets = bitratePresetsForCodec(codec);
  const ideal = idealTranscodeBitrate(codec);
  if (sourceBitrateKbps == null || sourceBitrateKbps <= 0) return ideal;
  const cap = Math.min(ideal, sourceBitrateKbps);
  let chosen = presets[0]!;
  for (const b of presets) {
    if (b <= cap) chosen = b;
  }
  return chosen;
}

/** Целевая конфигурация каналов по умолчанию: 2.0 для моно/стерео, 5.1 для surround.
 *  Учитывает channelLayout, если поле channels пустое (частый случай для TrueHD). */
export function defaultChannelTarget(
  channels: number | null | undefined,
  channelLayout?: string | null,
): ChannelTarget {
  const effective = effectiveChannelCount(channels, channelLayout ?? null);
  return effective <= 2 ? "stereo" : "up_to_51";
}
