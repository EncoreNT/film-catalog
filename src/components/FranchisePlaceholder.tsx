import { Film, Link2 } from "lucide-react";

interface FranchisePlaceholderProps {
  slotIndex: number;
  titleHint?: string | null;
  yearHint?: number | null;
  /** When provided, the card becomes a button that opens the movie picker. */
  onPick?: () => void;
}

export function FranchisePlaceholder({
  slotIndex,
  titleHint,
  yearHint,
  onPick,
}: FranchisePlaceholderProps) {
  const label = titleHint ?? `Фильм ${slotIndex + 1}`;
  const interactive = onPick != null;

  const content = (
    <>
      {/* Film-strip perforations on both sides — the "empty cell" frame */}
      <div
        className="film-perfs-y pointer-events-none absolute inset-y-0 left-0 w-3 opacity-30"
        aria-hidden
      />
      <div
        className="film-perfs-y pointer-events-none absolute inset-y-0 right-0 w-3 opacity-30"
        aria-hidden
      />

      {/* Soft projector glow — an empty screen waiting to be lit, not a broken image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 75% 55% at 50% 38%, var(--ember-glow) 0%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center gap-2.5 px-5 py-6 text-center">
        {titleHint ? (
          <>
            <p className="font-display text-base font-semibold leading-tight text-text">
              {titleHint}
            </p>
            {yearHint ? (
              <p className="font-mono-tech text-xs text-accent/80">{yearHint}</p>
            ) : null}
          </>
        ) : (
          <>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ember/25 bg-bg-surface text-ember/70">
              <Film className="h-5 w-5" aria-hidden />
            </span>
            <p className="font-display text-sm font-semibold leading-tight text-muted">
              {label}
            </p>
          </>
        )}
      </div>

      <div className="relative border-t border-ember/20 bg-ember/5 px-3 py-2.5 text-center">
        <p className="font-mono-tech text-[0.65rem] text-ember/80">
          пока не в архиве
        </p>
      </div>

      {/* Hover affordance — "привязать фильм" — only when interactive */}
      {interactive ? (
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-bg-base/85 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          aria-hidden
        >
          <span className="font-mono-tech inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-bg-elevated px-3 py-1.5 text-[0.65rem] text-accent">
            <Link2 className="h-3 w-3" />
            привязать фильм
          </span>
        </span>
      ) : null}
    </>
  );

  const className = `group relative flex aspect-[2/3] flex-col overflow-hidden rounded-[var(--radius)] border-2 border-dashed border-ember/40 bg-bg-surface/30 transition-all duration-200 ${
    interactive
      ? "cursor-pointer hover:border-ember/70 hover:shadow-[0_0_24px_var(--ember-glow)]"
      : ""
  }`;

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-label={
          titleHint
            ? `Привязать фильм к слоту «${titleHint}»`
            : `Привязать фильм к слоту ${slotIndex + 1}`
        }
        className={`${className} focus-ring`}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={className} aria-label={`Пока не в архиве: ${label}`}>
      {content}
    </article>
  );
}
