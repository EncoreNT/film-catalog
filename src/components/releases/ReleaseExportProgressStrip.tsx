"use client";

import { HardDriveDownload, LoaderCircle } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import {
  EXPORT_STATUS_META,
  exportSizeHint,
  exportSpeedLabel,
} from "@/lib/releases/export-display";

export function ReleaseExportProgressStrip({
  job,
  loading,
  onOpen,
  onCancel,
}: {
  job: SerializedExport;
  loading: boolean;
  onOpen: () => void;
  onCancel: () => void;
}) {
  const meta = EXPORT_STATUS_META[job.status];
  const progress =
    job.progressPercent != null ? Math.round(job.progressPercent) : null;
  const speed = exportSpeedLabel(job.progressSpeed);
  const sizeHint = exportSizeHint(job);

  return (
    <div
      className="border-b border-accent/20 bg-accent/[0.06] px-3 py-2.5 sm:px-5"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
          <span className="mt-0.5 shrink-0 text-accent sm:mt-0" aria-hidden>
            {job.status === "RUNNING" ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <HardDriveDownload className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`font-mono-tech rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
              {sizeHint ? (
                <span className="font-mono-tech text-[10px] text-faint">{sizeHint}</span>
              ) : null}
            </div>
            <p className="truncate font-mono-tech text-xs text-muted">
              {job.targetPathDisplay}
            </p>
            {job.status === "QUEUED" ? (
              <p className="text-xs text-muted">Ожидание в очереди worker…</p>
            ) : null}
            {job.status === "RUNNING" && progress != null ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="truncate text-muted">
                    {job.progressMessage ?? "Копирование…"}
                    {speed ? ` · ${speed}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-accent">{progress}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-bg-deep/80 ring-1 ring-inset ring-border/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent-bright transition-[width] duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 pl-6 sm:pl-0">
          <Button
            variant="ghost"
            className="min-h-9 px-3 py-1.5 text-xs"
            onClick={onOpen}
            disabled={loading}
          >
            Подробнее
          </Button>
          <Button
            variant="secondary"
            className="min-h-9 px-3 py-1.5 text-xs"
            loading={loading}
            onClick={() => void onCancel()}
          >
            Отменить
          </Button>
        </div>
      </div>
    </div>
  );
}
