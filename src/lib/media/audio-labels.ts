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

type AudioTrack = ReleaseWithTracks["audioTracks"][number];

function trackChannelCount(track: AudioTrack): number {
  if (track.channels != null) return track.channels;
  if (track.channelLayout && track.channelLayout !== "other") {
    const [wide, high] = track.channelLayout.split(".");
    const w = Number(wide);
    const h = Number(high);
    if (Number.isFinite(w) && Number.isFinite(h)) return w + h;
  }
  return 0;
}

/** Лучшая дорожка среди кандидатов: object-sound → каналы → isDefault → streamIndex. */
function pickBestAudioTrack(tracks: AudioTrack[]): AudioTrack | null {
  if (tracks.length === 0) return null;
  const sorted = [...tracks].sort((a, b) => {
    const aSpatial = isSpatialAudioProfile(a.profile) ? 1 : 0;
    const bSpatial = isSpatialAudioProfile(b.profile) ? 1 : 0;
    if (bSpatial !== aSpatial) return bSpatial - aSpatial;
    const channelDiff = trackChannelCount(b) - trackChannelCount(a);
    if (channelDiff !== 0) return channelDiff;
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.streamIndex - b.streamIndex;
  });
  return sorted[0];
}

/**
 * «Основная» аудиодорожка релиза для бейджей, карточек и gold-тира.
 *
 * Приоритет: (1) главная дорожка (`isDefault`), (2) русский дубляж,
 * (3) русский проф. многоголосный, (4) лучшая по качеству среди всех.
 */
export function mainAudioTrack(
  release: ReleaseWithTracks,
): AudioTrack | null {
  const tracks = release.audioTracks;
  if (tracks.length === 0) return null;

  const defaultTrack = tracks.find((t) => t.isDefault);
  if (defaultTrack) return defaultTrack;

  const dub = pickBestAudioTrack(
    tracks.filter((t) => t.language === "rus" && t.translationType === "dub"),
  );
  if (dub) return dub;

  const proMulti = pickBestAudioTrack(
    tracks.filter(
      (t) => t.language === "rus" && t.translationType === "pro_multi",
    ),
  );
  if (proMulti) return proMulti;

  return pickBestAudioTrack(tracks);
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
  amateur_two: "люб. двухгол.",
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
