export type ResolutionLabel = "4K" | "1080p" | "720p" | "480p" | "other";

/** BDRip/WebRip often crop a few pixels off 1080p/4K — treat near-standard sizes as the tier. */
const RESOLUTION_TOLERANCE = 0.98;

const RESOLUTION_TIERS: ReadonlyArray<{
  label: ResolutionLabel;
  minHeight: number;
  minWidth: number;
}> = [
  { label: "4K", minHeight: 2160, minWidth: 3840 },
  { label: "1080p", minHeight: 1080, minWidth: 1920 },
  { label: "720p", minHeight: 720, minWidth: 1280 },
  { label: "480p", minHeight: 480, minWidth: 640 },
];

export function getResolutionLabel(
  width?: number | null,
  height?: number | null,
): ResolutionLabel {
  const h = height ?? 0;
  const w = width ?? 0;

  for (const tier of RESOLUTION_TIERS) {
    const minH = tier.minHeight * RESOLUTION_TOLERANCE;
    const minW = tier.minWidth * RESOLUTION_TOLERANCE;
    if (h >= minH || w >= minW) return tier.label;
  }

  return "other";
}

export function formatBitrateKbps(kbps?: number | null): string | null {
  if (kbps == null) return null;
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)}Mbps`;
  }
  return `${kbps}kbps`;
}

export function formatFps(fps?: string | number | null): string | null {
  if (fps == null || fps === "") return null;
  const num = typeof fps === "string" ? parseFloat(fps) : fps;
  if (Number.isNaN(num)) return String(fps);
  return `${Math.round(num * 100) / 100}fps`;
}
