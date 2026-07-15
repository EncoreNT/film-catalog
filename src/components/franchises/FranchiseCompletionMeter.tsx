interface FranchiseCompletionMeterProps {
  filled: number;
  total: number;
  className?: string;
  size?: "sm" | "md" | "lg";
  /**
   * "full"  — счётчик + laser-полоса + проценты (отдельный блок).
   * "inline" — компактно в одну строку (для hero).
   */
  variant?: "full" | "inline";
}

function pct(filled: number, total: number): number {
  if (!total) return 0;
  return Math.min(100, Math.round((filled / total) * 100));
}

/**
 * Completion readout in the project line/glow language — a hairline rest
 * track + a gold laser fill with soft glow. No filled pill / rounded-full bar.
 */
function LaserTrack({
  filled,
  total,
  share,
  className = "",
}: {
  filled: number;
  total: number;
  share: number;
  className?: string;
}) {
  return (
    <div
      className={`relative h-[2px] overflow-visible ${className}`}
      role="progressbar"
      aria-valuenow={filled}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`Собрано ${filled} из ${total}`}
    >
      {/* Rest hairline */}
      <span
        className="absolute inset-0 bg-border"
        aria-hidden
      />
      {/* Gold laser fill — transparent ends so it reads as light, not a paint fill */}
      <span
        className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${share}%` }}
        aria-hidden
      >
        <span
          className="absolute inset-0 bg-gradient-to-r from-accent/40 via-accent-bright to-accent shadow-[0_0_10px_var(--accent-glow),0_0_4px_rgba(232,176,90,0.55)]"
        />
        {/* Leading tip bloom */}
        {share > 0 ? (
          <span
            className="absolute top-1/2 right-0 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-accent-bright shadow-[0_0_8px_var(--accent-glow)]"
          />
        ) : null}
      </span>
    </div>
  );
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
        <span className="font-mono-tech shrink-0 text-[0.75rem] tabular-nums">
          <span className="text-accent-bright">{filled}</span>
          <span className="text-faint"> / {total}</span>
        </span>
        <LaserTrack
          filled={filled}
          total={total}
          share={share}
          className="min-w-[5rem] flex-1"
        />
        <span className="font-mono-tech shrink-0 text-[0.65rem] tabular-nums text-muted">
          {share}%
        </span>
      </div>
    );
  }

  const textSize =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`font-display font-bold tabular-nums text-text ${textSize}`}
        >
          {filled}
          <span className="font-mono-tech text-faint"> / {total}</span>
        </span>
        <span className="font-mono-tech text-xs tabular-nums text-muted">
          {share}%
        </span>
      </div>
      <LaserTrack filled={filled} total={total} share={share} />
    </div>
  );
}
