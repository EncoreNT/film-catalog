import type { LucideIcon } from "lucide-react";
import { Gem, MonitorPlay, Sun } from "lucide-react";
import { RUBY_TIER_RIBBON_GENERIC } from "@/lib/media/release-tags";
import type { ArchiveMetrics } from "@/lib/catalog/archive-metrics";
import {
  matchesCatalogGoldFilter,
  matchesCatalogRubyFilter,
  type ArchiveQualityFilterParams,
} from "@/lib/media/tier-core";

export type { ArchiveQualityFilterParams } from "@/lib/media/tier-core";

export interface ArchiveQualityMetricDef {
  key: keyof ArchiveMetrics;
  label: string;
  /** Compact label for dense rails (catalog header). Falls back to `label`. */
  shortLabel?: string;
  /** Two-line stacked label for cells that name multiple formats (e.g. HDR10 / HDR10+).
   *  When present, the rail renders it as a small spec pair instead of `shortLabel`. */
  stackedLabel?: [string, string];
  caption?: string;
  elite?: boolean;
  icon: LucideIcon;
  isActive: (params: ArchiveQualityFilterParams, isCatalog: boolean) => boolean;
  toggleFilter: (active: boolean) => Record<string, string | null>;
}

export const CLEAR_QUALITY_FILTERS: Record<string, null> = {
  resolution: null,
  hdr: null,
  premiumAudio: null,
};

export const ARCHIVE_QUALITY_METRIC_DEFS: ArchiveQualityMetricDef[] = [
  {
    key: "gold",
    label: "4K + любой HDR",
    stackedLabel: ["4K", "HDR"],
    caption: "Gold tier · Ultra HD с расширенным динамическим диапазоном",
    icon: MonitorPlay,
    isActive: (params, isCatalog) => matchesCatalogGoldFilter(params, isCatalog),
    toggleFilter: (active) =>
      active
        ? CLEAR_QUALITY_FILTERS
        : {
            ...CLEAR_QUALITY_FILTERS,
            resolution: "4K",
            hdr: "HDR_ANY",
          },
  },
  {
    key: "hdr10",
    label: "HDR10 / HDR10+",
    stackedLabel: ["HDR10", "HDR10+"],
    caption: "расширенный динамический диапазон",
    icon: Sun,
    isActive: ({ hdr }, isCatalog) => isCatalog && hdr === "HDR10,HDR10+",
    toggleFilter: (active) => ({
      ...CLEAR_QUALITY_FILTERS,
      hdr: active ? null : "HDR10,HDR10+",
    }),
  },
  {
    key: "elite",
    label: RUBY_TIER_RIBBON_GENERIC,
    shortLabel: RUBY_TIER_RIBBON_GENERIC,
    elite: true,
    icon: Gem,
    isActive: (params, isCatalog) => matchesCatalogRubyFilter(params, isCatalog),
    toggleFilter: (active) =>
      active
        ? CLEAR_QUALITY_FILTERS
        : {
            resolution: "4K",
            hdr: "HDR_ANY",
            premiumAudio: "true",
          },
  },
];
