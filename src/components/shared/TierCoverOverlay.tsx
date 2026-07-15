import {
  TIER_BOTTOM_SCRIM,
  tierHoloClass,
  tierLaserTopClass,
  type TierScrimVariant,
  type VisualTier,
} from "@/lib/media/tier-presentation";

interface TierCoverOverlayProps {
  tier: VisualTier;
  scrim?: TierScrimVariant;
  showScrim?: boolean;
  /** Holo opacity at rest (Tailwind arbitrary value, e.g. opacity-[0.14]). */
  holoRestOpacity?: string;
  /** Holo opacity on card hover (group-hover/laser). */
  holoHoverOpacity?: string;
}

/**
 * Shared holo foil + tier laser line + bottom legibility scrim for poster covers.
 * Used on catalog cards, franchise cards, and detail hero covers.
 */
export function TierCoverOverlay({
  tier,
  scrim = "card",
  showScrim = true,
  holoRestOpacity = "opacity-[0.14]",
  holoHoverOpacity = "group-hover/laser:opacity-60",
}: TierCoverOverlayProps) {
  return (
    <>
      {tier === "ruby" || tier === "gold" ? (
        <>
          <div
            className={`pointer-events-none absolute inset-0 z-[2] ${holoRestOpacity} mix-blend-overlay transition-opacity duration-500 ${holoHoverOpacity} ${tierHoloClass(tier)}`}
            aria-hidden
          />
          <div className={tierLaserTopClass(tier)} aria-hidden />
        </>
      ) : null}
      {showScrim ? (
        <div
          className="pointer-events-none absolute inset-0 z-[3]"
          aria-hidden
          style={{ background: TIER_BOTTOM_SCRIM[scrim] }}
        />
      ) : null}
    </>
  );
}
