interface FranchiseCompletionMeterProps {
  filled: number;
  total: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  /**
   * "full"  — крупный счётчик + полоса + проценты (для отдельного блока).
   * "inline" — компактно: «1 / 5» и тонкая полоса в одну строку (для hero).
   */
  variant?: "full" | "inline";
}

function pct(filled: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((filled / total) * 100));
}

export function FranchiseCompletionMeter({
  filled,
  total,
  className = "",
  size = "md",
  variant = "full",
}: FranchiseCompletionMeterProps) {
  const share = pct(filled, total);

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="font-display text-base font-bold tabular-nums text-text">
          {filled}
          <span className="font-mono-tech text-faint"> / {total}</span>
        </span>
        <div
          className="h-1.5 min-w-[5rem] flex-1 overflow-hidden rounded-full bg-bg-elevated"
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Собрано ${filled} из ${total}`}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-ember to-accent transition-all duration-500"
            style={{ width: `${share}%` }}
          />
        </div>
        <span className="font-mono-tech text-xs text-muted tabular-nums">
          {share}%
        </span>
      </div>
    );
  }

  const textSize =
    size === "lg"
      ? "text-2xl"
      : size === "sm"
        ? "text-sm"
        : "text-lg";

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={`font-display font-bold tabular-nums text-text ${textSize}`}>
          {filled}
          <span className="font-mono-tech text-faint"> / {total}</span>
        </span>
        <span className="font-mono-tech text-xs text-muted tabular-nums">
          {share}%
        </span>
      </div>
      <div
        className="film-perfs mt-2 h-2 w-full overflow-hidden rounded-full bg-bg-elevated"
        role="progressbar"
        aria-valuenow={filled}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Собрано ${filled} из ${total}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-ember to-accent transition-all duration-500"
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  );
}
