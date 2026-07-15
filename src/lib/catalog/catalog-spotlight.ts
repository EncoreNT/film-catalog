import type { ArchiveQualityFilterParams } from "@/lib/catalog/archive-quality-metrics";
import type { SpotlightTier } from "@/lib/media/tier-presentation";

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
 * Ruby — 4K + any HDR + premium Russian spatial audio (elite rail / sidebar combo).
 * Gold — 4K + any HDR without the ruby audio leg.
 * Draft/excluded views and unrelated filters keep the neutral projection-room glow.
 */
export function resolveCatalogSpotlightTier(
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
