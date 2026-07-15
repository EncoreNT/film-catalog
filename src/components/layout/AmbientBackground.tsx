import { SpotlightTier } from "@/components/layout/SpotlightTier";

/**
 * Global cinematic ambient: viewport-fixed dual corner spots, edge vignette.
 * Tier colors via `data-spotlight` on <html>.
 */
export function AmbientBackground() {
  /* Asymmetric lit pool — poster-left + wide release-panel-right */
  const litPoolMask =
    "radial-gradient(ellipse 95% 88% at 24% -6%, #000 0%, rgba(0,0,0,0.5) 55%, transparent 86%), radial-gradient(ellipse 175% 100% at 74% -4%, #000 0%, rgba(0,0,0,0.58) 58%, transparent 90%)";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-visible"
      aria-hidden
    >
      <SpotlightTier tier="general" />

      <div className="stage-floor absolute inset-0" />

      <div className="spotlight-stage">
        <div className="spotlight-rig spotlight-rig--left">
          <div className="spotlight-beam spotlight-beam--dust" />
          <div className="spotlight-beam spotlight-beam--spread" />
          <div className="spotlight-beam spotlight-beam--core" />
        </div>

        <div className="spotlight-rig spotlight-rig--right">
          <div className="spotlight-beam spotlight-beam--dust" />
          <div className="spotlight-beam spotlight-beam--spread" />
          <div className="spotlight-beam spotlight-beam--core" />
        </div>

        <div className="stage-overlap-dampen" />
        <div className="stage-vignette" />
      </div>

      <div
        className="tech-grid absolute inset-0 opacity-70"
        style={{
          WebkitMaskImage: litPoolMask,
          maskImage: litPoolMask,
        }}
      />

      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--spotlight-tint) 1px, transparent 1px), linear-gradient(to bottom, var(--spotlight-tint) 1px, transparent 1px)",
          backgroundSize: "14px 14px",
          WebkitMaskImage: litPoolMask,
          maskImage: litPoolMask,
        }}
      />
    </div>
  );
}
