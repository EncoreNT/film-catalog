import type { ReactNode } from "react";

interface PremiumBadgeProps {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  /** Подпись под бейджем — напр. «RU · главная». */
  tag?: string;
}

export function PremiumBadge({
  icon,
  label,
  sublabel,
  tag,
}: PremiumBadgeProps) {
  return (
    <span className="relative inline-flex flex-col gap-1.5">
      <span
        className="relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl border border-accent/60 bg-accent/15 px-4 py-2.5 shadow-[0_0_28px_var(--accent-glow)] backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02]"
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 12% 50%, var(--accent-soft) 0%, transparent 70%)",
          }}
        />
        <span
          className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/20 text-accent-bright"
          aria-hidden
        >
          {icon}
        </span>
        <span className="relative flex flex-col leading-none">
          <span className="font-display text-lg font-semibold tracking-tight text-accent-bright">
            {label}
          </span>
          {sublabel ? (
            <span className="font-mono mt-1 text-[0.65rem] tracking-wider text-accent/80">
              {sublabel}
            </span>
          ) : null}
        </span>
      </span>
      {tag ? (
        <span className="font-mono-tech ml-1 text-[0.65rem] text-muted">
          {tag}
        </span>
      ) : null}
    </span>
  );
}
