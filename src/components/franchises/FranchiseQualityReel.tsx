"use client";

import { Monitor, Contrast, AudioLines, Film } from "lucide-react";
import type { ReactNode } from "react";
import type { FranchiseSlotSummary } from "@/lib/franchises/franchise-summary";
import { slotQualityLabel } from "@/lib/franchises/franchise-summary";
import {
  SLOT_TIER_CELL,
  SLOT_TIER_FRAME,
  SLOT_TIER_FRAME_HOVER,
  SLOT_TIER_HOVER,
  SLOT_TIER_LABEL_TONE,
  SLOT_TIER_SIGNAL,
  SLOT_TIER_UNDERLINE,
  SLOT_TILE_BY_TONE,
  slotToTileTone,
  type SlotTileTone,
} from "@/lib/media/tier-presentation";
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

const TILE_BASE =
  "flex items-center justify-center gap-1 rounded-[3px] border px-1 py-[2px] font-mono text-[0.5rem] uppercase tracking-[0.05em] leading-none tabular-nums";

const TILE_BY_TONE = SLOT_TILE_BY_TONE;

function Tile({
  icon,
  value,
  tone,
}: {
  icon: ReactNode;
  value: string;
  tone: SlotTileTone;
}) {
  return (
    <span className={`${TILE_BASE} ${TILE_BY_TONE[tone]}`}>
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function slotTileTone(slot: FranchiseSlotSummary): SlotTileTone {
  return slotToTileTone(slot.tier);
}

/** Slim reel cell content: the slot's resolution etched as a short tier-tinted
 *  label (4K / FHD / HD / SD) — the most legible at-a-glance quality metric,
 *  naturally varied per film. Falls back to a small film glyph when the
 *  resolution is unknown (linked film without a probed video track). The tier
 *  is carried separately by the label's hue + the centered underline, so
 *  resolution reads as "what" and tier as "how premium". */
function slotHeadlineLabel(slot: FranchiseSlotSummary) {
  const tone = SLOT_TIER_LABEL_TONE[slot.tier];
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
            className={`group/slot relative flex h-7 flex-1 min-w-0 items-center justify-center rounded-[3px] transition-all duration-200 ${SLOT_TIER_FRAME[slot.tier]} ${SLOT_TIER_FRAME_HOVER[slot.tier]}`}
          >
            {slot.filled ? (
              <>
                {slotHeadlineLabel(slot)}
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-[3px] bottom-0 h-[2px] rounded-full ${SLOT_TIER_UNDERLINE[slot.tier]}`}
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
          className={`group/slot relative flex-1 min-w-0 overflow-hidden rounded-[5px] transition-all duration-200 ${SLOT_TIER_CELL[slot.tier]} ${SLOT_TIER_HOVER[slot.tier]}`}
        >
          {slot.tier !== "missing" ? (
            <span
              aria-hidden
              className={`absolute inset-x-0 top-0 h-[3px] ${SLOT_TIER_SIGNAL[slot.tier]}`}
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
