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
  return target === "stereo" ? "2.0" : "до 5.1";
}
