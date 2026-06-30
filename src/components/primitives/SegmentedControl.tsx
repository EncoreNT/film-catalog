"use client";

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  ariaLabel?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex w-full gap-1 rounded-[var(--radius-sm)] border border-border bg-bg-elevated p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`focus-ring flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-all duration-200 ${
              active
                ? "bg-accent text-on-accent shadow-[0_0_16px_var(--accent-glow)]"
                : "text-muted hover:text-text"
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
