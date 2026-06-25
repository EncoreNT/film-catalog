import { type ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
}

export function Chip({
  active,
  count,
  className = "",
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      className={`focus-ring font-mono-tech inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 py-2 transition-all duration-200 ${
        active
          ? "border-accent/50 bg-accent/10 text-accent"
          : "border-border bg-bg-surface text-muted hover:border-accent/30 hover:text-text"
      } ${className}`}
      aria-pressed={active}
      {...props}
    >
      <span>{children}</span>
      {count != null ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[0.65rem] ${
            active ? "bg-accent/20 text-accent" : "bg-bg-elevated text-muted"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
