import { SpotlightTier } from "@/components/layout/SpotlightTier";

/**
 * Global cinematic ambient: deep coal base, tech grid, and a volumetric
 * projector cone whose color tracks the current page's tier. Mounted once in
 * the root layout (fixed, behind everything) so it never remounts between
 * pages — the <SpotlightTier/> baseline here keeps non-tiered pages on the
 * neutral "general" glow, and tiered pages render their own <SpotlightTier/>
 * on top to recolor the cone + hotspots via the `data-spotlight` attribute.
 */
export function AmbientBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Baseline tier — neutral projection-room glow for every non-tiered page. */}
      <SpotlightTier tier="general" />

      {/* Deep coal base — cinematic black with whisper of warmth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 130% 95% at 50% 8%, #1f1830 0%, #15121f 30%, #0c0a12 62%, #07060a 100%)",
        }}
      />

      {/* Tech grid — present and visible, masked to fade lower */}
      <div className="tech-grid absolute inset-0 opacity-100" />

      {/* Volumetric projector cone — narrow at the lens (top center), widening
          downward. Three layered shafts (diffuse body + hot core + source
          flare) build the "light" feel; the radial mask feathers the edges so
          it never reads as a flat tilted rectangle. Colors come from the
          --spotlight-* tokens, so the whole cone recolors per tier. */}
      <div className="spotlight-cone absolute -top-[8%] left-1/2 h-[92rem] w-[72rem] -translate-x-1/2 opacity-90" />
      <div className="spotlight-core absolute -top-[6%] left-1/2 h-[82rem] w-[34rem] -translate-x-1/2 opacity-95" />
      <div className="spotlight-source absolute -top-[6%] left-1/2 h-[34rem] w-[40rem] -translate-x-1/2 opacity-95" />

      {/* Tier-tinted source glow — the lens hotspot, colored by the active tier */}
      <div
        className="glow-hotspot ambient-blob-1 absolute top-[1%] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 opacity-90"
        style={{
          background:
            "radial-gradient(circle, var(--spotlight-glow) 0%, transparent 72%)",
          filter: "blur(50px)",
        }}
      />

      {/* Tier-tinted central wash — keeps the tier color alive mid-page */}
      <div
        className="glow-hotspot absolute top-[42%] left-1/2 h-[28rem] w-[42rem] -translate-x-1/2 opacity-55"
        style={{
          background:
            "radial-gradient(ellipse, var(--spotlight-mid) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Tier-tinted landing pool — where the cone "lands" low-center */}
      <div
        className="glow-hotspot ambient-blob-2 absolute -bottom-[8%] left-1/2 h-[32rem] w-[44rem] -translate-x-1/2 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse, var(--spotlight-pool) 0%, transparent 68%)",
          filter: "blur(55px)",
        }}
      />

      {/* Neural-violet nebula — right-mid, a quiet tech hint that stays
          constant across tiers so the coal identity never washes out. */}
      <div
        className="glow-hotspot ambient-blob-neural absolute top-[20%] -right-8 h-[28rem] w-[28rem] opacity-40"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.40) 0%, rgba(139,92,246,0.12) 42%, transparent 72%)",
          filter: "blur(55px)",
        }}
      />

      {/* Fine tech grid overlay for density, tinted by the active tier */}
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--spotlight-tint) 1px, transparent 1px), linear-gradient(to bottom, var(--spotlight-tint) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 65% at 50% 35%, #000 0%, transparent 85%)",
          maskImage:
            "radial-gradient(ellipse 80% 65% at 50% 35%, #000 0%, transparent 85%)",
        }}
      />
    </div>
  );
}
