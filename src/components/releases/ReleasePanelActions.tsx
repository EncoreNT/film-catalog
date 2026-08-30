"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  HardDrive,
  HardDriveDownload,
  Menu,
  Pencil,
  ScanSearch,
  Star,
  Trash2,
} from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { Button } from "@/components/primitives/Button";
import { NativeDialog } from "@/components/primitives/NativeDialog";
import { apiFetch } from "@/lib/api/client";
import type { ReleaseExportJobState } from "@/hooks/useReleaseExportJob";
import type { ReleaseMoveJobState } from "@/hooks/useReleaseMoveJob";
import {
  EXPORT_RELEASE_MENU_LABEL,
  exportReleaseBlockReason,
} from "@/lib/releases/export-release-ui";
import {
  MOVE_RELEASE_MENU_LABEL,
  moveReleaseBlockReason,
} from "@/lib/releases/move-release-ui";
import { ReleaseExportDialog } from "@/components/releases/ReleaseExportDialog";
import { ReleaseMoveDialog } from "@/components/releases/ReleaseMoveDialog";
import { ReleaseMenuItem } from "@/components/releases/ReleaseMenuItem";

type ConfirmKind = null | "probe" | "delete" | "deleteFile";

export function ReleasePanelActions({
  movieId,
  movieSlug,
  activeRelease,
  releaseCount,
  primaryReleaseId,
  exportJobState,
  exportDialogOpen,
  onExportDialogOpenChange,
  onExportSuccessMessageChange,
  moveJobState,
  moveDialogOpen,
  onMoveDialogOpenChange,
}: {
  movieId: number;
  movieSlug: string;
  activeRelease: ReleaseDetailView;
  releaseCount: number;
  primaryReleaseId: number | null;
  exportJobState: ReleaseExportJobState;
  exportDialogOpen: boolean;
  onExportDialogOpenChange: (open: boolean) => void;
  onExportSuccessMessageChange: (message: string | null) => void;
  moveJobState: ReleaseMoveJobState;
  moveDialogOpen: boolean;
  onMoveDialogOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probeError, setProbeError] = useState<string | null>(null);

  const { exportActive, loading: exportActionLoading } = exportJobState;

  const showExportAction = activeRelease.tvReady;
  const exportBlockReason = exportReleaseBlockReason({
    hasFilePath: Boolean(activeRelease.filePath),
  });
  const canExport = exportBlockReason == null;

  const openExportDialog = () => {
    onExportSuccessMessageChange(null);
    onExportDialogOpenChange(true);
  };

  const exportBusy = loading || exportActionLoading;
  const moveBusy = loading || moveJobState.loading;
  const actionsBusy = exportBusy || moveBusy;

  const moveBlockReason = moveReleaseBlockReason({
    hasFilePath: Boolean(activeRelease.filePath),
    activeJob: moveJobState.moveActive,
    activeExport: moveJobState.activeExport,
    activeBuild: moveJobState.activeBuild,
  });
  const canMove = moveBlockReason == null;
  const isPrimaryRelease = activeRelease.id === primaryReleaseId;
  const canSetPrimary = releaseCount > 1 && !isPrimaryRelease;

  const handleSetPrimary = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/api/movies/${movieId}/primary-release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ releaseId: activeRelease.id }),
        },
        "Не удалось назначить основной релиз",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = async () => {
    setLoading(true);
    setProbeError(null);
    try {
      await apiFetch(
        `/api/movies/${movieId}/releases/${activeRelease.id}/probe`,
        { method: "POST" },
        "Не удалось проанализировать файл",
      );
      setConfirmKind(null);
      setProbeError(null);
      router.refresh();
    } catch (err) {
      setProbeError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const closeProbeDialog = () => {
    setConfirmKind(null);
    setProbeError(null);
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
    onExportDialogOpenChange(false);
  };

  return (
    <>
      <div className="flex shrink-0 flex-col items-end gap-1 px-2 py-2 sm:px-3">
        <div className="group/menu relative">
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
            <ReleaseMenuItem
              label="Редактировать"
              href={`/movies/${movieSlug}/releases/${activeRelease.id}/edit`}
              icon={<Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            />
            <ReleaseMenuItem
              label="Пересканировать"
              icon={<ScanSearch className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              disabled={!activeRelease.filePath || actionsBusy}
              onClick={() => {
                setProbeError(null);
                setConfirmKind("probe");
              }}
            />
            <ReleaseMenuItem
              label={MOVE_RELEASE_MENU_LABEL}
              icon={<HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              disabled={(!canMove && !moveJobState.moveActive) || actionsBusy}
              disabledHint={moveJobState.moveActive ? null : moveBlockReason}
              onClick={() => onMoveDialogOpenChange(true)}
            />
            {showExportAction ? (
              <ReleaseMenuItem
                label={EXPORT_RELEASE_MENU_LABEL}
                icon={<HardDriveDownload className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                disabled={(!canExport && !exportActive) || actionsBusy}
                disabledHint={exportActive ? null : exportBlockReason}
                onClick={() => void openExportDialog()}
              />
            ) : null}
            {canSetPrimary ? (
              <ReleaseMenuItem
                label="Сделать основным для каталога"
                icon={<Star className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                disabled={actionsBusy}
                onClick={() => void handleSetPrimary()}
              />
            ) : null}
            <ReleaseMenuItem
              label="Удалить"
              icon={<Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              disabled={actionsBusy}
              danger
              onClick={() => setConfirmKind("delete")}
            />
            </div>
          </div>
        </div>
        {error ? (
          <p className="max-w-[min(20rem,45vw)] truncate text-right text-xs text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirmKind === "probe"}
        onClose={closeProbeDialog}
        onConfirm={handleRescan}
        loading={loading}
        title="Пересканировать файл?"
        description={
          <>
            Дорожки и длительность будут перезаписаны данными из ffprobe.
            {probeError ? (
              <span className="mt-2 block text-danger" role="alert">
                {probeError}
              </span>
            ) : null}
          </>
        }
        confirmLabel="Пересканировать"
        tone="accent"
      />
      <NativeDialog
        open={confirmKind === "delete"}
        onClose={() => setConfirmKind(null)}
        preventCancel={loading}
        zIndex={110}
        ariaLabelledBy="delete-release-dialog-title"
        ariaDescribedBy="delete-release-dialog-desc"
        className="confirm-dialog fixed inset-0 m-auto flex w-[min(100%-2rem,440px)] max-w-[440px] flex-col rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start gap-4 p-5 pb-4">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-danger/30 bg-danger/10 text-danger"
            aria-hidden
          >
            <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="delete-release-dialog-title"
              className="font-display text-lg font-semibold leading-tight"
            >
              Удалить релиз?
            </h2>
            <p
              id="delete-release-dialog-desc"
              className="mt-2 text-sm leading-relaxed text-muted"
            >
              {releaseCount <= 1
                ? "Это единственный релиз фильма. Карточка фильма останется без файла и будет скрыта в каталоге, пока не появится новый релиз. Файл MKV можно оставить на диске или удалить вместе с записью."
                : "Запись исчезнет из каталога. Файл MKV можно оставить на диске или удалить вместе с записью."}
            </p>
          </div>
        </div>
        <div className="space-y-3 border-t border-border px-5 py-4">
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              className="w-full"
              loading={loading}
              onClick={() => void handleDelete(false)}
            >
              Удалить только запись
            </Button>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => setConfirmKind("deleteFile")}
              disabled={!activeRelease.filePath}
              title={
                activeRelease.filePath
                  ? undefined
                  : "У релиза нет пути к файлу на диске"
              }
            >
              Удалить запись и файл
            </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setConfirmKind(null)}
            disabled={loading}
          >
            Отмена
          </Button>
        </div>
      </NativeDialog>
      <ConfirmDialog
        open={confirmKind === "deleteFile"}
        onClose={() => setConfirmKind(null)}
        onConfirm={() => void handleDelete(true)}
        loading={loading}
        title="Удалить файл с диска?"
        description={
          <>
            Действие необратимо. Будут удалены запись в каталоге и файл:
            <div className="rounded-[var(--radius-sm)] border border-danger/30 bg-danger/[0.06] px-3 py-2.5">
              <p className="font-mono-tech text-[10px] uppercase tracking-[0.12em] text-danger/90">
                путь к файлу
              </p>
              <p className="scroll-subtle mt-1.5 max-h-32 overflow-y-auto break-all font-mono-tech text-xs leading-relaxed text-text">
                {activeRelease.filePathDisplay ?? activeRelease.filePath}
              </p>
            </div>
          </>
        }
        confirmLabel="Удалить безвозвратно"
      />
      <ReleaseExportDialog
        open={exportDialogOpen}
        onClose={closeExportDialog}
        movieId={movieId}
        activeRelease={activeRelease}
        exportJobState={exportJobState}
        onError={setError}
      />
      <ReleaseMoveDialog
        open={moveDialogOpen}
        onClose={() => onMoveDialogOpenChange(false)}
        movieId={movieId}
        activeRelease={activeRelease}
        moveJobState={moveJobState}
        onError={setError}
      />
    </>
  );
}
