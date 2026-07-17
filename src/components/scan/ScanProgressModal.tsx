"use client";

import { X } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { NativeDialog } from "@/components/primitives/NativeDialog";
import { MachinedCard } from "@/components/primitives/MachinedCard";

export interface ScanProgress {
  index: number;
  total: number;
  fileName: string;
}

interface ScanProgressModalProps {
  scanning: boolean;
  cancelled: boolean;
  progress: ScanProgress | null;
  pct: number;
  onCancel: () => void;
  onClose: () => void;
}

export function ScanProgressModal({
  scanning,
  cancelled,
  progress,
  pct,
  onCancel,
  onClose,
}: ScanProgressModalProps) {
  const open = scanning || cancelled;
  const total = progress?.total ?? 0;
  const index = progress?.index ?? 0;

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      preventCancel={scanning}
      zIndex={50}
      ariaLabel="Сканирование"
      className="fixed inset-0 m-auto w-[min(100%-2rem,28rem)] max-h-[90dvh] overflow-visible rounded-[var(--radius)] border-0 bg-transparent p-0 text-text backdrop:bg-bg-deep/70 backdrop:backdrop-blur-sm open:animate-in"
    >
      <MachinedCard bodyClassName="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {cancelled ? "Сканирование отменено" : "Сканирование…"}
            </h2>
            <p className="font-mono-tech mt-1 text-xs text-muted">
              {total > 0 ? `файл ${index} из ${total}` : "подсчёт файлов…"}
            </p>
          </div>
          {cancelled ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="focus-ring rounded-md p-1.5 text-muted transition-colors hover:text-text"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ width: `${cancelled ? 100 : pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-mono-tech tabular-nums">{pct}%</span>
            <span className="font-mono-tech">
              {cancelled ? "остановлено" : "в процессе"}
            </span>
          </div>
        </div>

        {progress?.fileName ? (
          <p
            className="truncate rounded-[12px] border border-border bg-bg-surface px-3 py-2 font-mono text-xs text-muted"
            title={progress.fileName}
          >
            {progress.fileName}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          {cancelled ? (
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          ) : (
            <Button variant="danger" onClick={onCancel} disabled={!scanning}>
              Отмена
            </Button>
          )}
        </div>
      </MachinedCard>
    </NativeDialog>
  );
}
