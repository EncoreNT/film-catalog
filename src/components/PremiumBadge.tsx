import type { ReactNode } from "react";

interface PremiumBadgeProps {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  /** Подпись под бейджем — напр. «RU · главная». */
  tag?: string;
  size?: "default" | "sm";
}

export function PremiumBadge({
  icon,
  label,
  sublabel,
  tag,
  size = "default",
}: PremiumBadgeProps) {
  const compact = size === "sm";

  return (
    <span
      className={`relative inline-flex flex-col ${compact ? "gap-0.5" : "gap-1.5"}`}
    >
      {/* Dark "ticket stub" — a cinema accent that reads on both poster and paper. */}
      <span
        className={`relative inline-flex items-center overflow-hidden rounded-xl border border-screen-accent/55 bg-scrim/85 backdrop-blur-sm transition-transform duration-200 hover:scale-[1.02] ${
          compact
            ? "gap-1.5 px-2 py-1 shadow-[0_0_16px_var(--screen-accent-glow)]"
            : "gap-2.5 px-4 py-2.5 shadow-[0_0_28px_var(--screen-accent-glow)]"
        }`}
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-50"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 120% at 12% 50%, var(--screen-accent-soft) 0%, transparent 70%)",
          }}
        />
        <span
          className={`relative flex shrink-0 items-center justify-center rounded-md bg-screen-accent/20 text-screen-accent-bright ${
            compact ? "h-4 w-4" : "h-6 w-6"
          }`}
          aria-hidden
        >
          {icon}
        </span>
        <span className="relative flex flex-col leading-none">
          <span
            className={`font-display font-semibold tracking-tight text-screen-accent-bright ${
              compact ? "text-xs" : "text-lg"
            }`}
          >
            {label}
          </span>
          {sublabel && !compact ? (
            <span className="font-mono mt-1 text-[0.65rem] tracking-wider text-screen-accent/80">
              {sublabel}
            </span>
          ) : null}
        </span>
      </span>
      {tag && !compact ? (
        <span className="font-mono-tech ml-1 text-[0.65rem] text-muted">
          {tag}
        </span>
      ) : null}
    </span>
  );
}
