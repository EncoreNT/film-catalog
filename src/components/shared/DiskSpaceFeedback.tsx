"use client";

import { AlertTriangle, HardDrive, LoaderCircle } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { formatArchiveTotalSize } from "@/lib/shared/format";
import type { UnmountedWslDrive } from "@/lib/shared/disk-space-types";

export function DiskSpaceFeedback({
  targetDirRuntime,
  loading,
  statusLine,
  shortfall,
  freeBytes,
  unmountedDrive,
  mounting,
  mountError,
  onMountDrive,
  disabled,
}: {
  targetDirRuntime: string;
  loading: boolean;
  statusLine: string | null;
  shortfall: string | null;
  freeBytes: number | null;
  unmountedDrive?: UnmountedWslDrive | null;
  mounting?: boolean;
  mountError?: string | null;
  onMountDrive?: () => void;
  disabled?: boolean;
}) {
  if (!targetDirRuntime.trim()) return null;

  return (
    <div className="space-y-2 pt-1.5">
      <div className="min-h-[1.125rem]" aria-live="polite">
        {!shortfall && !unmountedDrive ? (
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

      {unmountedDrive ? (
        <div
          className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-danger/35 bg-danger/[0.08] px-4 py-3.5"
          role="alert"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-danger"
            strokeWidth={1.5}
            aria-hidden
          />
          <div className="min-w-0 space-y-2.5">
            <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-danger">
              диск не смонтирован
            </p>
            <p className="text-sm leading-relaxed text-text">
              Диск {unmountedDrive.letter}: не смонтирован в WSL. Подключите его,
              иначе файлы попадут на виртуальный диск Linux, а не на {unmountedDrive.letter}:.
            </p>
            {mountError ? (
              <p className="text-sm leading-relaxed text-danger">{mountError}</p>
            ) : null}
            {onMountDrive ? (
              <Button
                type="button"
                variant="secondary"
                loading={mounting}
                onClick={onMountDrive}
                disabled={disabled}
                className="!min-h-9 !px-3 font-mono-tech text-[11px] uppercase tracking-[0.14em]"
              >
                <HardDrive className="h-3.5 w-3.5" aria-hidden />
                Подключить диск {unmountedDrive.letter}:
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {shortfall && !unmountedDrive ? (
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
