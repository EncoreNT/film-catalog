"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { NativeDialog } from "@/components/primitives/NativeDialog";
import { FolderPathField } from "@/components/shared/FolderPathField";
import { StoragePicker } from "@/components/shared/StoragePicker";
import { useStoragePicker } from "@/hooks/useStoragePicker";
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
import { formatArchiveTotalSize } from "@/lib/shared/format";
import { formatDiskSpaceFitLabel } from "@/lib/shared/disk-space-labels";

interface MoveDryRunResponse {
  collision: boolean;
  suggestedFilename: string;
  targetPathDisplay: string;
  sameAsSource: boolean;
}

function MovePathBlock({
  label,
  meta,
  children,
  tone = "muted",
}: {
  label?: string;
  meta?: string | null;
  children: ReactNode;
  tone?: "muted" | "faint";
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border/60 bg-bg-deep/40 px-3 py-2.5">
      {label ? (
        <p className="font-mono-tech text-[10px] uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
      ) : null}
      <p
        className={`break-all font-mono-tech text-xs leading-relaxed ${
          label ? "mt-1.5" : ""
        } ${tone === "faint" ? "text-faint" : "text-muted"}`}
      >
        {children}
      </p>
      {meta ? (
        <p className="mt-2 font-mono-tech text-[11px] tabular-nums text-faint">{meta}</p>
      ) : null}
    </div>
  );
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
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const [diskLoading, setDiskLoading] = useState(false);

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

  useEffect(() => {
    if (!open || !targetDirRuntime.trim()) {
      setFreeBytes(null);
      setDiskLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setDiskLoading(true);
      void fetch(`/api/disk-space?path=${encodeURIComponent(targetDirRuntime)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { freeBytes?: number } | null) => {
          setFreeBytes(typeof data?.freeBytes === "number" ? data.freeBytes : null);
        })
        .catch(() => setFreeBytes(null))
        .finally(() => setDiskLoading(false));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [open, targetDirRuntime]);

  const diskShortfall = useMemo(
    () => formatDiskSpaceFitLabel(freeBytes, fileSizeBytes),
    [freeBytes, fileSizeBytes],
  );

  const diskStatusLine = useMemo(() => {
    if (!targetDirRuntime.trim() || diskShortfall) return null;
    if (diskLoading) return "Проверяем свободное место…";
    const freeLabel = formatArchiveTotalSize(freeBytes);
    return freeLabel ? `Свободно: ${freeLabel}` : null;
  }, [diskLoading, diskShortfall, freeBytes, targetDirRuntime]);

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
      setFreeBytes(null);
      setDiskLoading(false);
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
    if (moveActive) {
      onClose();
      return;
    }
    onClose();
    if (moveJob && isMoveTerminal(moveJob.status)) {
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
    !diskShortfall &&
    !diskLoading &&
    validateStorage() == null;

  return (
    <NativeDialog
      open={open}
      onClose={closeDialog}
      preventCancel={busy && !moveActive}
      zIndex={110}
      ariaLabelledBy="move-dialog-title"
      className="confirm-dialog fixed inset-0 m-auto flex w-[min(100%-2rem,560px)] max-w-[560px] min-w-0 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="min-w-0 space-y-4 p-5">
        <div className="min-w-0">
          <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-neural">
            перемещение
          </p>
          <div className="mt-1 flex min-w-0 items-start justify-between gap-3">
            <h2
              id="move-dialog-title"
              className="min-w-0 font-display text-lg font-semibold leading-tight"
            >
              {MOVE_RELEASE_DIALOG_TITLE}
            </h2>
            {moveMeta ? (
              <span
                className={`font-mono-tech inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${moveMeta.badgeClass}`}
              >
                {moveJob?.status === "RUNNING" ? (
                  <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
                ) : null}
                {moveMeta.label}
              </span>
            ) : null}
          </div>
        </div>

        {moveActive ? (
          <div className="min-w-0 space-y-3">
            <p className="text-sm leading-relaxed text-muted">
              Файл копируется на новый диск. После проверки каталог обновится, а
              исходник будет удалён. Можно закрыть диалог — прогресс останется
              под вкладками релиза.
            </p>
            {targetDisplay ? (
              <MovePathBlock label="куда">{targetDisplay}</MovePathBlock>
            ) : null}
            {moveJob && moveSizeHint(moveJob) ? (
              <p className="font-mono-tech text-xs text-faint">
                Размер: {moveSizeHint(moveJob)}
              </p>
            ) : null}
            {moveJob?.status === "QUEUED" ? (
              <p className="text-sm text-muted">Ожидание в очереди…</p>
            ) : null}
            {moveJob?.status === "RUNNING" && progress != null ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="truncate text-muted">
                    {moveJob.progressMessage ?? "Перемещение…"}
                    {speed ? ` · ${speed}` : ""}
                  </span>
                  <span className="shrink-0 tabular-nums text-neural">{progress}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-bg-deep/80 ring-1 ring-inset ring-border/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neural/80 to-neural-bright transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        ) : moveJob?.status === "FAILED" ? (
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-danger">
              {moveJob.errorMessage ?? "Ошибка перемещения"}
            </p>
            {targetDisplay ? (
              <MovePathBlock label="куда">{targetDisplay}</MovePathBlock>
            ) : null}
          </div>
        ) : moveJob?.status === "SUCCEEDED" ? (
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-emerald-300">Файл перемещён, каталог обновлён.</p>
            {moveJob.warningMessage ? (
              <p className="text-sm text-ember">{moveJob.warningMessage}</p>
            ) : null}
            {targetDisplay ? (
              <MovePathBlock label="куда">{targetDisplay}</MovePathBlock>
            ) : null}
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted">
              Выберите хранилище и папку назначения. После успешного копирования
              запись релиза обновится, а файл на старом месте будет удалён.
            </p>
            {activeRelease.filePathDisplay ? (
              <MovePathBlock
                label="сейчас"
                tone="faint"
                meta={activeRelease.fileSizeLabel}
              >
                {activeRelease.filePathDisplay}
              </MovePathBlock>
            ) : null}
            <div className="space-y-4">
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
              <FolderPathField
                id="move-target-dir"
                label="Папка назначения"
                value={targetDir}
                onChange={handleTargetDirChange}
                disabled={busy}
              />
              {diskStatusLine ? (
                <p className="font-mono-tech text-xs text-muted">{diskStatusLine}</p>
              ) : null}
              {targetDirRuntime && diskShortfall ? (
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
                      Не хватит ≈ {diskShortfall}
                      {freeBytes != null
                        ? `. Свободно ${formatArchiveTotalSize(freeBytes)}`
                        : "."}
                    </p>
                  </div>
                </div>
              ) : null}
              <Field
                id="move-filename"
                label="Имя файла"
                variant="underline"
                className="font-mono-tech normal-case"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                onBlur={() => {
                  if (filename.trim() && targetDirRuntime.trim()) {
                    void refreshDryRun(filename, targetDirRuntime).catch((err) => {
                      onError(err instanceof Error ? err.message : "Ошибка");
                    });
                  }
                }}
                spellCheck={false}
                disabled={busy}
              />
            </div>
            {collision ? (
              <p className="text-sm text-ember" role="alert">
                Файл с таким именем уже существует. Предложено новое имя с суффиксом.
              </p>
            ) : null}
            {sameAsSource ? (
              <p className="text-sm text-danger" role="alert">
                Путь совпадает с текущим расположением файла.
              </p>
            ) : null}
            {targetDisplay ? (
              <p className="break-all font-mono-tech text-xs leading-relaxed text-faint">
                <span className="text-[10px] uppercase tracking-[0.12em]">куда </span>
                {targetDisplay}
              </p>
            ) : null}
          </>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        {moveActive ? (
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={busy}>
              Скрыть
            </Button>
            <Button variant="secondary" loading={busy} onClick={() => void handleCancel()}>
              Отменить
            </Button>
          </>
        ) : moveJob?.status === "FAILED" ? (
          <>
            <Button variant="ghost" onClick={closeDialog}>
              Закрыть
            </Button>
            <Button variant="primary" loading={busy} onClick={() => void handleRetry()}>
              Повторить
            </Button>
          </>
        ) : moveJob?.status === "SUCCEEDED" ? (
          <Button variant="primary" onClick={closeDialog}>
            Готово
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={closeDialog} disabled={busy}>
              Отмена
            </Button>
            <Button
              variant="primary"
              loading={busy}
              disabled={!canSubmit}
              onClick={() => void handleMove()}
            >
              {MOVE_RELEASE_CONFIRM_LABEL}
            </Button>
          </>
        )}
      </div>
    </NativeDialog>
  );
}
