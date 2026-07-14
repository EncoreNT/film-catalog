"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu,
  Pencil,
  Plus,
  ScanSearch,
  Trash2,
} from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { apiFetch } from "@/lib/api/client";

function ReleaseActionsMenuItem({
  label,
  icon,
  href,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const className = `focus-ring font-mono-tech flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    danger
      ? "text-muted hover:bg-red-500/10 hover:text-red-300"
      : "text-muted hover:bg-accent/10 hover:text-accent"
  }`;

  if (href && !disabled) {
    return (
      <Link href={href} className={className} title={label}>
        {icon}
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
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
  const [confirmKind, setConfirmKind] = useState<null | "probe" | "delete">(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(
        `/api/movies/${movieId}/releases/${activeRelease.id}`,
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
          <div className="min-w-[11.5rem] overflow-hidden rounded-[var(--radius)] border border-border-strong bg-bg-elevated py-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
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
      />
      <ConfirmDialog
        open={confirmKind === "delete"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleDelete}
        loading={loading}
        title="Удалить релиз?"
        description="Релиз и все его дорожки будут удалены. Файл на диске не затрагивается."
        confirmLabel="Удалить"
      />
    </>
  );
}
