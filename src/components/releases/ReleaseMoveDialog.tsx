"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { ReleaseTransferDialog } from "@/components/releases/ReleaseTransferDialog";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { ReleaseJobDialogProgress } from "@/components/releases/ReleaseJobDialogProgress";
import { ReleasePathBlock } from "@/components/releases/ReleasePathBlock";
import { ReleaseTransferDestinationForm } from "@/components/releases/ReleaseTransferDestinationForm";
import { useStoragePicker } from "@/hooks/useStoragePicker";
import { useTargetDiskSpace } from "@/hooks/useTargetDiskSpace";
import { moveTargetStorageKind } from "@/lib/shared/storage-picker-state";
import type { ReleaseMoveJobState } from "@/hooks/useReleaseMoveJob";
import { apiFetch } from "@/lib/api/client";
import {
  MOVE_RELEASE_CONFIRM_LABEL,
  MOVE_RELEASE_DIALOG_TITLE,
} from "@/lib/releases/move-release-ui";
import type { SerializedMove } from "@/lib/releases/move-serialize";
import {
  MOVE_STATUS_META,
  isMoveTerminal,
  moveSizeHint,
  moveSpeedLabel,
} from "@/lib/releases/move-display";
import { displayFilePath } from "@/lib/shared/display-path";

interface MoveDryRunResponse {
  collision: boolean;
  suggestedFilename: string;
  targetPathDisplay: string;
  sameAsSource: boolean;
}

export function ReleaseMoveDialog({
  open,
  onClose,
  movieId,
  activeRelease,
  moveJobState,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  movieId: number;
  activeRelease: ReleaseDetailView;
  moveJobState: ReleaseMoveJobState;
  onError: (message: string | null) => void;
}) {
  const defaultMoveKind = moveTargetStorageKind(activeRelease.storageExternal);

  const {
    storageKind,
    setStorageKind,
    selectedStorageId,
    setSelectedStorageId,
    externalStorages,
    createExternalStorage,
    validateStorage,
    resolveExternalStorageId,
  } = useStoragePicker(null, { defaultKind: defaultMoveKind });

  const [targetDir, setTargetDir] = useState("");
  const [targetDirRuntime, setTargetDirRuntime] = useState("");
  const [filename, setFilename] = useState("");
  const [collision, setCollision] = useState(false);
  const [sameAsSource, setSameAsSource] = useState(false);
  const [targetDisplay, setTargetDisplay] = useState<string | null>(null);

  const fileSizeBytes = activeRelease.fileSizeBytes;

  const {
    moveJob,
    setMoveJob,
    moveActive,
    loading,
    setLoading,
    loadActiveMove,
    cancelMove,
  } = moveJobState;

  const diskSpace = useTargetDiskSpace({
    enabled: open,
    targetDirRuntime,
    requiredBytes: fileSizeBytes,
  });

  const selectedStorage = useMemo(
    () => externalStorages.find((s) => String(s.id) === selectedStorageId) ?? null,
    [externalStorages, selectedStorageId],
  );

  useEffect(() => {
    if (!open || moveJob || moveActive) return;
    if (storageKind !== "external" || selectedStorageId) return;
    const first = externalStorages[0];
    if (first) setSelectedStorageId(String(first.id));
  }, [
    open,
    moveJob,
    moveActive,
    storageKind,
    selectedStorageId,
    externalStorages,
    setSelectedStorageId,
  ]);

  useEffect(() => {
    if (!open || !moveJob) return;
    setFilename(moveJob.targetFilename);
    setTargetDisplay(moveJob.targetPathDisplay);
  }, [open, moveJob]);

  useEffect(() => {
    if (!open || storageKind !== "external" || !selectedStorage?.path) return;
    if (targetDirRuntime.trim()) return;
    setTargetDirRuntime(selectedStorage.path);
    setTargetDir(displayFilePath(selectedStorage.path));
  }, [open, storageKind, selectedStorage, targetDirRuntime]);

  const refreshDryRun = async (nextFilename: string, nextTargetDir: string) => {
    if (!nextTargetDir.trim()) {
      setCollision(false);
      setSameAsSource(false);
      setTargetDisplay(null);
      return;
    }

    const externalStorageId = await resolveExternalStorageId();
    const dryRun = await apiFetch<MoveDryRunResponse>(
      `/api/movies/${movieId}/releases/${activeRelease.id}/move`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dryRun: true,
          filename: nextFilename,
          targetDir: nextTargetDir,
          externalStorageId,
        }),
      },
      "Не удалось проверить путь назначения",
    );
    setCollision(dryRun.collision);
    setSameAsSource(dryRun.sameAsSource);
    setTargetDisplay(dryRun.targetPathDisplay);
    if (dryRun.collision) {
      setFilename(dryRun.suggestedFilename);
    }
  };

  const openPrepare = async () => {
    setLoading(true);
    onError(null);
    try {
      const active = await loadActiveMove();
      if (active) {
        setFilename(active.targetFilename);
        setTargetDisplay(active.targetPathDisplay);
        return;
      }

      const basename =
        activeRelease.filePathDisplay?.split(/[/\\]/).pop() ??
        activeRelease.filePath?.split(/[/\\]/).pop() ??
        "release.mkv";
      setFilename(basename);
      setTargetDir("");
      setTargetDirRuntime("");
      setCollision(false);
      setSameAsSource(false);
      setTargetDisplay(null);
      diskSpace.reset();
      setStorageKind(defaultMoveKind);
      setSelectedStorageId("");
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
      setSameAsSource(false);
      setTargetDisplay(null);
    }
  };

  const handleMove = async () => {
    const storageError = validateStorage();
    if (storageError) {
      onError(storageError);
      return;
    }

    setLoading(true);
    onError(null);
    try {
      const externalStorageId = await resolveExternalStorageId();
      const job = await apiFetch<SerializedMove>(
        `/api/movies/${movieId}/releases/${activeRelease.id}/move`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename,
            targetDir: targetDirRuntime,
            externalStorageId,
          }),
        },
        "Не удалось поставить перемещение в очередь",
      );
      setMoveJob(job);
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
      const next = await cancelMove();
      if (next && isMoveTerminal(next.status)) {
        onClose();
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!moveJob) return;
    setLoading(true);
    onError(null);
    try {
      const next = await apiFetch<SerializedMove>(
        `/api/moves/${moveJob.id}/retry`,
        { method: "POST" },
        "Не удалось повторить перемещение",
      );
      setMoveJob(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => {
    onClose();
    if (moveJob && isMoveTerminal(moveJob.status) && !moveActive) {
      setMoveJob(null);
    }
  };

  const moveMeta = moveJob
    ? MOVE_STATUS_META[moveJob.status as keyof typeof MOVE_STATUS_META]
    : null;
  const progress =
    moveJob?.progressPercent != null ? Math.round(moveJob.progressPercent) : null;
  const speed = moveSpeedLabel(moveJob?.progressSpeed);
  const busy = loading;

  const canSubmit =
    targetDirRuntime.trim() &&
    filename.trim() &&
    !sameAsSource &&
    !diskSpace.shortfall &&
    !diskSpace.loading &&
    validateStorage() == null;

  const footerActions = moveActive
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
    : moveJob?.status === "FAILED"
      ? [
          { label: "Закрыть", variant: "ghost" as const, onClick: closeDialog },
          {
            label: "Повторить",
            variant: "primary" as const,
            loading: busy,
            onClick: () => void handleRetry(),
          },
        ]
      : moveJob?.status === "SUCCEEDED"
        ? [{ label: "Готово", variant: "primary" as const, onClick: closeDialog }]
        : [
            {
              label: "Отмена",
              variant: "ghost" as const,
              onClick: closeDialog,
              disabled: busy,
            },
            {
              label: MOVE_RELEASE_CONFIRM_LABEL,
              variant: "primary" as const,
              loading: busy,
              disabled: !canSubmit,
              onClick: () => void handleMove(),
            },
          ];

  return (
    <ReleaseTransferDialog
      open={open}
      onClose={closeDialog}
      preventCancel={busy && !moveActive}
      accent="neural"
      eyebrow="перемещение"
      title={MOVE_RELEASE_DIALOG_TITLE}
      titleId="move-dialog-title"
      statusMeta={moveMeta}
      statusRunning={moveJob?.status === "RUNNING"}
      footerActions={footerActions}
    >
      {moveActive ? (
          <ReleaseJobDialogProgress
            accent="neural"
            activeDescription="Файл копируется на новый диск. После проверки каталог обновится, а исходник будет удалён. Можно закрыть диалог — прогресс останется под вкладками релиза и в списке фоновых задач."
            targetDisplay={targetDisplay}
            sizeHint={moveJob ? moveSizeHint(moveJob) : null}
            queued={moveJob?.status === "QUEUED"}
            progressPercent={moveJob?.status === "RUNNING" ? progress : null}
            progressMessage={moveJob?.progressMessage}
            speed={speed}
            defaultProgressMessage="Перемещение…"
          />
        ) : moveJob?.status === "FAILED" ? (
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-danger">
              {moveJob.errorMessage ?? "Ошибка перемещения"}
            </p>
            {targetDisplay ? (
              <ReleasePathBlock label="куда">{targetDisplay}</ReleasePathBlock>
            ) : null}
          </div>
        ) : moveJob?.status === "SUCCEEDED" ? (
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-emerald-300">Файл перемещён, каталог обновлён.</p>
            {moveJob.warningMessage ? (
              <p className="text-sm text-ember">{moveJob.warningMessage}</p>
            ) : null}
            {targetDisplay ? (
              <ReleasePathBlock label="куда">{targetDisplay}</ReleasePathBlock>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Выберите хранилище и папку назначения. После успешного копирования
              запись релиза обновится, а файл на старом месте будет удалён.
            </p>
            {activeRelease.filePathDisplay ? (
              <ReleasePathBlock
                label="сейчас"
                tone="faint"
                meta={activeRelease.fileSizeLabel}
              >
                {activeRelease.filePathDisplay}
              </ReleasePathBlock>
            ) : null}
            <ReleaseTransferDestinationForm
              storageSection={
                <StoragePicker
                  label="Перенести на"
                  fullWidth
                  storageKind={storageKind}
                  onStorageKindChange={setStorageKind}
                  externalStorages={externalStorages}
                  selectedStorageId={selectedStorageId}
                  onSelectedStorageIdChange={setSelectedStorageId}
                  onCreateExternalStorage={createExternalStorage}
                />
              }
              folderFieldId="move-target-dir"
              filenameFieldId="move-filename"
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
              sameAsSource={sameAsSource}
              targetDisplay={targetDisplay}
            />
          </>
        )}
    </ReleaseTransferDialog>
  );
}
