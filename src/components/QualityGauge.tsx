"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

export interface QualityGaugeProps {
  count: number;
  total: number;
  label: string;
  caption?: string;
  icon: ReactNode;
  active?: boolean;
  elite?: boolean;
  onClick?: () => void;
  /** When false, renders as a static panel (no button). */
  interactive?: boolean;
  /** Compact variant for embedding inside hero blocks. */
  size?: "sm" | "md";
}

function pct(count: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((count / total) * 100));
}

export function QualityGauge({
  count,
  total,
  label,
  caption,
  icon,
  active = false,
  elite = false,
  onClick,
  interactive = true,
  size = "md",
}: QualityGaugeProps) {
  const share = pct(count, total);
  const isSm = size === "sm";

  const className = `group relative flex ${isSm ? "min-h-0 gap-2 p-2" : "min-h-[5.5rem] gap-3 p-3"} items-center overflow-hidden rounded-[var(--radius)] border text-left transition-all duration-200 ${
    interactive ? "focus-ring cursor-pointer" : ""
  } ${
    active
      ? elite
        ? "border-accent/70 bg-gradient-to-br from-accent/12 to-transparent shadow-[0_0_28px_var(--accent-glow)] ring-1 ring-accent/60"
        : "border-accent/55 bg-bg-surface shadow-[0_0_28px_var(--accent-glow)] ring-1 ring-accent/40"
      : "border-border bg-bg-surface hover:border-accent/40 hover:bg-bg-surface-hover"
  }`;

  const inner = (
    <>
      <span
        className="pointer-events-none absolute inset-0 opacity-60"
        aria-hidden
        style={{
          background: active
            ? "radial-gradient(ellipse 90% 140% at 10% 0%, var(--accent-soft) 0%, transparent 70%)"
            : "radial-gradient(ellipse 80% 120% at 0% 0%, var(--accent-soft) 0%, transparent 70%)",
        }}
      />
      <span
        className={`relative flex ${isSm ? "h-7 w-7" : "h-9 w-9"} shrink-0 items-center justify-center rounded-lg transition-colors ${
          active
            ? "bg-accent/25 text-accent-bright"
            : "bg-accent/15 text-accent"
        }`}
        aria-hidden
      >
        {isSm ? <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span> : icon}
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline gap-1">
          <span
            className={`font-display ${isSm ? "text-lg" : "text-2xl"} font-bold tabular-nums leading-none text-text transition-colors`}
            style={active ? { color: "var(--accent-bright)" } : undefined}
          >
            {count}
          </span>
          <span className="font-mono-tech text-[0.6rem] text-faint">
            / {total}
          </span>
        </span>
        <span
          className={`font-display ${isSm ? "mt-0 text-xs" : "mt-0.5 text-sm"} font-semibold leading-tight text-text ${
            elite ? "whitespace-normal" : "truncate"
          }`}
        >
          {label}
        </span>
        {caption && !isSm ? (
          <span className="font-mono-tech mt-0.5 truncate text-[0.6rem] text-muted">
            {caption}
          </span>
        ) : null}
        <span
          className={`${isSm ? "mt-1" : "mt-1.5"} h-0.5 w-full overflow-hidden rounded-full bg-border`}
          aria-hidden
        >
          <span
            className="block h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${share}%` }}
          />
        </span>
      </span>
      {elite ? (
        <span
          className={`font-mono-tech absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.55rem] transition-colors ${
            active
              ? "border-accent/50 bg-bg-deep/70 text-accent-bright"
              : "border-border bg-bg-deep/70 text-muted"
          }`}
          aria-hidden
        >
          <Sparkles className="h-2.5 w-2.5" />
          3/3
        </span>
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div
        className={className}
        title={`${label}: ${count}${caption ? ` ${caption}` : ""} · ${share}%`}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={`${label}: ${count}${caption ? ` ${caption}` : ""} · ${share}%`}
      className={className}
    >
      {inner}
    </button>
  );
}
