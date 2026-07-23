import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { isSpatialAudioProfile } from "@/lib/media/quality-predicates";
import {
  audioTrackChannelCount,
  is4K,
  isAnyHDR,
  type ReleaseTier,
} from "@/lib/media/release-tags";

export type BuildVisualTier = ReleaseTier | "standard";

export type SpotlightTier = "general" | "standard" | "gold" | "ruby";

export interface ArchiveQualityFilterParams {
  resolution: string | null;
  hdr: string | null;
  premiumAudio: string | null;
}

/** Catalog URL filter combo for gold tier rail. */
export const CATALOG_GOLD_FILTER: Pick<
  ArchiveQualityFilterParams,
  "resolution" | "hdr"
> = {
  resolution: "4K",
  hdr: "HDR_ANY",
};

/** Catalog URL filter combo for ruby/elite tier rail. */
export const CATALOG_RUBY_FILTER: ArchiveQualityFilterParams = {
  resolution: "4K",
  hdr: "HDR_ANY",
  premiumAudio: "true",
};

export function matchesCatalogGoldFilter(
  params: ArchiveQualityFilterParams,
  isCatalog = true,
): boolean {
  return (
    isCatalog &&
    params.resolution === CATALOG_GOLD_FILTER.resolution &&
    params.hdr === CATALOG_GOLD_FILTER.hdr
  );
}

export function matchesCatalogRubyFilter(
  params: ArchiveQualityFilterParams,
  isCatalog = true,
): boolean {
  return (
    isCatalog &&
    params.resolution === CATALOG_RUBY_FILTER.resolution &&
    params.hdr === CATALOG_RUBY_FILTER.hdr &&
    params.premiumAudio === CATALOG_RUBY_FILTER.premiumAudio
  );
}

/** True when URL hdr param requests any non-SDR dynamic range. */
export function hasAnyHdrFilter(hdr: string | null): boolean {
  if (!hdr) return false;
  return hdr
    .split(",")
    .filter(Boolean)
    .some((value) => value === "HDR_ANY" || value !== "SDR");
}

/**
 * Maps catalog quality filters to ambient spotlight tier (ruby > gold > general).
 */
export function resolveCatalogFilterSpotlightTier(
  params: ArchiveQualityFilterParams,
  isCatalog = true,
): SpotlightTier {
  if (!isCatalog) return "general";

  const is4K = params.resolution === "4K";
  const hasHdr = hasAnyHdrFilter(params.hdr);
  const hasPremiumAudio = params.premiumAudio === "true";

  if (is4K && hasHdr && hasPremiumAudio) return "ruby";
  if (is4K && hasHdr) return "gold";

  return "general";
}

export function maxReleaseTier(
  a: ReleaseTier | null | undefined,
  b: ReleaseTier | null | undefined,
): ReleaseTier {
  if (a === "ruby" || b === "ruby") return "ruby";
  if (a === "gold" || b === "gold") return "gold";
  return null;
}

export function maxBuildVisualTier(
  a: BuildVisualTier | null | undefined,
  b: BuildVisualTier | null | undefined,
): BuildVisualTier | null {
  if (a === "ruby" || b === "ruby") return "ruby";
  if (a === "gold" || b === "gold") return "gold";
  if (a === "standard" || b === "standard") return "standard";
  return null;
}

/** Best spotlight among tiers (ruby > gold > standard > general). */
export function maxSpotlightTier(
  tiers: Array<ReleaseTier | BuildVisualTier | "missing" | null | undefined>,
): SpotlightTier {
  if (tiers.some((t) => t === "ruby")) return "ruby";
  if (tiers.some((t) => t === "gold")) return "gold";
  if (tiers.some((t) => t === "standard")) return "standard";
  return "general";
}

type AudioTrackLike = ReleaseWithTracks["audioTracks"][number];

/**
 * Infer tier from 4K/HDR video + selected audio tracks (planned build mux).
 * Mirrors {@link releaseTier} but on an explicit audio track list.
 */
export function inferTierFrom4kHdrAndAudioTracks(
  videoRelease: ReleaseWithTracks,
  audioTracks: AudioTrackLike[],
): BuildVisualTier {
  if (!is4K(videoRelease) || !isAnyHDR(videoRelease)) {
    return "standard";
  }

  for (const audio of audioTracks) {
    if (audio.language !== "rus" || audio.translationType !== "dub") continue;
    if (
      isSpatialAudioProfile(audio.profile) &&
      audioTrackChannelCount(audio) >= 8
    ) {
      return "ruby";
    }
  }

  for (const audio of audioTracks) {
    if (audioTrackChannelCount(audio) >= 6) return "gold";
  }

  return "standard";
}

export function buildSpotlightFromVisual(
  tier: BuildVisualTier | null,
): SpotlightTier {
  if (tier === "ruby") return "ruby";
  if (tier === "gold") return "gold";
  if (tier === "standard") return "standard";
  return "general";
}
