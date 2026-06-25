import type { MovieWithTracks } from "./movie-query";
import {
  dictLabel,
  RELEASE_TYPES,
  AUDIO_CODECS,
  formatHdrLabel,
} from "./dictionaries";
import { formatBitrateKbps } from "./resolution";

export type HeroTagKind =
  | "resolution"
  | "hdr"
  | "audio-3d"
  | "audio"
  | "release"
  | "channel";

export interface HeroTag {
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

export function heroTags(movie: MovieWithTracks): HeroTag[] {
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
  if (hdrLabel) {
    tags.push({ kind: "hdr", label: hdrLabel });
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
    if (bestAudio.is3D) {
      const name =
        bestAudio.profile === "Atmos"
          ? "Dolby Atmos"
          : bestAudio.profile === "DTS:X MA"
            ? "DTS:X"
            : bestAudio.profile;
      tags.push({
        kind: "audio-3d",
        label: name ?? "3D Audio",
        note: codecFull(bestAudio.t.codec) ?? undefined,
      });
    } else if (bestAudio.codec) {
      tags.push({
        kind: "audio",
        label: bestAudio.codec,
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

  const profile = candidate.profile && candidate.profile !== "None" ? candidate.profile : null;
  const label =
    profile === "Atmos"
      ? "Dolby Atmos"
      : profile === "DTS:X MA"
        ? "DTS:X"
        : profile ?? "3D Audio";

  return {
    label,
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
