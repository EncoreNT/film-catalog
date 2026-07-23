import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  isPremiumRussianAtmosTrack,
  isSpatialAudioProfile,
  nullifyAudioProfile,
} from "@/lib/media/quality-predicates";
import { dictLabel, AUDIO_CODECS } from "@/lib/shared/dictionaries";

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

export function audioTrackTag(track: ReleaseWithTracks["audioTracks"][number]): {
  codec: string | null;
  profile: string | null;
  is3D: boolean;
} {
  const profile = nullifyAudioProfile(track.profile);
  return {
    codec: codecShort(track.codec),
    profile,
    is3D: isSpatialAudioProfile(track.profile),
  };
}

export function formatAudioLabel(
  track: ReleaseWithTracks["audioTracks"][number],
): string | null {
  const codec = codecShort(track.codec);
  const profile = track.profile && track.profile !== "None" ? track.profile : null;

  if (!codec && !profile) return null;

  if (profile === "Atmos") {
    return codec ? `${codec} Atmos` : "Dolby Atmos";
  }
  if (profile === "DTS:X MA") {
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

export interface PremiumAudio {
  label: string;
  channelLayout: string | null;
}

export function mainAudioTrack(
  release: ReleaseWithTracks,
): ReleaseWithTracks["audioTracks"][number] | null {
  if (release.audioTracks.length === 0) return null;
  const sorted = [...release.audioTracks].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return 0;
  });
  return sorted[0];
}

export function premiumAudio(release: ReleaseWithTracks): PremiumAudio | null {
  const candidate = release.audioTracks.find(isPremiumRussianAtmosTrack);

  if (!candidate) return null;

  return {
    label: formatAudioLabel(candidate) ?? "3D Audio",
    channelLayout:
      candidate.channelLayout && candidate.channelLayout !== "other"
        ? candidate.channelLayout
        : null,
  };
}

const TRANSLATION_SHORT: Record<string, string> = {
  dub: "дубляж",
  pro_multi: "проф. многогол.",
  pro_single: "проф. одногол.",
  pro_two: "проф. двухгол.",
  amateur_multi: "люб. многогол.",
  amateur_single: "люб. одногол.",
  author: "авторский",
  commentary: "комментарии",
  original: "оригинал",
  unknown: "—",
};

export function translationShort(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return TRANSLATION_SHORT[value] ?? value;
}
