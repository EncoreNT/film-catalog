import { execa } from "execa";
import {
  channelsToLayout,
  detectAudioProfile,
  normalizeCodec,
} from "./channels";
import { getResolutionLabel } from "./resolution";

export interface ProbedVideoTrack {
  streamIndex: number;
  width: number | null;
  height: number | null;
  resolutionLabel: string;
  codec: string | null;
  hdr: string | null;
  fps: string | null;
  bitrate: number | null;
}

export interface ProbedAudioTrack {
  streamIndex: number;
  codec: string | null;
  profile: string | null;
  channels: number | null;
  channelLayout: string | null;
  bitrate: number | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
}

export interface ProbedSubtitleTrack {
  streamIndex: number;
  codec: string | null;
  codecLabel: string | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  forced: boolean;
}

export interface ProbeResult {
  durationSeconds: number | null;
  video: ProbedVideoTrack | null;
  audio: ProbedAudioTrack[];
  subtitles: ProbedSubtitleTrack[];
}

interface FfprobeStream {
  index: number;
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  channels?: number;
  channel_layout?: string;
  bit_rate?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  disposition?: { default?: number; forced?: number };
  tags?: Record<string, string>;
}

interface FfprobeFormat {
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

const SUBTITLE_CODEC_LABELS: Record<string, string> = {
  subrip: "SRT",
  srt: "SRT",
  ass: "ASS",
  ssa: "SSA",
  webvtt: "WebVTT",
  mov_text: "MP4 Text",
  hdmv_pgs_subtitle: "PGS",
  dvd_subtitle: "VobSub",
  hdmv_text_subtitle: "HDMV Text",
};

function bpsToKbps(bitRate?: string | null): number | null {
  if (!bitRate) return null;
  const bps = parseInt(bitRate, 10);
  if (Number.isNaN(bps)) return null;
  return Math.round(bps / 1000);
}

function parseDurationSeconds(
  format?: FfprobeFormat | null,
  streams: FfprobeStream[] = [],
): number | null {
  const raw = format?.duration;
  if (raw) {
    const sec = parseFloat(raw);
    if (!Number.isNaN(sec) && sec > 0) return Math.round(sec);
  }
  const fromStream = streams
    .map((s) => s.tags?.DURATION ?? s.tags?.duration_und ?? null)
    .filter(Boolean)
    .map((d) => parseTimecodeToSeconds(d as string))
    .filter((v): v is number => v != null);
  return fromStream.length ? Math.max(...fromStream) : null;
}

function parseTimecodeToSeconds(value: string): number | null {
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const sec = parseFloat(trimmed);
    return Number.isNaN(sec) ? null : sec;
  }
  const m = trimmed.match(
    /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:\.(\d+))?$/,
  );
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const sec = parseInt(m[3], 10);
  const frac = m[4] ? parseFloat(`0.${m[4]}`) : 0;
  return h * 3600 + min * 60 + sec + frac;
}

function parseFps(stream: FfprobeStream): string | null {
  const rate = stream.r_frame_rate || stream.avg_frame_rate;
  if (!rate || rate === "0/0") return null;
  const [num, den] = rate.split("/").map(Number);
  if (!den) return null;
  return String(Math.round((num / den) * 100) / 100);
}

function detectDvProfile(haystack: string): string | null {
  const m = haystack.match(/\bp(?:rofile)?\.?\s*([0-9]+(?:\.[0-9]+)?)\b/);
  if (m) {
    const raw = m[1];
    // Normalize 8.x family; keep P7 FEL if explicitly FEL
    if (raw === "7" && /fel/.test(haystack)) return "P7FEL";
    if (raw.startsWith("8.4")) return "P8.4";
    if (raw.startsWith("8.1")) return "P8.1";
    if (raw.startsWith("8")) return "P8";
    if (raw === "7") return "P7";
    if (raw === "5") return "P5";
    return `P${raw}`;
  }
  return null;
}

function detectHdr(stream: FfprobeStream, allStreams: FfprobeStream[]): string {
  const tags = stream.tags ?? {};
  const tagHaystack = Object.values(tags).join(" ").toLowerCase();
  if (tagHaystack.includes("dolby vision") || tagHaystack.includes("dovi")) {
    const profile = detectDvProfile(tagHaystack);
    return profile ? `DV:${profile}` : "DolbyVision";
  }
  if (tagHaystack.includes("hdr10+")) return "HDR10+";
  if (tagHaystack.includes("hdr10") || tagHaystack.includes("smpte2084")) {
    return "HDR10";
  }
  if (tagHaystack.includes("hlg") || tagHaystack.includes("arib-std-b67")) {
    return "HLG";
  }

  const sideData = (stream as { side_data_list?: { side_data_type?: string }[] })
    .side_data_list;
  if (sideData?.some((d) => d.side_data_type?.includes("DOVI"))) {
    return "DolbyVision";
  }

  const hasHdrMaster = allStreams.some((s) =>
    (s.codec_name ?? "").toLowerCase().includes("hdr"),
  );
  if (hasHdrMaster) return "HDR10";

  return "SDR";
}

function subtitleCodecLabel(codec?: string): string | null {
  if (!codec) return null;
  const key = codec.toLowerCase();
  return SUBTITLE_CODEC_LABELS[key] ?? codec.toUpperCase();
}

function normalizeLanguage(lang?: string | null): string | null {
  if (!lang) return null;
  const l = lang.toLowerCase().trim();
  const map: Record<string, string> = {
    ru: "rus",
    russian: "rus",
    en: "eng",
    english: "eng",
    uk: "ukr",
    ukrainian: "ukr",
    de: "ger",
    german: "ger",
    fr: "fre",
    french: "fre",
    es: "spa",
    spanish: "spa",
    it: "ita",
    italian: "ita",
    ja: "jpn",
    japanese: "jpn",
    ko: "kor",
    korean: "kor",
    zh: "chi",
    chinese: "chi",
  };
  return map[l] ?? l;
}

export async function probeMediaFile(filePath: string): Promise<ProbeResult> {
  const { stdout } = await execa("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_streams",
    "-show_format",
    filePath,
  ]);

  const data = JSON.parse(stdout) as FfprobeOutput;
  const streams = data.streams ?? [];

  const videoStream = streams.find((s) => s.codec_type === "video");
  const audioStreams = streams.filter((s) => s.codec_type === "audio");
  const subtitleStreams = streams.filter((s) => s.codec_type === "subtitle");

  let video: ProbedVideoTrack | null = null;
  if (videoStream) {
    const width = videoStream.width ?? null;
    const height = videoStream.height ?? null;
    video = {
      streamIndex: videoStream.index,
      width,
      height,
      resolutionLabel: getResolutionLabel(width, height),
      codec: videoStream.codec_name ?? null,
      hdr: detectHdr(videoStream, streams),
      fps: parseFps(videoStream),
      bitrate: bpsToKbps(videoStream.bit_rate),
    };
  }

  const audio: ProbedAudioTrack[] = audioStreams.map((s) => {
    const codec = normalizeCodec(s.codec_name);
    const channelLayout = channelsToLayout(s.channels, s.channel_layout);
    const tags = s.tags ?? {};
    return {
      streamIndex: s.index,
      codec,
      profile: detectAudioProfile(
        codec,
        channelLayout,
        tags.title,
        tags,
      ),
      channels: s.channels ?? null,
      channelLayout,
      bitrate: bpsToKbps(s.bit_rate),
      language: normalizeLanguage(tags.language),
      title: tags.title ?? null,
      isDefault: s.disposition?.default === 1,
    };
  });

  const subtitles: ProbedSubtitleTrack[] = subtitleStreams.map((s) => {
    const tags = s.tags ?? {};
    const codec = s.codec_name ?? null;
    return {
      streamIndex: s.index,
      codec,
      codecLabel: subtitleCodecLabel(codec ?? undefined),
      language: normalizeLanguage(tags.language),
      title: tags.title ?? null,
      isDefault: s.disposition?.default === 1,
      forced: s.disposition?.forced === 1,
    };
  });

  return {
    durationSeconds: parseDurationSeconds(data.format, streams),
    video,
    audio,
    subtitles,
  };
}
