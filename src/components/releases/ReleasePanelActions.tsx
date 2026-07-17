"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HardDriveDownload,
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
import { NativeDialog } from "@/components/primitives/NativeDialog";
import { apiFetch } from "@/lib/api/client";
import {
  EXPORT_RELEASE_CONFIRM_LABEL,
  EXPORT_RELEASE_DIALOG_TITLE,
  EXPORT_RELEASE_MENU_LABEL,
  exportReleaseBlockReason,
} from "@/lib/releases/export-release-ui";

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

type ConfirmKind = null | "probe" | "delete" | "deleteFile" | "export";

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
}: {
  movieId: number;
  movieSlug: string;
  activeRelease: ReleaseDetailView;
  releaseCount: number;
}) {
  const router = useRouter();
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaSaveDirConfigured, setMediaSaveDirConfigured] = useState(false);
  const [exportFilename, setExportFilename] = useState("");
  const [exportCollision, setExportCollision] = useState(false);
  const [exportTargetDisplay, setExportTargetDisplay] = useState<string | null>(
    null,
  );
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRelease.tvReady) return;
    let cancelled = false;
    void fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { mediaSaveDir?: string | null } | null) => {
        if (!cancelled) {
          setMediaSaveDirConfigured(Boolean(data?.mediaSaveDir));
        }
      })
      .catch(() => {
        if (!cancelled) setMediaSaveDirConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRelease.tvReady]);

  const showExportAction = activeRelease.tvReady;
  const exportBlockReason = exportReleaseBlockReason({
    hasFilePath: Boolean(activeRelease.filePath),
    mediaSaveDirConfigured,
  });
  const canExport = exportBlockReason == null;

  const openExportDialog = async () => {
    setLoading(true);
    setError(null);
    setExportSuccess(null);
    try {
      const dryRun = await apiFetch<ExportDryRunResponse>(
        `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: true }),
        },
        "Не удалось подготовить экспорт",
      );
      setExportFilename(dryRun.suggestedFilename);
      setExportCollision(dryRun.collision);
      setExportTargetDisplay(dryRun.targetPathDisplay);
      setConfirmKind("export");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const refreshExportDryRun = async (filename: string) => {
    const dryRun = await apiFetch<ExportDryRunResponse>(
      `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true, filename }),
      },
      "Не удалось проверить имя файла",
    );
    setExportCollision(dryRun.collision);
    setExportTargetDisplay(dryRun.targetPathDisplay);
    if (dryRun.collision) {
      setExportFilename(dryRun.suggestedFilename);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ targetPathDisplay: string }>(
        `/api/movies/${movieId}/releases/${activeRelease.id}/export`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: exportFilename }),
        },
        "Не удалось скопировать файл",
      );
      setConfirmKind(null);
      setExportSuccess(`Скопировано: ${result.targetPathDisplay}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

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
              disabled={!activeRelease.filePath || loading}
              onClick={() => setConfirmKind("probe")}
            />
            {showExportAction ? (
              <ReleaseActionsMenuItem
                label={EXPORT_RELEASE_MENU_LABEL}
                icon={<HardDriveDownload className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                disabled={!canExport || loading}
                disabledHint={exportBlockReason}
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
              disabled={releaseCount <= 1 || loading}
              danger
              onClick={() => setConfirmKind("delete")}
            />
          </div>
        </div>
      </div>
      {exportSuccess ? (
        <p className="px-3 pb-2 text-xs text-accent" role="status">
          {exportSuccess}
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
        open={confirmKind === "export"}
        onClose={() => setConfirmKind(null)}
        preventCancel={loading}
        zIndex={110}
        ariaLabelledBy="export-dialog-title"
        className="fixed inset-0 m-auto flex w-[min(100%-2rem,480px)] max-w-[480px] flex-col rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="space-y-4 p-5">
          <h2 id="export-dialog-title" className="font-display text-lg font-semibold">
            {EXPORT_RELEASE_DIALOG_TITLE}
          </h2>
          <p className="text-sm text-muted">
            Файл будет скопирован в папку сохранения. Запись релиза в каталоге
            не изменится.
          </p>
          <label className="block space-y-2">
            <span className="font-mono-tech text-faint">имя файла</span>
            <input
              className="focus-ring font-mono-tech min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-xs text-text"
              value={exportFilename}
              onChange={(e) => setExportFilename(e.target.value)}
              onBlur={() => {
                if (exportFilename.trim()) {
                  void refreshExportDryRun(exportFilename).catch((err) => {
                    setError(err instanceof Error ? err.message : "Ошибка");
                  });
                }
              }}
              spellCheck={false}
            />
          </label>
          {exportCollision ? (
            <p className="text-sm text-ember" role="alert">
              Файл с таким именем уже существует. Предложено новое имя с суффиксом.
            </p>
          ) : null}
          {exportTargetDisplay ? (
            <p className="font-mono-tech text-xs text-muted">
              {exportTargetDisplay}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Button variant="ghost" onClick={() => setConfirmKind(null)} disabled={loading}>
            Отмена
          </Button>
          <Button variant="primary" loading={loading} onClick={() => void handleExport()}>
            {EXPORT_RELEASE_CONFIRM_LABEL}
          </Button>
        </div>
      </NativeDialog>
    </>
  );
}
