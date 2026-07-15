"use client";

import { Film, Link2 } from "lucide-react";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import {
  tierLaserTopClass,
  TIER_BOTTOM_SCRIM,
} from "@/lib/media/tier-presentation";

interface FranchisePlaceholderProps {
  slotIndex: number;
  titleHint?: string | null;
  yearHint?: number | null;
  /** When provided, the card becomes a button that opens the movie picker. */
  onPick?: () => void;
}

/**
 * Empty franchise slot — a framed poster waiting to be filled, not a broken
 * image. Speaks the same poster language as MovieCard (LaserCardFrame +
 * aspect-[2/3] + tier-laser-top + inset glow) but in the warm ember "missing"
 * tone (see globals.css .glow-card-ember / .tier-laser-top-ember), so empty
 * slots read as a distinct, gentle state rather than a dashed placeholder.
 */
export function FranchisePlaceholder({
  slotIndex,
  titleHint,
  yearHint,
  onPick,
}: FranchisePlaceholderProps) {
  const label = titleHint ?? `Фильм ${slotIndex + 1}`;
  const interactive = onPick != null;

  const inner = (
    <div className="glow-poster-ember-rest relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] bg-bg-base">
      {/* Empty-screen ember glow — an unlit projector, not a missing image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 38%, var(--ember-glow) 0%, transparent 70%)",
        }}
      />
      {/* Film-strip perforations on both sides — the empty-cell frame */}
      <div
        className="film-perfs-y pointer-events-none absolute inset-y-0 left-0 w-3 opacity-25"
        aria-hidden
      />
      <div
        className="film-perfs-y pointer-events-none absolute inset-y-0 right-0 w-3 opacity-25"
        aria-hidden
      />
      <div className={tierLaserTopClass("ember")} aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-[3]"
        aria-hidden
        style={{ background: TIER_BOTTOM_SCRIM.placeholder }}
      />

      {/* Center glyph + hint */}
      <div className="relative flex h-full flex-col items-center justify-center gap-3 px-5 py-6 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ember/25 bg-bg-deep/40 text-ember/60">
          <Film className="h-5 w-5" aria-hidden />
        </span>
        {titleHint ? (
          <>
            <p className="font-display text-base font-semibold leading-tight text-text">
              {titleHint}
            </p>
            {yearHint ? (
              <p className="font-mono-tech text-xs text-ember-bright/80">
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

      {/* Bottom status — a line/glow caption, not a filled box */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-2.5">
        <div className="flex items-center gap-2 font-mono-tech text-[0.55rem] uppercase tracking-[0.14em]">
          <span className="h-px flex-1 bg-ember/30" aria-hidden />
          <span className="text-ember-bright/80">пока не в архиве</span>
          <span className="h-px flex-1 bg-ember/30" aria-hidden />
        </div>
      </div>

      {/* Hover affordance — "привязать фильм" — only when interactive */}
      {interactive ? (
        <span
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-bg-deep/80 opacity-0 transition-opacity duration-200 group-hover/laser:opacity-100"
          aria-hidden
        >
          <span className="font-mono-tech inline-flex items-center gap-1.5 rounded-full border border-accent/45 bg-bg-deep/90 px-3 py-1.5 text-[0.6rem] text-accent">
            <Link2 className="h-3 w-3" />
            привязать фильм
          </span>
        </span>
      ) : null}
    </div>
  );

  const articleClass = `group relative rounded-[var(--radius)] glow-card-ember transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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
    <article className={articleClass} aria-label={`Пока не в архиве: ${label}`}>
      <LaserCardFrame tier={null}>{inner}</LaserCardFrame>
    </article>
  );
}
