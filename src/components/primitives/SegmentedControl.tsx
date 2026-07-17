"use client";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
    title?: string;
  }[];
  ariaLabel?: string;
  /** Stretch to container width (default). */
  fullWidth?: boolean;
  size?: "default" | "compact";
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  fullWidth = true,
  size = "default",
}: SegmentedControlProps<T>) {
  const compact = size === "compact";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex gap-1 rounded-[var(--radius-sm)] border border-border bg-bg-elevated p-1 ${
        fullWidth ? "w-full" : "inline-flex w-auto"
      }`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`focus-ring flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] font-medium transition-all duration-200 ${
              fullWidth ? "min-h-10 flex-1" : compact ? "min-h-8 px-3" : "min-h-9 px-4"
            } ${compact ? "py-1.5 text-xs" : "px-3 py-2 text-sm"} ${
              active
                ? "bg-accent text-bg-deep shadow-[0_0_16px_var(--accent-glow)]"
                : "text-muted hover:text-text"
            } ${opt.className ?? ""}`}
          >
            {opt.icon}
            <span className="min-w-0">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
