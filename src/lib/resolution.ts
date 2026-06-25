export type ResolutionLabel = "4K" | "1080p" | "720p" | "480p" | "other";

export function getResolutionLabel(
  width?: number | null,
  height?: number | null,
): ResolutionLabel {
  const h = height ?? 0;
  const w = width ?? 0;

  if (h >= 2160 || w >= 3840) return "4K";
  if (h >= 1080 || w >= 1920) return "1080p";
  if (h >= 720 || w >= 1280) return "720p";
  if (h >= 480 || w >= 640) return "480p";
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
