import type { SlotTier } from "@/lib/franchises/franchise-summary";
import type { ReleaseTier } from "@/lib/media/release-tags";

/** Visual tier used for card glow, holo overlays, and chip tones. */
export type VisualTier = ReleaseTier | SlotTier | null;

export type TierChipTone = "default" | "gold" | "ruby";
export type PosterGlowVariant = "rest" | "inset";
export type TabTier = "ruby" | "gold" | "none";
export type SpotlightTier = "general" | "standard" | "gold" | "ruby";

export type TierTabStyle = {
  text: string;
  inactiveText: string;
  underline: string;
  glow: string;
  tag: string;
};

export function tierCardGlow(tier: VisualTier): string {
  if (tier === "ruby") return "glow-card-ruby";
  if (tier === "gold") return "glow-card-gold";
  return "glow-card-rest";
}

export function tierPosterGlow(
  tier: VisualTier,
  variant: PosterGlowVariant = "rest",
): string {
  if (tier === "ruby") {
    return variant === "inset" ? "glow-poster-ruby-inset" : "glow-poster-ruby-rest";
  }
  if (tier === "gold") {
    return variant === "inset" ? "glow-poster-gold-inset" : "glow-poster-gold-rest";
  }
  return variant === "inset" ? "glow-poster-inset" : "glow-poster-rest";
}

export function tierHoloClass(tier: "ruby" | "gold"): string {
  return tier === "ruby" ? "holo-ruby" : "holo-gold";
}

export function tierLaserTopClass(tier: "ruby" | "gold" | "ember"): string {
  const base = "tier-laser-top";
  if (tier === "ember") return `${base} tier-laser-top-ember`;
  return `${base} ${tier === "ruby" ? "tier-laser-top-ruby" : "tier-laser-top-gold"}`;
}

export function tierChipTone(tier: VisualTier): TierChipTone {
  if (tier === "ruby") return "ruby";
  if (tier === "gold") return "gold";
  return "default";
}

export const TIER_BOTTOM_SCRIM = {
  card: "linear-gradient(to top, rgba(7,6,10,0.97) 0%, rgba(7,6,10,0.9) 20%, rgba(7,6,10,0.5) 40%, transparent 60%)",
  cardFranchise:
    "linear-gradient(to top, rgba(7,6,10,0.96) 0%, rgba(7,6,10,0.82) 22%, rgba(7,6,10,0.4) 45%, transparent 65%)",
  placeholder:
    "linear-gradient(to top, rgba(7,6,10,0.96) 0%, rgba(7,6,10,0.7) 30%, transparent 60%)",
} as const;

export type TierScrimVariant = keyof typeof TIER_BOTTOM_SCRIM;

const TIER_TAB: Record<TabTier, TierTabStyle> = {
  ruby: {
    text: "text-crimson-bright",
    inactiveText: "text-crimson/55 hover:text-crimson-bright",
    underline: "bg-gradient-to-r from-transparent via-crimson to-crimson-bright",
    glow: "shadow-[0_0_10px_var(--crimson-glow)]",
    tag: "RUBY",
  },
  gold: {
    text: "text-accent",
    inactiveText: "text-accent/55 hover:text-accent",
    underline: "bg-gradient-to-r from-transparent via-accent to-accent-bright",
    glow: "shadow-[0_0_10px_var(--accent-glow)]",
    tag: "GOLD",
  },
  none: {
    text: "text-text",
    inactiveText: "text-muted hover:text-text",
    underline: "bg-gradient-to-r from-transparent via-muted to-text",
    glow: "",
    tag: "",
  },
};

export function tierTabStyles(tier: TabTier): TierTabStyle {
  return TIER_TAB[tier];
}

export function releaseToTabTier(
  tier: ReleaseTier | "standard" | null | undefined,
): TabTier {
  if (tier === "ruby") return "ruby";
  if (tier === "gold") return "gold";
  return "none";
}

/** Best spotlight among a collection of slot/release tiers (ruby > gold > standard > general). */
export function resolveSpotlightTier(
  tiers: Array<ReleaseTier | SlotTier | null | undefined>,
): SpotlightTier {
  if (tiers.some((t) => t === "ruby")) return "ruby";
  if (tiers.some((t) => t === "gold")) return "gold";
  if (tiers.some((t) => t === "standard")) return "standard";
  return "general";
}

// ── Franchise quality reel (slot tier → CSS) ─────────────────────────────

export const SLOT_TIER_CELL: Record<SlotTier, string> = {
  missing: "border border-dashed border-ember/40 bg-ember/[0.06]",
  standard:
    "border border-white/12 bg-gradient-to-b from-white/[0.10] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  gold: "border border-accent/45 bg-accent/[0.12] shadow-[0_0_12px_var(--accent-glow)]",
  ruby:
    "border border-crimson/45 bg-crimson/[0.14] shadow-[0_0_12px_rgba(154,27,52,0.35)]",
};

export const SLOT_TIER_SIGNAL: Record<SlotTier, string> = {
  missing: "",
  standard: "bg-white/30",
  gold: "bg-accent-bright shadow-[0_0_6px_var(--accent-glow)]",
  ruby: "bg-crimson-bright shadow-[0_0_6px_rgba(154,27,52,0.5)]",
};

export const SLOT_TIER_HOVER: Record<SlotTier, string> = {
  missing: "group-hover/slot:border-ember/70 group-hover/slot:bg-ember/10",
  standard:
    "group-hover/slot:border-white/20 group-hover/slot:from-white/[0.16]",
  gold: "group-hover/slot:shadow-[0_0_16px_var(--accent-glow)]",
  ruby: "group-hover/slot:shadow-[0_0_16px_rgba(154,27,52,0.5)]",
};

export const SLOT_TIER_FRAME: Record<SlotTier, string> = {
  missing: "bg-black/25 ring-1 ring-inset ring-white/10",
  standard: "bg-black/40 shadow-[inset_0_1px_0_rgba(0,0,0,0.55)]",
  gold: "bg-accent/[0.07] shadow-[inset_0_1px_0_rgba(0,0,0,0.55)]",
  ruby: "bg-crimson/[0.09] shadow-[inset_0_1px_0_rgba(0,0,0,0.55)]",
};

export const SLOT_TIER_FRAME_HOVER: Record<SlotTier, string> = {
  missing:
    "group-hover/slot:ring-ember/55 group-hover/slot:shadow-[0_0_12px_var(--ember-glow)]",
  standard:
    "group-hover/slot:shadow-[inset_0_1px_0_rgba(0,0,0,0.55),0_0_14px_rgba(255,255,255,0.22)]",
  gold:
    "group-hover/slot:shadow-[inset_0_1px_0_rgba(0,0,0,0.55),0_0_16px_rgba(232,176,90,0.4)]",
  ruby:
    "group-hover/slot:shadow-[inset_0_1px_0_rgba(0,0,0,0.55),0_0_18px_rgba(154,27,52,0.6)]",
};

export const SLOT_TIER_LABEL_TONE: Record<SlotTier, string> = {
  missing: "",
  standard: "text-white/85 drop-shadow-[0_0_4px_rgba(255,255,255,0.55)]",
  gold: "text-accent-bright drop-shadow-[0_0_4px_rgba(232,176,90,0.65)]",
  ruby: "text-crimson-bright drop-shadow-[0_0_4px_rgba(224,62,98,0.7)]",
};

export const SLOT_TIER_UNDERLINE: Record<SlotTier, string> = {
  missing: "",
  standard:
    "bg-gradient-to-r from-transparent via-white/85 to-transparent shadow-[0_0_6px_rgba(255,255,255,0.3)]",
  gold:
    "bg-gradient-to-r from-transparent via-accent-bright to-transparent shadow-[0_0_6px_rgba(232,176,90,0.4)]",
  ruby:
    "bg-gradient-to-r from-transparent via-crimson-bright to-transparent shadow-[0_0_6px_rgba(224,62,98,0.45)]",
};

export type SlotTileTone = "normal" | "gold" | "ruby";

export const SLOT_TILE_BY_TONE: Record<SlotTileTone, string> = {
  normal:
    "border-border-strong bg-bg-deep/85 text-text shadow-[0_1px_0_rgba(255,240,220,0.04)]",
  gold: "border-accent/45 bg-bg-deep/75 text-accent-bright shadow-[0_0_6px_rgba(232,176,90,0.18)]",
  ruby:
    "border-crimson/45 bg-bg-deep/75 text-crimson-bright shadow-[0_0_6px_rgba(154,27,52,0.22)]",
};

export function slotToTileTone(tier: SlotTier): SlotTileTone {
  if (tier === "ruby") return "ruby";
  if (tier === "gold") return "gold";
  return "normal";
}
