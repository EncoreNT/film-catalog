import { AlertTriangle, LoaderCircle } from "lucide-react";
import { formatArchiveTotalSize } from "@/lib/shared/format";

export function DiskSpaceFeedback({
  targetDirRuntime,
  loading,
  statusLine,
  shortfall,
  freeBytes,
}: {
  targetDirRuntime: string;
  loading: boolean;
  statusLine: string | null;
  shortfall: string | null;
  freeBytes: number | null;
}) {
  if (!targetDirRuntime.trim()) return null;

  return (
    <div className="space-y-2 pt-1.5">
      <div className="min-h-[1.125rem]" aria-live="polite">
        {!shortfall ? (
          <p className="text-[11px] leading-snug text-faint">
            {loading ? (
              <span className="inline-flex items-center gap-1.5 text-muted/75">
                <LoaderCircle className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
                Проверяем место на диске…
              </span>
            ) : statusLine ? (
              statusLine
            ) : (
              <span className="text-muted/50">Место на диске не удалось проверить</span>
            )}
          </p>
        ) : null}
      </div>

      {shortfall ? (
        <div
          className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-ember/35 bg-ember/[0.08] px-4 py-3.5"
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-ember-bright"
            strokeWidth={1.5}
            aria-hidden
          />
          <div className="min-w-0 space-y-1.5">
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-ember-bright">
              мало места на диске
            </p>
            <p className="text-sm leading-relaxed text-text">
              Не хватит ≈ {shortfall}
              {freeBytes != null
                ? `. Свободно ${formatArchiveTotalSize(freeBytes)}`
                : "."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
