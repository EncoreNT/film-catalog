"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { ReleaseTransferDialog } from "@/components/releases/ReleaseTransferDialog";
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

  const footerActions = exportActive
    ? [
        {
          label: "Скрыть",
          variant: "ghost" as const,
          onClick: closeDialog,
          disabled: busy,
        },
        {
          label: "Отменить",
          variant: "secondary" as const,
          loading: busy,
          onClick: () => void handleCancel(),
        },
      ]
    : exportJob?.status === "FAILED"
      ? [
          { label: "Закрыть", variant: "ghost" as const, onClick: closeDialog },
          {
            label: "Повторить",
            variant: "primary" as const,
            loading: busy,
            onClick: () => void handleRetry(),
          },
        ]
      : [
          {
            label: "Отмена",
            variant: "ghost" as const,
            onClick: closeDialog,
            disabled: busy,
          },
          {
            label: EXPORT_RELEASE_CONFIRM_LABEL,
            variant: "primary" as const,
            loading: busy,
            disabled: !canSubmit,
            onClick: () => void handleExport(),
          },
        ];

  return (
    <ReleaseTransferDialog
      open={open}
      onClose={closeDialog}
      preventCancel={busy && !exportActive}
      accent="accent"
      eyebrow="экспорт"
      title={EXPORT_RELEASE_DIALOG_TITLE}
      titleId="export-dialog-title"
      statusMeta={exportMeta}
      statusRunning={exportJob?.status === "RUNNING"}
      footerActions={footerActions}
    >
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
    </ReleaseTransferDialog>
  );
}
