import { Calendar, CalendarClock, Clock, Film, Star } from "lucide-react";
import {
  FRANCHISE_SLOT_FUTURE_HEADLINE,
  FRANCHISE_SLOT_MISSING_HEADLINE,
} from "@/lib/franchises/franchise-slot-copy";
import type {
  FranchiseSlotSummary,
  SlotTier,
} from "@/lib/franchises/franchise-summary";
import { catalogTierRibbon } from "@/lib/media/spec-tags";
import type { ReleaseTier } from "@/lib/media/spec-tags";

/* Tier badge for the tooltip header — the project-wide RUBY / GOLD
   vocabulary (not "premium"/"elite"). Standard films get a quiet neutral
   pill so they still read, missing slots render no badge. */
const TIER_BADGE: Record<SlotTier, { label: string; className: string } | null> =
  {
    missing: null,
    standard: {
      label: "стандарт",
      className: "border-border-strong/70 bg-bg-surface/70 text-muted",
    },
    gold: {
      label: "GOLD",
      className:
        "border-accent/45 bg-accent/12 text-accent-bright shadow-[0_0_10px_var(--accent-glow)]",
    },
    ruby: {
      label: "RUBY",
      className:
        "border-crimson/45 bg-crimson/12 text-crimson-bright shadow-[0_0_10px_rgba(154,27,52,0.4)]",
    },
  };

function slotReleaseTier(slot: FranchiseSlotSummary): ReleaseTier {
  if (slot.tier === "ruby") return "ruby";
  if (slot.tier === "gold") return "gold";
  return null;
}

function MetaItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="font-mono-tech inline-flex items-center gap-1 text-[0.7rem] tabular-nums text-muted">
      <span className="text-accent/75">{icon}</span>
      {children}
    </span>
  );
}

function SpecCell({
  label,
  value,
  note,
  span,
  tone = "standard",
}: {
  label: string;
  value: string | null;
  note?: string | null;
  span?: string;
  tone?: "ruby" | "gold" | "standard";
}) {
  if (!value) return null;
  return (
    <div
      className={`rounded-[6px] border border-white/10 bg-gradient-to-b from-white/[0.045] to-white/[0.012] px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${SPEC_TONE[tone]} ${span ?? ""}`}
    >
      <p className="font-mono-tech text-[0.55rem] uppercase tracking-[0.12em] text-faint">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-text">
        {value}
        {note ? (
          <span className="font-mono-tech ml-1.5 text-faint">{note}</span>
        ) : null}
      </p>
    </div>
  );
}

/* Tier accent stripe on the left edge of each machined spec plate —
   ties the spec grid to the slot's tier without flooding the cells
   with color. Ruby → crimson, gold → accent, standard → neutral. */
const SPEC_TONE: Record<"ruby" | "gold" | "standard", string> = {
  ruby: "border-l-2 border-l-crimson/70",
  gold: "border-l-2 border-l-accent/70",
  standard: "border-l-2 border-l-white/15",
};

interface FranchiseSlotTooltipProps {
  slot: FranchiseSlotSummary;
}

export function FranchiseSlotTooltip({ slot }: FranchiseSlotTooltipProps) {
  const tierBadge = TIER_BADGE[slot.tier];
  const releaseTier = slotReleaseTier(slot);
  const ribbon = releaseTier ? catalogTierRibbon(releaseTier) : null;
  const position = `Фильм ${slot.index + 1}`;

  if (!slot.filled) {
    const hintTitle = slot.titleHint?.trim() || null;
    const hintYear = slot.yearHint ?? slot.year ?? null;

    if (slot.isFuture) {
      return (
        <div className="relative w-[min(18rem,calc(100vw-2rem))]">
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono-tech text-[0.6rem] uppercase tracking-[0.18em] text-faint">
                  {position}
                </p>
                <p className="font-display mt-1.5 text-base font-semibold text-text">
                  {FRANCHISE_SLOT_FUTURE_HEADLINE}
                </p>
              </div>
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-neural/35 bg-neural/[0.08] text-neural/80">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              </span>
            </div>
            {hintTitle || hintYear ? (
              <div className="rounded-md border border-neural/30 bg-neural/[0.06] px-3 py-2">
                {hintTitle ? (
                  <p className="text-sm text-text">{hintTitle}</p>
                ) : null}
                {hintYear ? (
                  <p className="font-mono-tech mt-0.5 text-xs text-neural-bright/90">
                    {hintYear}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-[min(18rem,calc(100vw-2rem))]">
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono-tech text-[0.6rem] uppercase tracking-[0.18em] text-faint">
                {position}
              </p>
              <p className="font-display mt-1.5 text-base font-semibold text-text">
                {FRANCHISE_SLOT_MISSING_HEADLINE}
              </p>
            </div>
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ember/30 bg-ember/[0.08] text-ember/70">
              <Film className="h-3.5 w-3.5" aria-hidden />
            </span>
          </div>
          {hintTitle || hintYear ? (
            <div className="rounded-md border border-ember/25 bg-ember/[0.06] px-3 py-2">
              {hintTitle ? (
                <p className="text-sm text-text">{hintTitle}</p>
              ) : null}
              {hintYear ? (
                <p className="font-mono-tech mt-0.5 text-xs text-muted">
                  {hintYear}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              Слот свободен: фильм ещё не привязан к франшизе.
            </p>
          )}
        </div>
      </div>
    );
  }

  const ribbonTone =
    releaseTier === "ruby" ? "text-crimson-bright" : "text-accent-bright";
  const specTone =
    slot.tier === "ruby" ? "ruby" : slot.tier === "gold" ? "gold" : "standard";

  return (
    <div className="relative w-[min(20rem,calc(100vw-2rem))]">
      {releaseTier ? (
        <>
          <div
            className={`tier-laser-top ${releaseTier === "ruby" ? "tier-laser-top-ruby" : "tier-laser-top-gold"}`}
            aria-hidden
          />
          <div
            className={`pointer-events-none absolute inset-0 z-[1] opacity-[0.14] mix-blend-overlay ${
              releaseTier === "ruby" ? "holo-ruby" : "holo-gold"
            }`}
            aria-hidden
          />
        </>
      ) : null}

      <div className="relative space-y-3 p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <p className="font-mono-tech text-[0.6rem] uppercase tracking-[0.18em] text-faint">
              {position}
            </p>
            {tierBadge ? (
              <span
                className={`font-mono-tech rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] ${tierBadge.className}`}
              >
                {tierBadge.label}
              </span>
            ) : null}
          </div>
          <p className="font-display text-lg font-semibold leading-snug text-text">
            {slot.title ?? "Без названия"}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {slot.year ? (
              <MetaItem icon={<Calendar className="h-3 w-3" aria-hidden />}>
                {slot.year}
              </MetaItem>
            ) : null}
            {slot.durationLabel ? (
              <MetaItem icon={<Clock className="h-3 w-3" aria-hidden />}>
                {slot.durationLabel}
              </MetaItem>
            ) : null}
            {slot.rating != null ? (
              <MetaItem
                icon={
                  <Star className="h-3 w-3 fill-accent text-accent" aria-hidden />
                }
              >
                {slot.rating}/10
              </MetaItem>
            ) : null}
          </div>
        </div>

        {slot.genreLabels.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {slot.genreLabels.map((genre) => (
              <span
                key={genre}
                className="font-mono-tech rounded-full border border-border-strong/60 bg-bg-deep/40 px-2 py-0.5 text-[0.58rem] text-muted"
              >
                {genre}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <SpecCell
            label="видео"
            value={slot.resolution}
            note={slot.resolutionPixels}
            tone={specTone}
          />
          <SpecCell label="hdr" value={slot.dynamicRange} tone={specTone} />
          <SpecCell label="кодек" value={slot.videoCodec} tone={specTone} />
          <SpecCell label="битрейт" value={slot.videoBitrate} tone={specTone} />
          <SpecCell
            label="аудио"
            value={slot.audioFull ?? slot.audio}
            span="col-span-2"
            tone={specTone}
          />
          <SpecCell
            label="релиз"
            value={slot.releaseTypeLabel}
            span="col-span-2"
            tone={specTone}
          />
        </div>

        {ribbon ? (
          <p
            className={`font-mono-tech border-t border-border/60 pt-2.5 text-[0.6rem] uppercase tracking-[0.2em] ${ribbonTone}`}
          >
            {ribbon}
          </p>
        ) : null}
      </div>
    </div>
  );
}
