import {
  channelsToLayout,
  detectAudioProfile,
  detectTranslationType,
  normalizeCodec,
} from "@/lib/media/channels";

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
  /** Auto-detected translation type (dub/pro_multi/author/original/…), or null. */
  translationType: string | null;
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

interface FfprobeSideData {
  side_data_type?: string;
  dv_profile?: number;
  dv_level?: number;
  rpu_present_flag?: number;
  el_present_flag?: number;
  bl_present_flag?: number;
  dv_bl_signal_compatibility_id?: number;
}

export interface FfprobeStream {
  index: number;
  codec_type?: string;
  codec_name?: string;
  profile?: string;
  width?: number;
  height?: number;
  channels?: number;
  channel_layout?: string;
  bit_rate?: string;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  pix_fmt?: string;
  color_space?: string;
  color_transfer?: string;
  color_primaries?: string;
  disposition?: {
    default?: number;
    forced?: number;
    attached_pic?: number;
  };
  tags?: Record<string, string>;
  side_data_list?: FfprobeSideData[];
}

export interface FfprobeFormat {
  duration?: string;
}

export interface FfprobeOutput {
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

export function bpsToKbps(bitRate?: string | null): number | null {
  if (!bitRate) return null;
  const bps = parseInt(bitRate, 10);
  if (Number.isNaN(bps)) return null;
  return Math.round(bps / 1000);
}

/**
 * Resolve a stream's bitrate in kbps. MKV files usually omit the
 * stream-level bit_rate and instead report it via the _STATISTICS tags
 * written by mkvmerge, most reliably tags.BPS. Prefer bit_rate when ffprobe
 * provides it, then fall back to the BPS tag.
 */
export function streamBitrateKbps(stream: FfprobeStream): number | null {
  const fromBitRate = bpsToKbps(stream.bit_rate);
  if (fromBitRate != null) return fromBitRate;
  const tags = stream.tags ?? {};
  return bpsToKbps(tags.BPS ?? tags.bps ?? tags["BPS-eng"] ?? null);
}

export function parseDurationSeconds(
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

export function parseTimecodeToSeconds(value: string): number | null {
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

export function parseFps(stream: FfprobeStream): string | null {
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

function findDoviSideData(stream: FfprobeStream): FfprobeSideData | undefined {
  return stream.side_data_list?.find((d) => d.side_data_type?.includes("DOVI"));
}

/** Map ffprobe DOVI configuration record fields to catalog profile codes. */
function mapDoviProfileFromSideData(dovi: FfprobeSideData): string | null {
  const n = dovi.dv_profile;
  if (n == null) return null;

  if (n === 8) {
    if (dovi.dv_bl_signal_compatibility_id === 4) return "P8.4";
    return "P8";
  }
  if (n === 7) {
    if (dovi.el_present_flag && dovi.bl_present_flag) return "P7FEL";
    return "P7";
  }
  if (n === 5) return "P5";
  return `P${n}`;
}

function detectHdrFromDoviSideData(stream: FfprobeStream): string | null {
  const dovi = findDoviSideData(stream);
  if (!dovi) return null;
  const profile = mapDoviProfileFromSideData(dovi);
  return profile ? `DV:${profile}` : "DolbyVision";
}

/** Detect HDR format from a probed video stream (exported for unit tests). */
export function detectVideoHdr(stream: FfprobeStream): string {
  const fromSideData = detectHdrFromDoviSideData(stream);
  if (fromSideData) return fromSideData;

  const colorHaystack = [
    stream.color_transfer,
    stream.color_primaries,
    stream.color_space,
    stream.pix_fmt,
    stream.profile,
    ...Object.values(stream.tags ?? {}),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    colorHaystack.includes("dolby vision") ||
    colorHaystack.includes("dovi") ||
    colorHaystack.includes("dolbyvision")
  ) {
    const profile = detectDvProfile(colorHaystack);
    return profile ? `DV:${profile}` : "DolbyVision";
  }

  if (colorHaystack.includes("hdr10+")) return "HDR10+";

  if (colorHaystack.includes("smpte2084")) return "HDR10";
  if (colorHaystack.includes("hdr10")) return "HDR10";

  if (colorHaystack.includes("hlg") || colorHaystack.includes("arib-std-b67")) {
    return "HLG";
  }

  return "SDR";
}

export function subtitleCodecLabel(codec?: string): string | null {
  if (!codec) return null;
  const key = codec.toLowerCase();
  return SUBTITLE_CODEC_LABELS[key] ?? codec.toUpperCase();
}

export function normalizeLanguage(lang?: string | null): string | null {
  if (!lang) return null;
  const l = lang.toLowerCase().trim();
  const map: Record<string, string> = {
    ru: "rus",
    rus: "rus",
    russian: "rus",
    en: "eng",
    eng: "eng",
    english: "eng",
    uk: "ukr",
    ukr: "ukr",
    ukrainian: "ukr",
    de: "ger",
    ger: "ger",
    deu: "ger",
    german: "ger",
    fr: "fre",
    fre: "fre",
    fra: "fre",
    french: "fre",
    es: "spa",
    spa: "spa",
    spanish: "spa",
    it: "ita",
    ita: "ita",
    italian: "ita",
    pt: "por",
    por: "por",
    portuguese: "por",
    pl: "pol",
    pol: "pol",
    polish: "pol",
    cs: "cze",
    cze: "cze",
    ces: "cze",
    czech: "cze",
    hu: "hun",
    hun: "hun",
    hungarian: "hun",
    da: "dan",
    dan: "dan",
    danish: "dan",
    sv: "swe",
    swe: "swe",
    swedish: "swe",
    no: "nor",
    nor: "nor",
    nb: "nor",
    nn: "nor",
    norwegian: "nor",
    fi: "fin",
    fin: "fin",
    finnish: "fin",
    ja: "jpn",
    jpn: "jpn",
    japanese: "jpn",
    ko: "kor",
    kor: "kor",
    korean: "kor",
    zh: "chi",
    chi: "chi",
    zho: "chi",
    chinese: "chi",
    tr: "tur",
    tur: "tur",
    turkish: "tur",
    kk: "kaz",
    kaz: "kaz",
    kazakh: "kaz",
    th: "tha",
    tha: "tha",
    thai: "tha",
    ar: "ara",
    ara: "ara",
    arabic: "ara",
    und: "und",
  };
  return map[l] ?? l;
}

export function parseAudioStream(s: FfprobeStream): ProbedAudioTrack {
  const codec = normalizeCodec(s.codec_name, s.profile);
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
      s.profile,
    ),
    channels: s.channels ?? null,
    channelLayout,
    bitrate: streamBitrateKbps(s),
    language: normalizeLanguage(tags.language),
    title: tags.title ?? null,
    translationType: detectTranslationType(tags.title),
    isDefault: s.disposition?.default === 1,
  };
}

export function parseSubtitleStream(s: FfprobeStream): ProbedSubtitleTrack {
  const tags = s.tags ?? {};
  const codec = s.codec_name ?? null;
  const title = tags.title ?? null;
  const titleLooksForced = title ? /\bforced\b/i.test(title) : false;
  return {
    streamIndex: s.index,
    codec,
    codecLabel: subtitleCodecLabel(codec ?? undefined),
    language: normalizeLanguage(tags.language),
    title,
    isDefault: s.disposition?.default === 1,
    forced: s.disposition?.forced === 1 || titleLooksForced,
  };
}

export function dedupeDefaultAudioTracks(audio: ProbedAudioTrack[]): void {
  const firstDefaultAudio = audio.findIndex((a) => a.isDefault);
  if (firstDefaultAudio !== -1) {
    for (let i = 0; i < audio.length; i++) {
      if (i !== firstDefaultAudio) audio[i].isDefault = false;
    }
  }
}
