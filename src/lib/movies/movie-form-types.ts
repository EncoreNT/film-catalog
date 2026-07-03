export interface VideoFieldState {
  codec: string;
  hdr: string;
  resolutionLabel: string;
  width: number | null;
  height: number | null;
  fps: string;
  bitrate: number | null;
}

export interface AudioFormRow {
  rowKey: string;
  codec: string;
  profile: string;
  channelLayout: string;
  language: string;
  translationType: string;
  bitrate: number | null;
  title: string;
  isDefault: boolean;
}

export interface SubtitleFormRow {
  rowKey: string;
  codecLabel: string;
  language: string;
  title: string;
  isDefault: boolean;
  forced: boolean;
}

export function createAudioRowKey(prefix = "audio"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createSubtitleRowKey(prefix = "sub"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function emptyAudioFormRow(options?: {
  isDefault?: boolean;
  rowKey?: string;
}): AudioFormRow {
  return {
    rowKey: options?.rowKey ?? createAudioRowKey(),
    codec: "",
    profile: "None",
    channelLayout: "",
    language: "",
    translationType: "",
    bitrate: null,
    title: "",
    isDefault: options?.isDefault ?? false,
  };
}

export function emptySubtitleFormRow(rowKey?: string): SubtitleFormRow {
  return {
    rowKey: rowKey ?? createSubtitleRowKey(),
    codecLabel: "SRT",
    language: "",
    title: "",
    isDefault: false,
    forced: false,
  };
}
