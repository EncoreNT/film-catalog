import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  dictLabel,
  RELEASE_TYPES,
  displayMovieVersionLabel,
  formatHdrLabel,
  parseHdrValue,
} from "@/lib/shared/dictionaries";
import { formatBitrateKbps } from "@/lib/shared/resolution";
import { normalizeAudioProfile } from "@/lib/media/quality-predicates";
import {
  audioTrackTag,
  codecFull,
  formatAudioLabel,
  mainAudioTrack,
} from "@/lib/media/audio-labels";

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

export interface CatalogCardTag {
  kind: SpecTagKind;
  label: string;
  note?: string;
}

export function releaseMetaTags(release: ReleaseWithTracks): HeroTag[] {
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

export function resolutionTag(
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

export function hdrCatalogTag(release: ReleaseWithTracks): CatalogCardTag | null {
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

/**
 * Каталожные тиры релиза (логика, не цвет): Ruby — 4K + любой HDR +
 * Atmos ≥ 7.1 на лучшей русской дубляжной дорожке; Gold — 4K + любой HDR +
 * surround ≥ 5.1 (6+ каналов) на основном треке. Ruby имеет приоритет над Gold.
 */
export type ReleaseTier = "ruby" | "gold" | null;

/** Ribbon label for tier cards (top badge). */
export function catalogTierRibbon(tier: ReleaseTier): string | null {
  if (tier === "ruby") return "4K | HDR | ATMOS";
  if (tier === "gold") return "4K | HDR";
  return null;
}

/** Эффективное число каналов трека: channels, иначе bed-ранг из layout. */
export function audioTrackChannelCount(
  track: ReleaseWithTracks["audioTracks"][number],
): number {
  if (track.channels != null) return track.channels;
  if (track.channelLayout && track.channelLayout !== "other") {
    const [wide, high] = track.channelLayout.split(".");
    const w = Number(wide);
    const h = Number(high);
    if (Number.isFinite(w) && Number.isFinite(h)) return w + h;
  }
  return 0;
}

/**
 * Лучшая русская дубляжная дорожка релиза — для ruby-тира и ribbon ATMOS.
 * Среди `language=rus` + `translationType=dub`: приоритет Atmos, затем
 * больше каналов, затем isDefault.
 */
export function bestRussianDubTrack(
  release: ReleaseWithTracks,
): ReleaseWithTracks["audioTracks"][number] | null {
  const dubTracks = release.audioTracks.filter(
    (t) => t.language === "rus" && t.translationType === "dub",
  );
  if (dubTracks.length === 0) return null;

  const sorted = [...dubTracks].sort((a, b) => {
    const aAtmos = normalizeAudioProfile(a.profile) === "Atmos" ? 1 : 0;
    const bAtmos = normalizeAudioProfile(b.profile) === "Atmos" ? 1 : 0;
    if (bAtmos !== aAtmos) return bAtmos - aAtmos;
    const channelDiff = audioTrackChannelCount(b) - audioTrackChannelCount(a);
    if (channelDiff !== 0) return channelDiff;
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.streamIndex - b.streamIndex;
  });
  return sorted[0];
}

/**
 * Каталожные тиеры релиза (логика, не цвет).
 *
 * **Ruby** — 4K + любой HDR + Atmos ≥ 7.1 на {@link bestRussianDubTrack}
 * (только дубляж). Atmos-оригинал при русской AC3-дубляже не даёт ruby.
 *
 * **Gold** — 4K + любой HDR + surround ≥ 5.1 на {@link mainAudioTrack}
 * (AC3, DTS, TrueHD и др. — главное 6+ каналов на основной дорожке).
 */
export function releaseTier(release: ReleaseWithTracks): ReleaseTier {
  if (!is4K(release) || !isAnyHDR(release)) return null;

  const bestRusDub = bestRussianDubTrack(release);
  if (bestRusDub) {
    const profile = normalizeAudioProfile(bestRusDub.profile);
    const channels = audioTrackChannelCount(bestRusDub);
    if (profile === "Atmos" && channels >= 8) return "ruby";
  }

  const main = mainAudioTrack(release);
  if (!main) return null;

  if (audioTrackChannelCount(main) >= 6) return "gold";

  return null;
}
