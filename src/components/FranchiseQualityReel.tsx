import { Monitor, Contrast, AudioLines } from "lucide-react";
import type { ReactNode } from "react";
import type { FranchiseSlotSummary, SlotTier } from "@/lib/franchise-summary";

interface FranchiseQualityReelProps {
  slots: FranchiseSlotSummary[];
  className?: string;
}

/*
 * HUD-style quality readout. Each filled film is a compact "spec panel":
 * a hairline-bordered cell with a slim top signal bar whose brightness
 * encodes the quality tier, holding three clearly delineated spec tiles
 * (resolution · dynamic range · audio), each led by a small lucide icon.
 * Missing slots stay hollow with a faint index marker so the gaps read as
 * intentional. Elite tier earns an accent glow + gold tiles. Everything
 * uses the warm-coal theme tokens — no flat white pills — for a cinematic,
 * technical feel.
 */

const TIER_CELL: Record<SlotTier, string> = {
  missing: "border border-dashed border-ember/40 bg-ember/[0.05]",
  basic: "border border-border-strong/60 bg-bg-base",
  "premium-1": "border border-border-strong/60 bg-accent/[0.07]",
  "premium-2": "border border-accent/25 bg-accent/[0.10]",
  elite: "border border-accent/45 bg-accent/[0.13] shadow-[0_0_12px_var(--accent-glow)]",
};

const TIER_SIGNAL: Record<SlotTier, string> = {
  missing: "",
  basic: "bg-border-strong",
  "premium-1": "bg-accent/55",
  "premium-2": "bg-accent/85",
  elite: "bg-accent-bright shadow-[0_0_6px_var(--accent-glow)]",
};

const TIER_HOVER: Record<SlotTier, string> = {
  missing: "group-hover:border-ember/70 group-hover:bg-ember/10",
  basic: "group-hover:border-accent/30",
  "premium-1": "group-hover:border-accent/40",
  "premium-2": "group-hover:border-accent/55",
  elite: "group-hover:shadow-[0_0_16px_var(--accent-glow)]",
};

const TILE_BASE =
  "flex items-center justify-center gap-1 rounded-[3px] border px-1 py-[2px] font-mono text-[0.5rem] uppercase tracking-[0.05em] leading-none tabular-nums";

const TILE_NORMAL =
  "border-border-strong/70 bg-bg-elevated text-text";

const TILE_ELITE =
  "border-accent/50 bg-accent/15 text-accent shadow-[0_0_6px_rgba(168,101,31,0.20)]";

export function qualityLabel(slot: FranchiseSlotSummary): string {
  if (!slot.filled) return "не хватает";
  const parts: string[] = [];
  if (slot.resolution) parts.push(slot.resolution);
  if (slot.dynamicRange) parts.push(slot.dynamicRange);
  if (slot.audioFull) parts.push(slot.audioFull);
  return parts.length ? parts.join(" · ") : "стандартное качество";
}

function Tile({
  icon,
  value,
  elite,
}: {
  icon: ReactNode;
  value: string;
  elite: boolean;
}) {
  return (
    <span className={`${TILE_BASE} ${elite ? TILE_ELITE : TILE_NORMAL}`}>
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}

function SpecTiles({ slot }: { slot: FranchiseSlotSummary }) {
  const elite = slot.tier === "elite";
  const iconCls = "h-[9px] w-[9px]";
  return (
    <div className="flex h-full flex-col items-stretch justify-center gap-[3px]">
      {slot.resolution ? (
        <Tile
          icon={<Monitor className={iconCls} aria-hidden />}
          value={slot.resolution}
          elite={elite}
        />
      ) : null}
      {slot.dynamicRange ? (
        <Tile
          icon={<Contrast className={iconCls} aria-hidden />}
          value={slot.dynamicRange}
          elite={elite}
        />
      ) : null}
      {slot.audio ? (
        <Tile
          icon={<AudioLines className={iconCls} aria-hidden />}
          value={slot.audio}
          elite={elite}
        />
      ) : null}
    </div>
  );
}

export function FranchiseQualityReel({
  slots,
  className = "",
}: FranchiseQualityReelProps) {
  if (slots.length === 0) return null;

  const ariaLabel = `Качество по фильмам: ${slots
    .map((s) => {
      const title = s.title ?? `фильм ${s.index + 1}`;
      return `${title} — ${qualityLabel(s)}`;
    })
    .join("; ")}`;

  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={`flex items-stretch gap-[3px] ${className}`}
    >
      {slots.map((slot) => (
        <span
          key={slot.index}
          title={`Фильм ${slot.index + 1} · ${slot.title ?? "без названия"} — ${qualityLabel(slot)}${slot.year ? ` · ${slot.year}` : ""}`}
          className={`relative flex-1 min-w-0 overflow-hidden rounded-[5px] transition-all duration-200 ${TIER_CELL[slot.tier]} ${TIER_HOVER[slot.tier]}`}
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
              <span className="font-mono text-[0.5rem] tabular-nums text-ember/70">
                {slot.index + 1}
              </span>
            )}
          </span>
        </span>
      ))}
    </div>
  );
}
