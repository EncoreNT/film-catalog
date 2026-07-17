"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HardDriveDownload,
  LoaderCircle,
  Menu,
  Pencil,
  Plus,
  ScanSearch,
  Trash2,
  Wand2,
} from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { Button } from "@/components/primitives/Button";
import { Field } from "@/components/primitives/Field";
import { NativeDialog } from "@/components/primitives/NativeDialog";
import { FolderPathField } from "@/components/shared/FolderPathField";
import { apiFetch } from "@/lib/api/client";
import type { ReleaseExportJobState } from "@/hooks/useReleaseExportJob";
import {
  EXPORT_RELEASE_CONFIRM_LABEL,
  EXPORT_RELEASE_DIALOG_TITLE,
  EXPORT_RELEASE_MENU_LABEL,
  exportReleaseBlockReason,
} from "@/lib/releases/export-release-ui";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import {
  EXPORT_STATUS_META,
  exportSpeedLabel,
  exportSizeHint,
  isExportTerminal,
} from "@/lib/releases/export-display";

function ReleaseActionsMenuItem({
  label,
  icon,
  href,
  onClick,
  disabled,
  disabledHint,
  danger,
}: {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledHint?: string | null;
  danger?: boolean;
}) {
  const tooltip = disabled && disabledHint ? disabledHint : label;
  const className = `focus-ring font-mono-tech flex w-full items-start gap-2 px-3 py-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    danger
      ? "text-muted hover:bg-red-500/10 hover:text-red-300"
      : "text-muted hover:bg-accent/10 hover:text-accent"
  }`;

  const content = (
    <>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="whitespace-nowrap">{label}</span>
        {disabled && disabledHint ? (
          <span className="font-sans text-[10px] font-normal normal-case leading-snug text-faint">
            {disabledHint}
          </span>
        ) : null}
      </span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} title={tooltip}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={tooltip}
      disabled={disabled}
      onClick={onClick}
    >
      {content}
    </button>
  );
}

type ConfirmKind = null | "probe" | "delete" | "deleteFile";

interface ExportDryRunResponse {
  collision: boolean;
  suggestedFilename: string;
  targetPathDisplay: string;
}

export function ReleasePanelActions({
  movieId,
  movieSlug,
  activeRelease,
  releaseCount,
  exportJobState,
  exportDialogOpen,
  onExportDialogOpenChange,
  exportSuccessMessage,
  onExportSuccessMessageChange,
}: {
  movieId: number;
  movieSlug: string;
  activeRelease: ReleaseDetailView;
  releaseCount: number;
  exportJobState: ReleaseExportJobState;
  exportDialogOpen: boolean;
  onExportDialogOpenChange: (open: boolean) => void;
  exportSuccessMessage: string | null;
  onExportSuccessMessageChange: (message: string | null) => void;
}) {
  const router = useRouter();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportTargetDir, setExportTargetDir] = useState("");
  const [exportTargetDirRuntime, setExportTargetDirRuntime] = useState("");
  const [exportFilename, setExportFilename] = useState("");
  const [exportCollision, setExportCollision] = useState(false);
  const [exportTargetDisplay, setExportTargetDisplay] = useState<string | null>(
    null,
  );

  const {
    exportJob,
    setExportJob,
    exportActive,
    polling: exportPolling,
    loading: exportActionLoading,
    setLoading: setExportActionLoading,
    loadActiveExport,
    cancelExport,
  } = exportJobState;

  useEffect(() => {
    if (!exportDialogOpen || !exportJob) return;
    setExportFilename(exportJob.targetFilename);
    setExportTargetDisplay(exportJob.targetPathDisplay);
  }, [exportDialogOpen, exportJob]);

  const showExportAction = activeRelease.tvReady;
  const exportBlockReason = exportReleaseBlockReason({
    hasFilePath: Boolean(activeRelease.filePath),
  });
  const canExport = exportBlockReason == null;

  const openExportDialog = async () => {
    setLoading(true);
    setError(null);
    onExportSuccessMessageChange(null);
    try {
      const active = await loadActiveExport();
      if (active) {
        setExportFilename(active.targetFilename);
        setExportTargetDisplay(active.targetPathDisplay);
        onExportDialogOpenChange(true);
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
      setExportTargetDir("");
      setExportTargetDirRuntime("");
      setExportFilename(dryRun.suggestedFilename);
      setExportCollision(false);
      setExportTargetDisplay(null);
      onExportDialogOpenChange(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const refreshExportDryRun = async (filename: string, targetDir: string) => {
    if (!targetDir.trim()) {
      setExportCollision(false);
      setExportTargetDisplay(null);
      return;
    }

    const dryRun = await apiFetch<ExportDryRunResponse>(
      `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, filename, targetDir }),
      },
      "Не удалось проверить имя файла",
    );
    setExportCollision(dryRun.collision);
    setExportTargetDisplay(dryRun.targetPathDisplay);
    if (dryRun.collision) {
      setExportFilename(dryRun.suggestedFilename);
    }
  };

  const handleExportTargetDirChange = (runtimePath: string, displayPath: string) => {
    setExportTargetDirRuntime(runtimePath);
    setExportTargetDir(displayPath);
    if (runtimePath.trim()) {
      void refreshExportDryRun(exportFilename, runtimePath).catch((err) => {
        setError(err instanceof Error ? err.message : "Ошибка");
      });
    } else {
      setExportCollision(false);
      setExportTargetDisplay(null);
    }
  };

  const handleExport = async () => {
    setExportActionLoading(true);
    setError(null);
    try {
      const job = await apiFetch<SerializedExport>(
        `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: exportFilename,
            targetDir: exportTargetDirRuntime,
          }),
        },
        "Не удалось поставить экспорт в очередь",
      );
      setExportJob(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setExportActionLoading(false);
    }
  };

  const handleExportCancel = async () => {
    setExportActionLoading(true);
    setError(null);
    try {
      const next = await cancelExport();
      if (next && isExportTerminal(next.status)) {
        onExportDialogOpenChange(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setExportActionLoading(false);
    }
  };

  const handleExportRetry = async () => {
    if (!exportJob) return;
    setExportActionLoading(true);
    setError(null);
    try {
      const next = await apiFetch<SerializedExport>(
        `/api/exports/${exportJob.id}/retry`,
        { method: "POST" },
        "Не удалось повторить экспорт",
      );
      setExportJob(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setExportActionLoading(false);
    }
  };

  const exportMeta = exportJob
    ? EXPORT_STATUS_META[exportJob.status as keyof typeof EXPORT_STATUS_META]
    : null;
  const exportProgress =
    exportJob?.progressPercent != null
      ? Math.round(exportJob.progressPercent)
      : null;
  const exportSpeed = exportSpeedLabel(exportJob?.progressSpeed);
  const exportBusy = loading || exportActionLoading;

  const handleRescan = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/api/movies/${movieId}/releases/${activeRelease.id}/probe`,
        { method: "POST" },
        "Не удалось проанализировать файл",
      );
      setConfirmKind(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deleteFile: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/api/movies/${movieId}/releases/${activeRelease.id}?deleteFile=${deleteFile ? "true" : "false"}`,
        { method: "DELETE" },
        "Не удалось удалить релиз",
      );
      setConfirmKind(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const closeExportDialog = () => {
    if (exportActive) {
      onExportDialogOpenChange(false);
      return;
    }
    onExportDialogOpenChange(false);
    if (exportJob && isExportTerminal(exportJob.status)) {
      setExportJob(null);
    }
  };

  return (
    <>
      <div className="group/menu relative shrink-0 px-2 py-2 sm:px-3">
        <button
          type="button"
          className="focus-ring font-mono-tech inline-flex items-center justify-center rounded-[var(--radius)] border border-border-strong bg-bg-surface px-2.5 py-1.5 text-muted transition-colors hover:border-accent/40 hover:text-accent group-hover/menu:border-accent/40 group-hover/menu:text-accent group-focus-within/menu:border-accent/40 group-focus-within/menu:text-accent"
          aria-label="Меню действий релиза"
          aria-haspopup="menu"
        >
          <Menu className="h-3.5 w-3.5" aria-hidden />
        </button>

        <div
          className="pointer-events-none invisible absolute right-0 top-full z-30 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-hover/menu:pointer-events-auto group-hover/menu:visible group-hover/menu:opacity-100 group-focus-within/menu:pointer-events-auto group-focus-within/menu:visible group-focus-within/menu:opacity-100"
          role="menu"
          aria-label="Действия с релизом"
        >
          <div className="min-w-[15rem] overflow-hidden rounded-[var(--radius)] border border-border-strong bg-bg-elevated py-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
            <ReleaseActionsMenuItem
              label="Редактировать"
              href={`/movies/${movieSlug}/releases/${activeRelease.id}/edit`}
              icon={<Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseActionsMenuItem
              label="Пересканировать"
              icon={<ScanSearch className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              disabled={!activeRelease.filePath || exportBusy}
              onClick={() => setConfirmKind("probe")}
            />
            {showExportAction ? (
              <ReleaseActionsMenuItem
                label={EXPORT_RELEASE_MENU_LABEL}
                icon={<HardDriveDownload className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                disabled={(!canExport && !exportActive) || exportBusy}
                disabledHint={exportActive ? null : exportBlockReason}
                onClick={() => void openExportDialog()}
              />
            ) : null}
            <ReleaseActionsMenuItem
              label="Собрать релиз"
              href={`/movies/${movieSlug}/builds/new`}
              icon={<Wand2 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseActionsMenuItem
              label="Добавить"
              href={`/movies/${movieSlug}/releases/new`}
              icon={<Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseActionsMenuItem
              label="Удалить"
              icon={<Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              disabled={releaseCount <= 1 || exportBusy}
              danger
              onClick={() => setConfirmKind("delete")}
            />
          </div>
        </div>
      </div>
      {exportSuccessMessage ? (
        <p className="px-3 pb-2 text-xs text-accent" role="status">
          {exportSuccessMessage}
        </p>
      ) : null}
      {error ? (
        <p className="px-3 pb-2 text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <ConfirmDialog
        open={confirmKind === "probe"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleRescan}
        loading={loading}
        title="Пересканировать файл?"
        description="Дорожки и длительность будут перезаписаны данными из ffprobe."
        confirmLabel="Пересканировать"
        tone="accent"
      />
      {confirmKind === "delete" ? (
        <div className="fixed inset-0 z-[111] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Закрыть"
            onClick={() => setConfirmKind(null)}
          />
          <div className="relative w-[min(100%-2rem,440px)] rounded-[var(--radius)] border border-border bg-bg-elevated p-5 shadow-xl">
            <p className="font-display text-lg font-semibold">Удалить релиз?</p>
            <p className="mt-2 text-sm text-muted">
              Можно удалить только запись или вместе с файлом на диске.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmKind(null)}>
                Отмена
              </Button>
              <Button
                variant="secondary"
                loading={loading}
                onClick={() => void handleDelete(false)}
              >
                Только из каталога
              </Button>
              <Button
                variant="danger"
                onClick={() => setConfirmKind("deleteFile")}
                disabled={!activeRelease.filePath}
              >
                Дальше…
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmKind === "deleteFile"}
        onClose={() => setConfirmKind(null)}
        onConfirm={() => void handleDelete(true)}
        loading={loading}
        title="Удалить файл с диска?"
        description={
          <>
            Это необратимо. Будут удалены релиз в каталоге и файл:
            <span className="mt-2 block font-mono-tech text-xs text-text">
              {activeRelease.filePathDisplay ?? activeRelease.filePath}
            </span>
          </>
        }
        confirmLabel="Удалить релиз и файл"
      />
      <NativeDialog
        open={exportDialogOpen}
        onClose={closeExportDialog}
        preventCancel={exportBusy && !exportActive}
        zIndex={110}
        ariaLabelledBy="export-dialog-title"
        className="confirm-dialog fixed inset-0 m-auto flex w-[min(100%-2rem,480px)] max-w-[480px] flex-col rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="space-y-5 p-5">
          <div>
            <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-accent">
              экспорт
            </p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <h2 id="export-dialog-title" className="font-display text-lg font-semibold leading-tight">
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
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-muted">
                Копирование идёт в фоне. Можно закрыть диалог — прогресс останется
                в полоске под вкладками релиза.
              </p>
              {exportTargetDisplay ? (
                <p className="font-mono-tech text-xs text-muted">{exportTargetDisplay}</p>
              ) : null}
              {exportJob && exportSizeHint(exportJob) ? (
                <p className="font-mono-tech text-xs text-faint">
                  Размер: {exportSizeHint(exportJob)}
                </p>
              ) : null}
              {exportJob?.status === "QUEUED" ? (
                <p className="text-sm text-muted">Ожидание в очереди…</p>
              ) : null}
              {exportJob?.status === "RUNNING" && exportProgress != null ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="truncate text-muted">
                      {exportJob.progressMessage ?? "Копирование…"}
                      {exportSpeed ? ` · ${exportSpeed}` : ""}
                      {exportPolling ? " · обновление…" : ""}
                    </span>
                    <span className="shrink-0 tabular-nums text-accent">
                      {exportProgress}%
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-bg-deep/80 ring-1 ring-inset ring-border/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent/80 to-accent-bright transition-[width] duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, exportProgress))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : exportJob?.status === "FAILED" ? (
            <div className="space-y-3">
              <p className="text-sm text-danger">
                {exportJob.errorMessage ?? "Ошибка копирования"}
              </p>
              {exportTargetDisplay ? (
                <p className="font-mono-tech text-xs text-muted">{exportTargetDisplay}</p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted">
                Выберите папку на диске и имя файла. Запись релиза в каталоге не
                изменится.
              </p>
              <div className="space-y-5">
                <FolderPathField
                  id="export-target-dir"
                  label="Папка назначения"
                  value={exportTargetDir}
                  onChange={handleExportTargetDirChange}
                  disabled={exportBusy}
                />
                <Field
                  id="export-filename"
                  label="Имя файла"
                  variant="underline"
                  className="font-mono-tech normal-case"
                  value={exportFilename}
                  onChange={(e) => setExportFilename(e.target.value)}
                  onBlur={() => {
                    if (exportFilename.trim() && exportTargetDirRuntime.trim()) {
                      void refreshExportDryRun(
                        exportFilename,
                        exportTargetDirRuntime,
                      ).catch((err) => {
                        setError(err instanceof Error ? err.message : "Ошибка");
                      });
                    }
                  }}
                  spellCheck={false}
                  disabled={exportBusy}
                />
              </div>
              {exportCollision ? (
                <p className="text-sm text-ember" role="alert">
                  Файл с таким именем уже существует. Предложено новое имя с суффиксом.
                </p>
              ) : null}
              {exportTargetDisplay ? (
                <p className="truncate font-mono-tech text-xs text-faint" title={exportTargetDisplay}>
                  {exportTargetDisplay}
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {exportActive ? (
            <>
              <Button variant="ghost" onClick={closeExportDialog} disabled={exportBusy}>
                Скрыть
              </Button>
              <Button
                variant="secondary"
                loading={exportBusy}
                onClick={() => void handleExportCancel()}
              >
                Отменить
              </Button>
            </>
          ) : exportJob?.status === "FAILED" ? (
            <>
              <Button variant="ghost" onClick={closeExportDialog}>
                Закрыть
              </Button>
              <Button variant="primary" loading={exportBusy} onClick={() => void handleExportRetry()}>
                Повторить
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={closeExportDialog} disabled={exportBusy}>
                Отмена
              </Button>
              <Button variant="primary" loading={exportBusy} disabled={!exportTargetDirRuntime.trim()} onClick={() => void handleExport()}>
                {EXPORT_RELEASE_CONFIRM_LABEL}
              </Button>
            </>
          )}
        </div>
      </NativeDialog>
    </>
  );
}
