import type { ReactNode } from "react";

interface InfoHintProps {
  text: ReactNode;
  label?: string;
}

/**
 * Inline "?" affordance that reveals a small tooltip on hover or keyboard focus.
 * Pure CSS — no client JS or portal needed, so it works inside scroll containers
 * (e.g. the Modal body) without being clipped by viewport positioning.
 */
export function InfoHint({ text, label }: InfoHintProps) {
  const ariaLabel = label ? `Подсказка: ${label}` : "Подсказка";
  return (
    <span className="info-hint group relative inline-flex shrink-0 items-center">
      <button
        type="button"
        tabIndex={0}
        aria-label={ariaLabel}
        className="focus-ring flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border-strong text-[0.6rem] leading-none text-muted transition-colors hover:border-accent/60 hover:text-accent"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="surface-elevated pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 px-3 py-2 text-left text-xs font-normal leading-snug text-text opacity-0 shadow-2xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{
          textTransform: "none",
          letterSpacing: "normal",
        }}
      >
        {text}
      </span>
    </span>
  );
}
