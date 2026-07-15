"use client";

import { CalendarClock, Film } from "lucide-react";
import {
  franchiseSlotAriaLabel,
  franchiseSlotFutureFooter,
  FRANCHISE_SLOT_MISSING_FOOTER,
} from "@/lib/franchises/franchise-slot-copy";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import {
  tierLaserTopClass,
  TIER_BOTTOM_SCRIM,
} from "@/lib/media/tier-presentation";

interface FranchisePlaceholderProps {
  slotIndex: number;
  titleHint?: string | null;
  yearHint?: number | null;
  /** Announced release without a known calendar year. */
  isAnnounced?: boolean;
  /** Unreleased slot — no link affordance. */
  isFuture?: boolean;
  /** When provided and not future, the card opens the movie picker. */
  onPick?: () => void;
}

/**
 * Empty franchise slot — framed poster waiting to be filled.
 * - **missing** (ember): can link a catalog film now.
 * - **future** (neural): release year not reached; edit year in franchise editor if wrong.
 */
export function FranchisePlaceholder({
  slotIndex,
  titleHint,
  yearHint,
  isAnnounced = false,
  isFuture = false,
  onPick,
}: FranchisePlaceholderProps) {
  const label = titleHint ?? `Фильм ${slotIndex + 1}`;
  const interactive = !isFuture && onPick != null;

  const inner = (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] bg-bg-base ${
        isFuture ? "glow-poster-future-rest" : "glow-poster-ember-rest"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background: isFuture
            ? "radial-gradient(ellipse 75% 55% at 50% 38%, rgba(139,92,246,0.14) 0%, transparent 70%)"
            : "radial-gradient(ellipse 75% 55% at 50% 38%, var(--ember-glow) 0%, transparent 70%)",
        }}
      />
      <div
        className="film-perfs-y pointer-events-none absolute inset-y-0 left-0 w-3 opacity-25"
        aria-hidden
      />
      <div
        className="film-perfs-y pointer-events-none absolute inset-y-0 right-0 w-3 opacity-25"
        aria-hidden
      />
      <div
        className={
          isFuture
            ? "pointer-events-none absolute inset-x-[12%] top-0 z-[4] h-[1.5px] bg-gradient-to-r from-transparent via-neural/50 to-transparent opacity-60"
            : tierLaserTopClass("ember")
        }
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        aria-hidden
        style={{ background: TIER_BOTTOM_SCRIM.placeholder }}
      />

      <div className="relative flex h-full flex-col items-center justify-center gap-3 px-5 py-6 text-center">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-full border bg-bg-deep/40 ${
            isFuture
              ? "border-neural/30 text-neural/70"
              : "border-ember/25 text-ember/60"
          }`}
        >
          {isFuture ? (
            <CalendarClock className="h-5 w-5" aria-hidden />
          ) : (
            <Film className="h-5 w-5" aria-hidden />
          )}
        </span>
        {titleHint || yearHint ? (
          <>
            <p className="font-display text-base font-semibold leading-tight text-text">
              {titleHint ?? label}
            </p>
            {yearHint ? (
              <p
                className={`font-mono-tech text-xs ${
                  isFuture ? "text-neural-bright/85" : "text-ember-bright/80"
                }`}
              >
                {yearHint}
              </p>
            ) : null}
          </>
        ) : (
          <p className="font-display text-sm font-semibold leading-tight text-muted">
            {label}
          </p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 p-2.5">
        <div className="flex items-center gap-2 font-mono-tech text-[0.55rem] uppercase tracking-[0.14em]">
          <span
            className={`h-px flex-1 ${isFuture ? "bg-neural/25" : "bg-ember/30"}`}
            aria-hidden
          />
          <span className={isFuture ? "text-neural/80" : "text-ember-bright/80"}>
            {isFuture ? franchiseSlotFutureFooter(yearHint, isAnnounced) : FRANCHISE_SLOT_MISSING_FOOTER}
          </span>
          <span
            className={`h-px flex-1 ${isFuture ? "bg-neural/25" : "bg-ember/30"}`}
            aria-hidden
          />
        </div>
      </div>
    </div>
  );

  const articleClass = `group relative rounded-[var(--radius)] ${
    isFuture ? "glow-card-future" : "glow-card-ember"
  } transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
    interactive ? "hover:z-10 hover:-translate-y-1 hover:scale-[1.03]" : ""
  }`;

  if (interactive) {
    return (
      <article className={articleClass}>
        <button
          type="button"
          onClick={onPick}
          aria-label={
            titleHint
              ? `Привязать фильм к слоту «${titleHint}»`
              : `Привязать фильм к слоту ${slotIndex + 1}`
          }
          className="focus-ring block w-full text-left"
        >
          <LaserCardFrame tier={null}>{inner}</LaserCardFrame>
        </button>
      </article>
    );
  }

  return (
    <article
      className={articleClass}
      aria-label={franchiseSlotAriaLabel(isFuture, titleHint ?? label, yearHint)}
    >
      <LaserCardFrame tier={null}>{inner}</LaserCardFrame>
    </article>
  );
}
