import type { SpotlightTier, ArchiveQualityFilterParams } from "@/lib/media/tier-core";
import {
  hasAnyHdrFilter,
  resolveCatalogFilterSpotlightTier,
} from "@/lib/media/tier-core";

export { hasAnyHdrFilter };

/**
 * Maps catalog quality filters to ambient spotlight tier (ruby > gold > general).
 */
export function resolveCatalogSpotlightTier(
  params: ArchiveQualityFilterParams,
  isCatalog = true,
): SpotlightTier {
  return resolveCatalogFilterSpotlightTier(params, isCatalog);
}
