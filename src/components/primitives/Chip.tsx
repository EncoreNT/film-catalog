import { type ButtonHTMLAttributes } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
  size?: "md" | "sm";
}

export function Chip({
  active,
  count,
  size = "md",
  className = "",
  children,
  ...props
}: ChipProps) {
  const sizing =
    size === "sm"
      ? "min-h-8 gap-1.5 px-2.5 leading-none"
      : "min-h-11 gap-2 px-3 py-2";

  return (
    <button
      type="button"
      className={`focus-ring font-mono-tech inline-flex cursor-pointer items-center rounded-full border transition-all duration-200 active:scale-[0.97] ${
        active
          ? "border-accent/45 bg-accent/12 text-accent ring-1 ring-inset ring-accent/30"
          : "border-border bg-bg-surface text-muted hover:border-accent/30 hover:bg-bg-surface-hover hover:text-text"
      } ${sizing} ${className}`}
      aria-pressed={active}
      {...props}
    >
      <span>{children}</span>
      {count != null ? (
        size === "sm" ? (
          <span
            className={`tabular-nums text-[0.58rem] ${
              active ? "text-accent/75" : "text-faint"
            }`}
          >
            {count}
          </span>
        ) : (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[0.65rem] ${
              active ? "bg-accent/20 text-accent" : "bg-bg-elevated text-muted"
            }`}
          >
            {count}
          </span>
        )
      ) : null}
    </button>
  );
}
