import type { LucideIcon } from "lucide-react";
import { MonitorPlay, Sparkles, Sun, Waves } from "lucide-react";
import type { ArchiveMetrics } from "@/lib/catalog/archive-metrics";

export interface ArchiveQualityFilterParams {
  resolution: string | null;
  hdr: string | null;
  premiumAudio: string | null;
}

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
    key: "fourK",
    label: "4K",
    shortLabel: "4K",
    caption: "разрешение Ultra HD",
    icon: MonitorPlay,
    isActive: ({ resolution }, isCatalog) => isCatalog && resolution === "4K",
    toggleFilter: (active) => ({
      ...CLEAR_QUALITY_FILTERS,
      resolution: active ? null : "4K",
    }),
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
    key: "russianAtmos",
    label: "рус. Atmos",
    shortLabel: "рус. Atmos",
    caption: "объёмный звук · главная дорожка",
    icon: Waves,
    isActive: ({ premiumAudio }, isCatalog) =>
      isCatalog && premiumAudio === "true",
    toggleFilter: (active) => ({
      ...CLEAR_QUALITY_FILTERS,
      premiumAudio: active ? null : "true",
    }),
  },
  {
    key: "elite",
    label: "4K + HDR + рус. Atmos",
    shortLabel: "4K+HDR+Atmos",
    elite: true,
    icon: Sparkles,
    isActive: ({ resolution, hdr, premiumAudio }, isCatalog) =>
      isCatalog &&
      resolution === "4K" &&
      hdr === "HDR_ANY" &&
      premiumAudio === "true",
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
