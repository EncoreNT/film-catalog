import { ReleasePathBlock } from "@/components/releases/ReleasePathBlock";

export type ReleaseJobDialogAccent = "accent" | "neural";

export function ReleaseJobDialogProgress({
  accent = "accent",
  activeDescription,
  targetDisplay,
  sizeHint,
  queued,
  progressPercent,
  progressMessage,
  speed,
  defaultProgressMessage = "Копирование…",
}: {
  accent?: ReleaseJobDialogAccent;
  activeDescription: string;
  targetDisplay?: string | null;
  sizeHint?: string | null;
  queued?: boolean;
  progressPercent?: number | null;
  progressMessage?: string | null;
  speed?: string | null;
  defaultProgressMessage?: string;
}) {
  const percentClass = accent === "neural" ? "text-neural" : "text-accent";
  const barClass =
    accent === "neural"
      ? "from-neural/80 to-neural-bright"
      : "from-accent/80 to-accent-bright";

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-sm leading-relaxed text-muted">{activeDescription}</p>
      {targetDisplay ? (
        <ReleasePathBlock label="куда">{targetDisplay}</ReleasePathBlock>
      ) : null}
      {sizeHint ? (
        <p className="font-mono-tech text-xs text-faint">Размер: {sizeHint}</p>
      ) : null}
      {queued ? <p className="text-sm text-muted">Ожидание в очереди…</p> : null}
      {progressPercent != null ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="truncate text-muted">
              {progressMessage ?? defaultProgressMessage}
              {speed ? ` · ${speed}` : ""}
            </span>
            <span className={`shrink-0 tabular-nums ${percentClass}`}>
              {progressPercent}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-bg-deep/80 ring-1 ring-inset ring-border/60">
            <div
              className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ${barClass}`}
              style={{
                width: `${Math.min(100, Math.max(0, progressPercent))}%`,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
