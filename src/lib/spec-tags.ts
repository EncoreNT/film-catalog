import type { SpecTagKind } from "@/components/SpecTag";
import type { MovieWithTracks } from "./movie-query";
import {
  dictLabel,
  RELEASE_TYPES,
  AUDIO_CODECS,
  formatHdrLabel,
  parseHdrValue,
} from "./dictionaries";
import { formatBitrateKbps } from "./resolution";

type HeroTagKind =
  | "resolution"
  | "hdr"
  | "audio-3d"
  | "audio"
  | "release"
  | "channel";

interface HeroTag {
  kind: HeroTagKind;
  label: string;
  note?: string;
}

const SHORT_CODEC: Record<string, string> = {
  truehd: "TrueHD",
  eac3: "E-AC3",
  ac3: "AC3",
  "dts-hd": "DTS-HD",
  dts: "DTS",
  aac: "AAC",
  flac: "FLAC",
  opus: "Opus",
  vorbis: "Vorbis",
  pcm: "PCM",
  mp3: "MP3",
};

export function codecShort(codec: string | null | undefined): string | null {
  if (!codec) return null;
  return SHORT_CODEC[codec] ?? codec.toUpperCase();
}

export function codecFull(codec: string | null | undefined): string | null {
  if (!codec) return null;
  return dictLabel(AUDIO_CODECS, codec) ?? codec.toUpperCase();
}

export function audioTrackTag(track: MovieWithTracks["audioTracks"][number]): {
  codec: string | null;
  profile: string | null;
  is3D: boolean;
} {
  const profile = track.profile && track.profile !== "None" ? track.profile : null;
  const is3D =
    profile === "Atmos" || profile === "DTS:X MA";
  return {
    codec: codecShort(track.codec),
    profile,
    is3D,
  };
}

/**
 * Full audio format label: codec + profile combined.
 *   TrueHD + Atmos     → "TrueHD Atmos"
 *   E-AC3 + Atmos      → "E-AC3 Atmos"
 *   DTS-HD + DTS:X MA  → "DTS:X HD MA"
 *   DTS-HD + HD MA     → "DTS-HD MA"
 *   AC3 (no profile)   → "AC3"
 */
export function formatAudioLabel(
  track: MovieWithTracks["audioTracks"][number],
): string | null {
  const codec = codecShort(track.codec);
  const profile = track.profile && track.profile !== "None" ? track.profile : null;

  if (!codec && !profile) return null;

  if (profile === "Atmos") {
    return codec ? `${codec} Atmos` : "Dolby Atmos";
  }
  if (profile === "DTS:X MA") {
    // DTS:X sits on top of DTS-HD MA — surface both, DTS:X first.
    return codec === "DTS-HD" ? "DTS:X HD MA" : "DTS:X";
  }
  if (profile === "HD MA") {
    return codec === "DTS-HD" ? "DTS-HD MA" : profile;
  }
  if (profile) {
    return codec ? `${codec} ${profile}` : profile;
  }
  return codec;
}

function heroTags(movie: MovieWithTracks): HeroTag[] {
  const tags: HeroTag[] = [];
  const v = movie.videoTrack;

  if (v?.resolutionLabel && v.resolutionLabel !== "other") {
    const label = v.resolutionLabel === "4K" ? "4K" : v.resolutionLabel;
    tags.push({
      kind: "resolution",
      label,
      note: v.width && v.height ? `${v.width}×${v.height}` : undefined,
    });
  }

  const hdrLabel = formatHdrLabel(v?.hdr);
  const { base: hdrBase, dvProfile } = parseHdrValue(v?.hdr);
  // HDR10 / HDR10+ are promoted to the premium strip — exclude from secondary.
  // Dolby Vision stays here as a secondary tag, with profile shown when known.
  if (hdrLabel && hdrBase !== "HDR10" && hdrBase !== "HDR10+") {
    if (hdrBase === "DolbyVision") {
      tags.push({
        kind: "hdr",
        label: dvProfile
          ? `Dolby Vision · ${dvProfileLabel(dvProfile)}`
          : "Dolby Vision",
      });
    } else {
      tags.push({ kind: "hdr", label: hdrLabel });
    }
  }

  const release = dictLabel(RELEASE_TYPES, movie.releaseType);
  if (release) {
    tags.push({ kind: "release", label: release });
  }

  const bestAudio = [...movie.audioTracks]
    .map((t) => ({ t, ...audioTrackTag(t) }))
    .sort((a, b) => {
      if (a.is3D && !b.is3D) return -1;
      if (!a.is3D && b.is3D) return 1;
      return 0;
    })[0];

  if (bestAudio) {
    const label = formatAudioLabel(bestAudio.t);
    if (label) {
      tags.push({
        kind: bestAudio.is3D ? "audio-3d" : "audio",
        label,
        note: codecFull(bestAudio.t.codec) ?? undefined,
      });
    }

    if (bestAudio.t.channelLayout && bestAudio.t.channelLayout !== "other") {
      tags.push({ kind: "channel", label: bestAudio.t.channelLayout });
    }
  }

  return tags;
}

/**
 * Secondary hero tags — excludes 4K resolution and 3D audio,
 * which are promoted to the premium badge strip.
 */
export function secondaryTags(movie: MovieWithTracks): HeroTag[] {
  return heroTags(movie).filter(
    (t) => t.kind !== "resolution" && t.kind !== "audio-3d",
  );
}

export function videoBitrateLabel(movie: MovieWithTracks): string | null {
  return formatBitrateKbps(movie.videoTrack?.bitrate ?? null);
}

export function videoResolutionPixels(
  movie: MovieWithTracks,
): string | null {
  const v = movie.videoTrack;
  if (!v?.width || !v?.height) return null;
  return `${v.width}×${v.height}`;
}

export interface PremiumAudio {
  label: string;
  channelLayout: string | null;
}

/**
 * Premium 3D-audio hero badge — shown ONLY for the Russian default track.
 * An English Atmos/DTS:X track is not promoted to the premium strip.
 */
export function premiumAudio(movie: MovieWithTracks): PremiumAudio | null {
  const candidate = movie.audioTracks.find((t) => {
    const profile = t.profile && t.profile !== "None" ? t.profile : null;
    const is3D = profile === "Atmos" || profile === "DTS:X MA";
    return is3D && t.language === "rus" && t.isDefault;
  });

  if (!candidate) return null;

  return {
    label: formatAudioLabel(candidate) ?? "3D Audio",
    channelLayout:
      candidate.channelLayout && candidate.channelLayout !== "other"
        ? candidate.channelLayout
        : null,
  };
}

export function is4K(movie: MovieWithTracks): boolean {
  const v = movie.videoTrack;
  return v?.resolutionLabel === "4K";
}

/**
 * Any HDR — not SDR, not empty. Matches the elite-tier server count, which
 * counts Dolby Vision (any profile) as HDR alongside HDR10 / HDR10+.
 */
export function isAnyHDR(movie: MovieWithTracks): boolean {
  const v = movie.videoTrack;
  if (!v?.hdr) return false;
  return parseHdrValue(v.hdr).base !== "SDR";
}

const DV_PROFILE_SHORT: Record<string, string> = {
  P5: "Profile 5",
  P7: "Profile 7 (MEL)",
  P7FEL: "Profile 7 (FEL)",
  P8: "Profile 8.1",
  "P8.1": "Profile 8.1",
  "P8.4": "Profile 8.4",
};

/** Compact DV profile label for badges/sublabels. */
export function dvProfileLabel(profile: string): string {
  return DV_PROFILE_SHORT[profile] ?? `Profile ${profile.replace(/^P/, "")}`;
}

export interface PremiumHDR {
  label: string;
  sublabel: string;
}

/**
 * Premium HDR hero badge — HDR10 and HDR10+ are promoted to the premium strip
 * (best displayed by the user's TV). Dolby Vision stays a secondary tag.
 */
export function premiumHDR(movie: MovieWithTracks): PremiumHDR | null {
  const v = movie.videoTrack;
  const { base } = parseHdrValue(v?.hdr);
  if (base === "HDR10") {
    return { label: "HDR10", sublabel: "High Dynamic Range" };
  }
  if (base === "HDR10+") {
    return { label: "HDR10+", sublabel: "Dynamic Metadata" };
  }
  return null;
}

const TRANSLATION_SHORT: Record<string, string> = {
  dub: "дубляж",
  pro_multi: "проф. многогол.",
  pro_single: "проф. одногол.",
  pro_two: "проф. двухгол.",
  amateur_multi: "люб. многогол.",
  amateur_single: "люб. одногол.",
  author: "авторский",
  original: "оригинал",
  unknown: "—",
};

export function translationShort(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return TRANSLATION_SHORT[value] ?? value;
}

export interface CatalogCardTag {
  kind: SpecTagKind;
  label: string;
  note?: string;
}

const VIDEO_CODEC_SHORT: Record<string, string> = {
  hevc: "HEVC",
  h264: "H.264",
  av1: "AV1",
  vp9: "VP9",
  mpeg2: "MPEG-2",
};

function videoCodecLabel(codec: string | null | undefined): string | null {
  if (!codec) return null;
  return VIDEO_CODEC_SHORT[codec] ?? codec.toUpperCase();
}

/**
 * Structured footer tags for catalog cards — no bitrate.
 * Skips specs already shown in premium badges (4K, HDR10/HDR10+, rus. Atmos).
 */
export function catalogCardTags(movie: MovieWithTracks): CatalogCardTag[] {
  const tags: CatalogCardTag[] = [];
  const v = movie.videoTrack;
  const show4KPremium = is4K(movie);
  const hdrPremium = premiumHDR(movie);
  const audioPremium = premiumAudio(movie);

  const release = dictLabel(RELEASE_TYPES, movie.releaseType);
  if (release) {
    tags.push({ kind: "release", label: release });
  }

  if (
    !show4KPremium &&
    v?.resolutionLabel &&
    v.resolutionLabel !== "other"
  ) {
    tags.push({
      kind: "resolution",
      label: v.resolutionLabel === "4K" ? "4K" : v.resolutionLabel,
      note:
        v.width && v.height ? `${v.width}×${v.height}` : undefined,
    });
  }

  if (!hdrPremium) {
    const hdrLabel = formatHdrLabel(v?.hdr);
    const { base, dvProfile } = parseHdrValue(v?.hdr);
    if (hdrLabel && base !== "SDR") {
      if (base === "DolbyVision") {
        tags.push({
          kind: "hdr",
          label: dvProfile
            ? `DV · ${dvProfileLabel(dvProfile)}`
            : "Dolby Vision",
        });
      } else {
        tags.push({ kind: "hdr", label: hdrLabel });
      }
    }
  }

  const codec = videoCodecLabel(v?.codec);
  if (codec) {
    tags.push({ kind: "codec", label: codec });
  }

  const sortedAudio = [...movie.audioTracks].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });
  const mainTrack = sortedAudio[0];
  const audioLabel = mainTrack ? formatAudioLabel(mainTrack) : null;
  const isPremiumTrack =
    audioPremium &&
    mainTrack?.isDefault &&
    mainTrack.language === "rus" &&
    (mainTrack.profile === "Atmos" || mainTrack.profile === "DTS:X MA");

  if (audioLabel && !isPremiumTrack) {
    tags.push({
      kind:
        mainTrack?.profile === "Atmos" ||
        mainTrack?.profile === "DTS:X MA"
          ? "audio-3d"
          : "audio",
      label: audioLabel,
    });
  }

  const channels =
    mainTrack?.channelLayout && mainTrack.channelLayout !== "other"
      ? mainTrack.channelLayout
      : null;
  if (channels) {
    tags.push({ kind: "channel", label: channels });
  }

  return tags;
}
