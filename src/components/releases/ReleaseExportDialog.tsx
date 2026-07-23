"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { Button } from "@/components/primitives/Button";
import { NativeDialog } from "@/components/primitives/NativeDialog";
import { ReleaseJobDialogProgress } from "@/components/releases/ReleaseJobDialogProgress";
import { ReleasePathBlock } from "@/components/releases/ReleasePathBlock";
import { ReleaseTransferDestinationForm } from "@/components/releases/ReleaseTransferDestinationForm";
import { useTargetDiskSpace } from "@/hooks/useTargetDiskSpace";
import type { ReleaseExportJobState } from "@/hooks/useReleaseExportJob";
import { apiFetch } from "@/lib/api/client";
import {
  EXPORT_RELEASE_CONFIRM_LABEL,
  EXPORT_RELEASE_DIALOG_TITLE,
} from "@/lib/releases/export-release-ui";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import {
  EXPORT_STATUS_META,
  exportSizeHint,
  exportSpeedLabel,
  isExportTerminal,
} from "@/lib/releases/export-display";

interface ExportDryRunResponse {
  collision: boolean;
  suggestedFilename: string;
  targetPathDisplay: string;
  savedTargetDir: string | null;
  savedTargetDirDisplay: string | null;
}

export function ReleaseExportDialog({
  open,
  onClose,
  movieId,
  activeRelease,
  exportJobState,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  movieId: number;
  activeRelease: ReleaseDetailView;
  exportJobState: ReleaseExportJobState;
  onError: (message: string | null) => void;
}) {
  const [targetDir, setTargetDir] = useState("");
  const [targetDirRuntime, setTargetDirRuntime] = useState("");
  const [filename, setFilename] = useState("");
  const [collision, setCollision] = useState(false);
  const [targetDisplay, setTargetDisplay] = useState<string | null>(null);

  const fileSizeBytes = activeRelease.fileSizeBytes;

  const {
    exportJob,
    setExportJob,
    exportActive,
    loading,
    setLoading,
    loadActiveExport,
    cancelExport,
  } = exportJobState;

  const diskSpace = useTargetDiskSpace({
    enabled: open,
    targetDirRuntime,
    requiredBytes: fileSizeBytes,
  });

  useEffect(() => {
    if (!open || !exportJob) return;
    setFilename(exportJob.targetFilename);
    setTargetDisplay(exportJob.targetPathDisplay);
  }, [open, exportJob]);

  const refreshDryRun = async (nextFilename: string, nextTargetDir: string) => {
    if (!nextTargetDir.trim()) {
      setCollision(false);
      setTargetDisplay(null);
      return;
    }

    const dryRun = await apiFetch<ExportDryRunResponse>(
      `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, filename: nextFilename, targetDir: nextTargetDir }),
      },
      "Не удалось проверить путь назначения",
    );
    setCollision(dryRun.collision);
    setTargetDisplay(dryRun.targetPathDisplay);
    if (dryRun.collision) {
      setFilename(dryRun.suggestedFilename);
    }
  };

  const openPrepare = async () => {
    setLoading(true);
    onError(null);
    try {
      const active = await loadActiveExport();
      if (active) {
        setFilename(active.targetFilename);
        setTargetDisplay(active.targetPathDisplay);
        return;
      }

      const dryRun = await apiFetch<ExportDryRunResponse>(
        `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: true }),
        },
        "Не удалось подготовить экспорт",
      );
      setTargetDir(dryRun.savedTargetDirDisplay ?? "");
      setTargetDirRuntime(dryRun.savedTargetDir ?? "");
      setFilename(dryRun.suggestedFilename);
      setCollision(dryRun.collision);
      setTargetDisplay(dryRun.targetPathDisplay || null);
      diskSpace.reset();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void openPrepare();
    }
  }, [open, activeRelease.id]);

  const handleTargetDirChange = (runtimePath: string, displayPath: string) => {
    setTargetDirRuntime(runtimePath);
    setTargetDir(displayPath);
    if (runtimePath.trim()) {
      void refreshDryRun(filename, runtimePath).catch((err) => {
        onError(err instanceof Error ? err.message : "Ошибка");
      });
    } else {
      setCollision(false);
      setTargetDisplay(null);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    onError(null);
    try {
      const job = await apiFetch<SerializedExport>(
        `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename,
            targetDir: targetDirRuntime,
          }),
        },
        "Не удалось поставить экспорт в очередь",
      );
      setExportJob(job);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    onError(null);
    try {
      const next = await cancelExport();
      if (next && isExportTerminal(next.status)) {
        onClose();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!exportJob) return;
    setLoading(true);
    onError(null);
    try {
      const next = await apiFetch<SerializedExport>(
        `/api/exports/${exportJob.id}/retry`,
        { method: "POST" },
        "Не удалось повторить экспорт",
      );
      setExportJob(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    onClose();
    if (exportJob && isExportTerminal(exportJob.status) && !exportActive) {
      setExportJob(null);
    }
  };

  const exportMeta = exportJob
    ? EXPORT_STATUS_META[exportJob.status as keyof typeof EXPORT_STATUS_META]
    : null;
  const progress =
    exportJob?.progressPercent != null ? Math.round(exportJob.progressPercent) : null;
  const speed = exportSpeedLabel(exportJob?.progressSpeed);
  const busy = loading;

  const canSubmit = useMemo(
    () =>
      Boolean(
        targetDirRuntime.trim() &&
          filename.trim() &&
          !diskSpace.shortfall &&
          !diskSpace.loading,
      ),
    [targetDirRuntime, filename, diskSpace.shortfall, diskSpace.loading],
  );

  return (
    <NativeDialog
      open={open}
      onClose={closeDialog}
      preventCancel={busy && !exportActive}
      zIndex={110}
      ariaLabelledBy="export-dialog-title"
      className="confirm-dialog fixed inset-0 m-auto flex w-[min(100%-2rem,560px)] max-w-[560px] min-w-0 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="min-w-0 space-y-4 p-5">
        <div className="min-w-0">
          <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-accent">
            экспорт
          </p>
          <div className="mt-1 flex min-w-0 items-start justify-between gap-3">
            <h2
              id="export-dialog-title"
              className="min-w-0 font-display text-lg font-semibold leading-tight"
            >
              {EXPORT_RELEASE_DIALOG_TITLE}
            </h2>
            {exportMeta ? (
              <span
                className={`font-mono-tech inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${exportMeta.badgeClass}`}
              >
                {exportJob?.status === "RUNNING" ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
                ) : null}
                {exportMeta.label}
              </span>
            ) : null}
          </div>
        </div>

        {exportActive ? (
          <ReleaseJobDialogProgress
            accent="accent"
            activeDescription="Копирование идёт в фоне. Можно закрыть диалог — прогресс останется в полоске под вкладками релиза и в списке фоновых задач."
            targetDisplay={targetDisplay}
            sizeHint={exportJob ? exportSizeHint(exportJob) : null}
            queued={exportJob?.status === "QUEUED"}
            progressPercent={
              exportJob?.status === "RUNNING" ? progress : null
            }
            progressMessage={exportJob?.progressMessage}
            speed={speed}
            defaultProgressMessage="Копирование…"
          />
        ) : exportJob?.status === "FAILED" ? (
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-danger">
              {exportJob.errorMessage ?? "Ошибка копирования"}
            </p>
            {targetDisplay ? (
              <ReleasePathBlock label="куда">{targetDisplay}</ReleasePathBlock>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Выберите папку на диске и имя файла. Запись релиза в каталоге не
              изменится.
            </p>
            {activeRelease.filePathDisplay ? (
              <ReleasePathBlock
                label="источник"
                tone="faint"
                meta={activeRelease.fileSizeLabel}
              >
                {activeRelease.filePathDisplay}
              </ReleasePathBlock>
            ) : null}
            <ReleaseTransferDestinationForm
              folderFieldId="export-target-dir"
              filenameFieldId="export-filename"
              targetDir={targetDir}
              onTargetDirChange={handleTargetDirChange}
              filename={filename}
              onFilenameChange={setFilename}
              onFilenameBlur={() => {
                if (filename.trim() && targetDirRuntime.trim()) {
                  void refreshDryRun(filename, targetDirRuntime).catch((err) => {
                    onError(err instanceof Error ? err.message : "Ошибка");
                  });
                }
              }}
              disabled={busy}
              diskLoading={diskSpace.loading}
              diskStatusLine={diskSpace.statusLine}
              diskShortfall={diskSpace.shortfall}
              diskFreeBytes={diskSpace.freeBytes}
              targetDirRuntime={targetDirRuntime}
              collision={collision}
              targetDisplay={targetDisplay}
            />
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        {exportActive ? (
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={busy}>
              Скрыть
            </Button>
            <Button variant="secondary" loading={busy} onClick={() => void handleCancel()}>
              Отменить
            </Button>
          </>
        ) : exportJob?.status === "FAILED" ? (
          <>
            <Button variant="ghost" onClick={closeDialog}>
              Закрыть
            </Button>
            <Button variant="primary" loading={busy} onClick={() => void handleRetry()}>
              Повторить
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={busy}>
              Отмена
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!canSubmit}
              onClick={() => void handleExport()}
            >
              {EXPORT_RELEASE_CONFIRM_LABEL}
            </Button>
          </>
        )}
      </div>
    </NativeDialog>
  );
}
