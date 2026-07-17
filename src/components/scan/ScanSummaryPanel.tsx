import type { ScanSummary } from "@/lib/media/scanner";

interface ScanSummaryPanelProps {
  summary: ScanSummary;
  cancelled: boolean;
}

const METRICS: { key: keyof ScanSummary; label: string; accent?: boolean }[] = [
  { key: "found", label: "найдено" },
  { key: "newDrafts", label: "новых", accent: true },
  { key: "updated", label: "обновлено" },
  { key: "moved", label: "перемещено" },
  { key: "skipped", label: "пропущено" },
];

export function ScanSummaryPanel({ summary, cancelled }: ScanSummaryPanelProps) {
  return (
    <div
      className="rounded-[var(--radius-sm)] border border-border bg-bg-elevated/60 px-3 py-2.5"
      role="status"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono-tech text-xs text-muted">
          {cancelled ? "скан остановлен" : "результат"}
        </span>
        {METRICS.map(({ key, label, accent }, index) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            {index > 0 ? (
              <span className="text-faint" aria-hidden>
                /
              </span>
            ) : null}
            <span className="font-mono-tech text-xs text-muted">{label}</span>
            <span
              className={`font-mono text-sm tabular-nums ${
                accent ? "text-accent" : "text-text"
              }`}
            >
              {summary[key] as number}
            </span>
          </span>
        ))}
      </div>
      {summary.errors.length > 0 ? (
        <ul className="mt-2 space-y-0.5 border-t border-border pt-2 text-xs text-muted">
          {summary.errors.map((entry) => (
            <li key={entry} className="text-danger">
              {entry}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
