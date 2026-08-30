import { channelsToLayout, detectAudioProfile, normalizeCodec } from "@/lib/media/channels";
import { formatAudioLabel } from "@/lib/media/audio-labels";
import { dictLabel, LANGUAGES } from "@/lib/shared/dictionaries";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

export interface BdmvTrackLabelInput {
  type: "video" | "audio" | "subtitle";
  codec: string | null;
  language: string | null;
  name: string | null;
  channels: number | null;
}

function languageLabel(code: string | null): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (!normalized || normalized === "und") return null;
  return dictLabel(LANGUAGES, normalized);
}

function namedTitle(name: string | null, language: string | null): string | null {
  const trimmed = name?.trim() || null;
  if (!trimmed) return null;
  const lang = language?.trim().toLowerCase();
  if (lang && trimmed.toLowerCase() === lang) return null;
  return trimmed;
}

function videoCodecLabel(codec: string | null): string | null {
  if (!codec) return null;
  const c = codec.toUpperCase();
  if (c.includes("HEVC") || c.includes("MPEGH") || c.includes("H.265")) return "HEVC";
  if (c.includes("AVC") || c.includes("H.264") || c.includes("MPEG4/ISO/AVC")) {
    return "AVC";
  }
  if (c.includes("VC-1") || c.includes("WVC1")) return "VC-1";
  if (c.includes("MPEG2") || c.includes("MPEG-2")) return "MPEG-2";
  return null;
}

function subtitleCodecLabel(codec: string | null): string | null {
  if (!codec) return null;
  const c = codec.toUpperCase();
  if (c.includes("PGS") || c.includes("HDMV")) return "PGS";
  if (c.includes("VOBSUB") || c.includes("VOB")) return "VobSub";
  if (c.includes("UTF8") || c.includes("SRT")) return "SRT";
  if (c.includes("ASS") || c.includes("SSA")) return "ASS";
  return null;
}

function audioFormatLabel(track: BdmvTrackLabelInput): string | null {
  const codec = normalizeCodec(track.codec);
  const layout = channelsToLayout(track.channels);
  const profile = detectAudioProfile(
    codec,
    layout,
    [track.name, track.codec?.replace(/master audio/i, "HD MA")].filter(Boolean).join(" "),
  );
  return formatAudioLabel({
    codec,
    profile,
  } as ReleaseWithTracks["audioTracks"][number]);
}

function joinParts(parts: Array<string | null | undefined>): string | null {
  const cleaned = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  return cleaned.length > 0 ? cleaned.join(" · ") : null;
}

/** Default MKV title from mkvmerge identify. BD rarely has track_name; codec + layout still help. */
export function bdmvInspectTrackLabel(track: BdmvTrackLabelInput): string | null {
  const title = namedTitle(track.name, track.language);
  const language = languageLabel(track.language);

  if (track.type === "audio") {
    const layout = channelsToLayout(track.channels);
    const format = audioFormatLabel(track);
    return joinParts([title, language, format, layout]);
  }

  if (track.type === "video") {
    return joinParts([title, videoCodecLabel(track.codec)]) ?? title;
  }

  return joinParts([title, language, subtitleCodecLabel(track.codec)]);
}
