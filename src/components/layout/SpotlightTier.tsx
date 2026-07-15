"use client";

import { useEffect } from "react";

export type SpotlightTier = "general" | "standard" | "gold" | "ruby";

/**
 * Recolors the global AmbientBackground spotlight to match the current page's
 * tier. The background is mounted once in the root layout and reads the
 * `data-spotlight` attribute on <html> via CSS, so a tiered page just renders
 * this component to switch the whole ambient (cone + glow hotspots) without
 * remounting the background — the CSS transition crossfades the colors.
 *
 * Mount order keeps the baseline correct: the root layout renders a
 * `tier="general"` instance, tiered pages render their own on top. While a
 * tiered instance is mounted it wins; on unmount it resets to "general" so the
 * ambient returns to the neutral projection-room glow on non-tiered pages.
 */
export function SpotlightTier({ tier }: { tier: SpotlightTier }) {
  useEffect(() => {
    document.documentElement.dataset.spotlight = tier;
    return () => {
      document.documentElement.dataset.spotlight = "general";
    };
  }, [tier]);

  return null;
}
