import type { FranchiseSlotSummary, SlotTier } from "@/lib/franchise-summary";

interface FranchiseQualityReelProps {
  slots: FranchiseSlotSummary[];
  className?: string;
}

const TIER_CELL: Record<SlotTier, string> = {
  missing: "border border-dashed border-ember/45 bg-ember/5",
  basic: "bg-muted/30",
  "premium-1": "bg-accent/40",
  "premium-2": "bg-accent/65",
  elite: "bg-accent shadow-[0_0_8px_var(--accent-glow)]",
};

const TIER_HOVER: Record<SlotTier, string> = {
  missing: "group-hover:border-ember/70 group-hover:bg-ember/10",
  basic: "group-hover:bg-muted/45",
  "premium-1": "group-hover:brightness-110",
  "premium-2": "group-hover:brightness-110",
  elite: "group-hover:shadow-[0_0_12px_var(--accent-glow)]",
};

// Badge pills are light chips with dark text so they read on every tier fill —
// the cell background still encodes the quality tier around them.
const BADGE_PILL =
  "rounded-[3px] bg-white/90 px-1 py-[1px] text-[0.5rem] font-bold leading-none text-black tabular-nums whitespace-nowrap";

export function qualityLabel(slot: FranchiseSlotSummary): string {
  if (!slot.filled) return "не хватает";
  const parts: string[] = [];
  if (slot.fourK) parts.push("4K");
  if (slot.hdr) parts.push("HDR");
  if (slot.atmos) parts.push("рус. Atmos");
  return parts.length ? parts.join(" · ") : "стандартное качество";
}

function CellBadges({ slot }: { slot: FranchiseSlotSummary }) {
  const top = slot.resolution || slot.dynamicRange;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 leading-none">
      {top ? (
        <div className="flex items-center justify-center gap-[3px]">
          {slot.resolution ? (
            <span className={BADGE_PILL}>{slot.resolution}</span>
          ) : null}
          {slot.dynamicRange ? (
            <span className={BADGE_PILL}>{slot.dynamicRange}</span>
          ) : null}
        </div>
      ) : null}
      {slot.audio ? (
        <span className={`${BADGE_PILL} max-w-full truncate text-center`}>
          {slot.audio}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Per-film quality strip — one segment per slot in story order. Each cell
 * shows the film's resolution, dynamic range and audio as badge chips;
 * missing slots stay hollow so the gaps read at a glance. Cell brightness
 * ramps with how many premium specs a film has.
 */
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
          className={`flex-1 min-w-0 rounded-[3px] px-1 py-1 transition-all duration-200 ${TIER_CELL[slot.tier]} ${TIER_HOVER[slot.tier]}`}
        >
          {slot.filled ? <CellBadges slot={slot} /> : null}
        </span>
      ))}
    </div>
  );
}
