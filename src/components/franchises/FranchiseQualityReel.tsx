"use client";

import { Monitor, Contrast, AudioLines, Film } from "lucide-react";
import type { ReactNode } from "react";
import type { FranchiseSlotSummary, SlotTier } from "@/lib/franchises/franchise-summary";
import { slotQualityLabel } from "@/lib/franchises/franchise-summary";
import { FranchiseSlotTooltip } from "@/components/franchises/FranchiseSlotTooltip";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";

interface FranchiseQualityReelProps {
  slots: FranchiseSlotSummary[];
  className?: string;
  /** "full" — крупные HUD-ячейки со стеком spec-тайлов (детальная страница).
   *  "slim" — компактная лента-киноплёнка из тир-цветов для карточки списка. */
  variant?: "full" | "slim";
}

/*
 * HUD-style quality readout. The "full" variant is a row of compact spec
 * panels (hairline cell + top signal bar + resolution/dynamic-range/audio
 * tiles) for the franchise detail page. The "slim" variant is the card-list
 * "quality rail" described below.
 *
 * ── Slim quality rail ──
 * A single machined celluloid rail (recessed dark tray + inner bezel + hairline
 * dividers), not a row of painted chips. Each filled slot is a dark tier-tinted
 * recessed cell read by LIGHT, not by fill: the slot's RESOLUTION is etched as a
 * short tier-tinted label (4K / FHD / HD / SD) — the most legible at-a-glance
 * quality metric, naturally varied per film — and a centered tier laser tick
 * burns along the cell's bottom edge (transparent at both ends, bright in the
 * middle) so adjacent filled cells fade into the divider gap instead of
 * restarting a hard bright edge. Resolution reads as "what" and the tier color
 * + underline as "how premium": standard → silver, gold → gold, ruby → ruby.
 * A linked film without a probed resolution falls back to a small film glyph.
 * Missing slots stay a hollow cell with a faint index, warming to ember on
 * hover. The container carries the full aria-label so the visual cells stay
 * label-free and compact.
 */

const TIER_CELL: Record<SlotTier, string> = {
  missing: "border border-dashed border-ember/40 bg-ember/[0.06]",
  standard:
    "border border-white/12 bg-gradient-to-b from-white/[0.10] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
  gold: "border border-accent/45 bg-accent/[0.12] shadow-[0_0_12px_var(--accent-glow)]",
  ruby:
    "border border-crimson/45 bg-crimson/[0.14] shadow-[0_0_12px_rgba(154,27,52,0.35)]",
};

const TIER_SIGNAL: Record<SlotTier, string> = {
  missing: "",
  standard: "bg-white/30",
  gold: "bg-accent-bright shadow-[0_0_6px_var(--accent-glow)]",
  ruby: "bg-crimson-bright shadow-[0_0_6px_rgba(154,27,52,0.5)]",
};

const TIER_HOVER: Record<SlotTier, string> = {
  missing: "group-hover/slot:border-ember/70 group-hover/slot:bg-ember/10",
  standard:
    "group-hover/slot:border-white/20 group-hover/slot:from-white/[0.16]",
  gold: "group-hover/slot:shadow-[0_0_16px_var(--accent-glow)]",
  ruby: "group-hover/slot:shadow-[0_0_16px_rgba(154,27,52,0.5)]",
};

/* Slim quality-rail cells: FRAME = the recessed tier-tinted cell that sits in
 * the shared celluloid tray; the tier inside is read by a glowing tier-tinted
 * resolution label + a centered tier underline (see SLOT_TONE / UNDERLINE /
 * slotHeadlineLabel), rendered only for filled slots. */
const FRAME: Record<SlotTier, string> = {
  missing: "bg-black/25 ring-1 ring-inset ring-white/10",
  standard: "bg-black/40 shadow-[inset_0_1px_0_rgba(0,0,0,0.55)]",
  gold: "bg-accent/[0.07] shadow-[inset_0_1px_0_rgba(0,0,0,0.55)]",
  ruby: "bg-crimson/[0.09] shadow-[inset_0_1px_0_rgba(0,0,0,0.55)]",
};

const FRAME_HOVER: Record<SlotTier, string> = {
  missing:
    "group-hover/slot:ring-ember/55 group-hover/slot:shadow-[0_0_12px_var(--ember-glow)]",
  standard:
    "group-hover/slot:shadow-[inset_0_1px_0_rgba(0,0,0,0.55),0_0_14px_rgba(255,255,255,0.22)]",
  gold:
    "group-hover/slot:shadow-[inset_0_1px_0_rgba(0,0,0,0.55),0_0_16px_rgba(232,176,90,0.4)]",
  ruby:
    "group-hover/slot:shadow-[inset_0_1px_0_rgba(0,0,0,0.55),0_0_18px_rgba(154,27,52,0.6)]",
};

/* Slim quality-rail filled cells read by LIGHT, not fill: SLOT_TONE = the tier
 * color + glow applied to the slot's resolution label (and the film-glyph
 * fallback), so the strip is a row of distinct etched quality tags, not the
 * same glyph repeated; UNDERLINE = a centered tier laser tick at the cell's
 * bottom edge (transparent at both ends, bright in the middle) so adjacent
 * filled cells fade into the gap instead of restarting a hard edge. */
const SLOT_TONE: Record<SlotTier, string> = {
  missing: "",
  standard: "text-white/85 drop-shadow-[0_0_4px_rgba(255,255,255,0.55)]",
  gold: "text-accent-bright drop-shadow-[0_0_4px_rgba(232,176,90,0.65)]",
  ruby: "text-crimson-bright drop-shadow-[0_0_4px_rgba(224,62,98,0.7)]",
};

const UNDERLINE: Record<SlotTier, string> = {
  missing: "",
  standard:
    "bg-gradient-to-r from-transparent via-white/85 to-transparent shadow-[0_0_6px_rgba(255,255,255,0.3)]",
  gold:
    "bg-gradient-to-r from-transparent via-accent-bright to-transparent shadow-[0_0_6px_rgba(232,176,90,0.4)]",
  ruby:
    "bg-gradient-to-r from-transparent via-crimson-bright to-transparent shadow-[0_0_6px_rgba(224,62,98,0.45)]",
};

const TILE_BASE =
  "flex items-center justify-center gap-1 rounded-[3px] border px-1 py-[2px] font-mono text-[0.5rem] uppercase tracking-[0.05em] leading-none tabular-nums";

const TILE_NORMAL =
  "border-border-strong bg-bg-deep/85 text-text shadow-[0_1px_0_rgba(255,240,220,0.04)]";

const TILE_GOLD =
  "border-accent/45 bg-bg-deep/75 text-accent-bright shadow-[0_0_6px_rgba(232,176,90,0.18)]";

const TILE_RUBY =
  "border-crimson/45 bg-bg-deep/75 text-crimson-bright shadow-[0_0_6px_rgba(154,27,52,0.22)]";

type TileTone = "normal" | "gold" | "ruby";

const TILE_BY_TONE: Record<TileTone, string> = {
  normal: TILE_NORMAL,
  gold: TILE_GOLD,
  ruby: TILE_RUBY,
};

function Tile({
  icon,
  value,
  tone,
}: {
  icon: ReactNode;
  value: string;
  tone: TileTone;
}) {
  return (
    <span className={`${TILE_BASE} ${TILE_BY_TONE[tone]}`}>
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function slotTileTone(slot: FranchiseSlotSummary): TileTone {
  if (slot.tier === "ruby") return "ruby";
  if (slot.tier === "gold") return "gold";
  return "normal";
}

/** Slim reel cell content: the slot's resolution etched as a short tier-tinted
 *  label (4K / FHD / HD / SD) — the most legible at-a-glance quality metric,
 *  naturally varied per film. Falls back to a small film glyph when the
 *  resolution is unknown (linked film without a probed video track). The tier
 *  is carried separately by the label's hue + the centered underline, so
 *  resolution reads as "what" and tier as "how premium". */
function slotHeadlineLabel(slot: FranchiseSlotSummary) {
  const tone = SLOT_TONE[slot.tier];
  if (slot.resolution) {
    return (
      <span
        aria-hidden
        className={`font-mono text-[0.6rem] font-semibold tabular-nums tracking-tight leading-none ${tone}`}
      >
        {slot.resolution}
      </span>
    );
  }
  return <Film aria-hidden className={`h-[11px] w-[11px] ${tone}`} />;
}

function SpecTiles({ slot }: { slot: FranchiseSlotSummary }) {
  const tone = slotTileTone(slot);
  const iconCls = "h-[9px] w-[9px]";
  return (
    <div className="flex h-full flex-col items-stretch justify-center gap-[3px]">
      {slot.resolution ? (
        <Tile
          icon={<Monitor className={iconCls} aria-hidden />}
          value={slot.resolution}
          tone={tone}
        />
      ) : null}
      {slot.dynamicRange ? (
        <Tile
          icon={<Contrast className={iconCls} aria-hidden />}
          value={slot.dynamicRange}
          tone={tone}
        />
      ) : null}
      {slot.audio ? (
        <Tile
          icon={<AudioLines className={iconCls} aria-hidden />}
          value={slot.audio}
          tone={tone}
        />
      ) : null}
    </div>
  );
}

function reelAriaLabel(slots: FranchiseSlotSummary[]): string {
  return `Качество по фильмам: ${slots
    .map((s) => {
      const title = s.title ?? `фильм ${s.index + 1}`;
      return `${title}: ${slotQualityLabel(s)}`;
    })
    .join("; ")}`;
}

export function FranchiseQualityReel({
  slots,
  className = "",
  variant = "full",
}: FranchiseQualityReelProps) {
  if (slots.length === 0) return null;

  const ariaLabel = reelAriaLabel(slots);

  if (variant === "slim") {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        className={`flex items-stretch gap-[2px] rounded-[6px] p-[3px] ring-1 ring-inset ring-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
      >
        {slots.map((slot) => (
          <HoverTooltip
            key={slot.index}
            content={<FranchiseSlotTooltip slot={slot} />}
            className={`group/slot relative flex h-7 flex-1 min-w-0 items-center justify-center rounded-[3px] transition-all duration-200 ${FRAME[slot.tier]} ${FRAME_HOVER[slot.tier]}`}
          >
            {slot.filled ? (
              <>
                {slotHeadlineLabel(slot)}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-[3px] bottom-0 h-[2px] rounded-full ${UNDERLINE[slot.tier]}`}
                />
              </>
            ) : (
              <span className="font-mono text-[0.5rem] tabular-nums text-faint transition-colors duration-200 group-hover/slot:text-ember/80">
                {slot.index + 1}
              </span>
            )}
          </HoverTooltip>
        ))}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`flex items-stretch gap-[3px] ${className}`}
    >
      {slots.map((slot) => (
        <HoverTooltip
          key={slot.index}
          content={<FranchiseSlotTooltip slot={slot} />}
          className={`group/slot relative flex-1 min-w-0 overflow-hidden rounded-[5px] transition-all duration-200 ${TIER_CELL[slot.tier]} ${TIER_HOVER[slot.tier]}`}
        >
          {slot.tier !== "missing" ? (
            <span
              aria-hidden
              className={`absolute inset-x-0 top-0 h-[3px] ${TIER_SIGNAL[slot.tier]}`}
            />
          ) : null}
          <span className="flex h-full items-center justify-center px-[5px] pt-[7px] pb-1">
            {slot.filled ? (
              <SpecTiles slot={slot} />
            ) : (
              <span className="font-mono text-[0.5rem] tabular-nums text-ember/55">
                {slot.index + 1}
              </span>
            )}
          </span>
        </HoverTooltip>
      ))}
    </div>
  );
}
