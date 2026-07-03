import type { ReleaseWithTracks } from "@/lib/movies/movie-query";
import {
  dictLabel,
  RELEASE_TYPES,
  AUDIO_CODECS,
  displayMovieVersionLabel,
  formatHdrLabel,
  parseHdrValue,
} from "@/lib/shared/dictionaries";
import { formatBitrateKbps } from "@/lib/shared/resolution";

export type SpecTagKind =
  | "resolution"
  | "hdr"
  | "audio-3d"
  | "audio"
  | "release"
  | "version"
  | "channel"
  | "codec";

type HeroTagKind =
  | "resolution"
  | "hdr"
  | "audio-3d"
  | "audio"
  | "release"
  | "version"
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

export function audioTrackTag(track: ReleaseWithTracks["audioTracks"][number]): {
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

function releaseMetaTags(release: ReleaseWithTracks): HeroTag[] {
  const tags: HeroTag[] = [];
  const releaseLabel = dictLabel(RELEASE_TYPES, release.releaseType);
  if (releaseLabel) {
    tags.push({ kind: "release", label: releaseLabel });
  }
  const version = displayMovieVersionLabel(release.version);
  if (version) {
    tags.push({ kind: "version", label: version });
  }
  return tags;
}

function resolutionTag(
  v: ReleaseWithTracks["videoTrack"],
  options?: { omit4K?: boolean },
): HeroTag | null {
  if (options?.omit4K && v?.resolutionLabel === "4K") return null;
  if (!v?.resolutionLabel || v.resolutionLabel === "other") return null;
  return {
    kind: "resolution",
    label: v.resolutionLabel === "4K" ? "4K" : v.resolutionLabel,
    note: v.width && v.height ? `${v.width}×${v.height}` : undefined,
  };
}

function hdrCatalogTag(release: ReleaseWithTracks): CatalogCardTag | null {
  const v = release.videoTrack;
  const hdrLabel = formatHdrLabel(v?.hdr);
  const { base, dvProfile } = parseHdrValue(v?.hdr);
  if (!hdrLabel || base === "SDR") return null;

  const hdrPremium = premiumHDR(release);
  if (hdrPremium) {
    return {
      kind: "hdr",
      label: hdrPremium.label === "HDR10" ? "HDR" : hdrPremium.label,
    };
  }
  if (base === "DolbyVision") {
    return {
      kind: "hdr",
      label: dvProfile
        ? `DV · ${dvProfileLabel(dvProfile)}`
        : "Dolby Vision",
    };
  }
  return { kind: "hdr", label: hdrLabel };
}

function heroTags(release: ReleaseWithTracks): HeroTag[] {
  const tags: HeroTag[] = [...releaseMetaTags(release)];
  const v = release.videoTrack;

  const resTag = resolutionTag(v);
  if (resTag) tags.push(resTag);

  const hdrLabel = formatHdrLabel(v?.hdr);
  const { base: hdrBase, dvProfile } = parseHdrValue(v?.hdr);
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

  const bestAudio = [...release.audioTracks]
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
      tags.push({
        kind: "channel",
        label: `звук ${bestAudio.t.channelLayout}`,
      });
    }
  }

  return tags;
}

export function secondaryTags(release: ReleaseWithTracks): HeroTag[] {
  return heroTags(release).filter(
    (t) =>
      t.kind !== "resolution" &&
      t.kind !== "audio-3d" &&
      t.kind !== "hdr",
  );
}

export function videoBitrateLabel(release: ReleaseWithTracks): string | null {
  return formatBitrateKbps(release.videoTrack?.bitrate ?? null);
}

export function videoResolutionPixels(
  release: ReleaseWithTracks,
): string | null {
  const v = release.videoTrack;
  if (!v?.width || !v?.height) return null;
  return `${v.width}×${v.height}`;
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
  const candidate = release.audioTracks.find((t) => {
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

export function is4K(release: ReleaseWithTracks): boolean {
  return release.videoTrack?.resolutionLabel === "4K";
}

export function isAnyHDR(release: ReleaseWithTracks): boolean {
  const v = release.videoTrack;
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

export function dvProfileLabel(profile: string): string {
  return DV_PROFILE_SHORT[profile] ?? `Profile ${profile.replace(/^P/, "")}`;
}

export interface PremiumHDR {
  label: string;
  sublabel: string;
}

export function premiumHDR(release: ReleaseWithTracks): PremiumHDR | null {
  const v = release.videoTrack;
  const { base } = parseHdrValue(v?.hdr);
  if (base === "HDR10") {
    return { label: "HDR10", sublabel: "High Dynamic Range" };
  }
  if (base === "HDR10+") {
    return { label: "HDR10+", sublabel: "Dynamic Metadata" };
  }
  return null;
}

export interface PremiumHdrView {
  label: string;
  isDolbyVision: boolean;
}

/**
 * Единая HDR-сводка для spec-ribbon: покрывает Dolby Vision (с профилем),
 * HDR10 и HDR10+. В отличие от {@link premiumHDR}, не дробит HDR по разным
 * слоям отображения — ribbon владеет всем HDR, secondaryTags его не дублируют.
 */
export function premiumHdrView(release: ReleaseWithTracks): PremiumHdrView | null {
  const v = release.videoTrack;
  if (!v?.hdr) return null;
  const { base, dvProfile } = parseHdrValue(v.hdr);
  if (base === "SDR") return null;
  if (base === "HDR10") return { label: "HDR10", isDolbyVision: false };
  if (base === "HDR10+") return { label: "HDR10+", isDolbyVision: false };
  const formatted = formatHdrLabel(v.hdr);
  if (!formatted) return null;
  const label = formatted.startsWith("Dolby Vision") && dvProfile
    ? `Dolby Vision · ${dvProfileLabel(dvProfile)}`
    : formatted;
  return { label, isDolbyVision: label.startsWith("Dolby Vision") };
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

const PROMINENT_CATALOG_TAG_KINDS = new Set<SpecTagKind>([
  "resolution",
  "hdr",
  "audio-3d",
]);

function sortCatalogCardTags(tags: CatalogCardTag[]): CatalogCardTag[] {
  const prominent: CatalogCardTag[] = [];
  const regular: CatalogCardTag[] = [];
  for (const tag of tags) {
    if (PROMINENT_CATALOG_TAG_KINDS.has(tag.kind)) {
      prominent.push(tag);
    } else {
      regular.push(tag);
    }
  }
  return [...prominent, ...regular];
}

export function catalogCardTags(release: ReleaseWithTracks): CatalogCardTag[] {
  const tags: CatalogCardTag[] = [...releaseMetaTags(release)];
  const v = release.videoTrack;
  const show4KPremium = is4K(release);
  const audioPremium = premiumAudio(release);

  const resTag = resolutionTag(v, { omit4K: show4KPremium });
  if (resTag) tags.push(resTag);

  const hdrTag = hdrCatalogTag(release);
  if (hdrTag) tags.push(hdrTag);

  const codec = videoCodecLabel(v?.codec);
  if (codec) {
    tags.push({ kind: "codec", label: codec });
  }

  const mainTrack = mainAudioTrack(release);
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

  return sortCatalogCardTags(tags);
}

/** Human-readable tab label for a release (e.g. "BDRemux · 4K"). */
export function releaseTabLabel(release: ReleaseWithTracks): string {
  const parts: string[] = [];
  if (release.releaseType) {
    parts.push(dictLabel(RELEASE_TYPES, release.releaseType) ?? release.releaseType);
  }
  const resolution = release.videoTrack?.resolutionLabel;
  if (resolution && resolution !== "other") {
    parts.push(resolution === "4K" ? "4K" : resolution);
  }
  return parts.length > 0 ? parts.join(" · ") : `релиз #${release.id}`;
}
