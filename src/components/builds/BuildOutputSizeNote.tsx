import type { BuildSizeEstimate } from "@/lib/builds/build-output-size";
import {
  buildOutputSizeHint,
  formatBuildOutputSizeLabel,
} from "@/lib/builds/build-output-size";

export function BuildOutputSizeNote({
  estimate,
  compact = false,
}: {
  estimate: BuildSizeEstimate | null;
  compact?: boolean;
}) {
  const label = formatBuildOutputSizeLabel(estimate);
  if (!label) return null;

  const hint = buildOutputSizeHint(estimate);
  const title = estimate?.actual ? "Размер файла" : "Примерный размер";

  if (compact) {
    return (
      <p className="text-sm text-muted">
        {title}: <span className="font-medium text-text">{label}</span>
        {hint ? <span className="text-faint"> · {hint}</span> : null}
      </p>
    );
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-border/70 bg-bg-deep/35 px-3 py-2.5">
      <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">
        {title}
      </p>
      <p className="mt-1 font-display text-lg font-semibold tabular-nums text-text">
        {label}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
