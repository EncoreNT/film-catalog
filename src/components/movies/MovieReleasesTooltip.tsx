"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Star } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { releaseTabLabel, releaseQuickSpecHints } from "@/lib/media/spec-tags";
import { apiFetch } from "@/lib/api/client";
import {
  TooltipListHeader,
  TooltipListItem,
  TooltipListPanel,
} from "@/components/primitives/TooltipListParts";

interface MovieReleasesTooltipProps {
  releases: ReleaseWithTracks[];
  movieSlug: string;
  movieId: number;
  /** id of the primary release shown on the catalog card. */
  primaryReleaseId: number | null;
}

function PrimaryStarButton({
  isPrimary,
  busy,
  onSelect,
}: {
  isPrimary: boolean;
  busy: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isPrimary || busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect();
      }}
      className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-faint transition-colors hover:bg-bg-surface/60 hover:text-accent disabled:pointer-events-none disabled:opacity-100"
      title={
        isPrimary
          ? "Основной релиз для карточки в каталоге"
          : "Сделать основным для карточки в каталоге"
      }
      aria-label={
        isPrimary
          ? "Основной релиз"
          : "Сделать основным релизом для карточки в каталоге"
      }
      aria-pressed={isPrimary}
    >
      <Star
        className={`h-3.5 w-3.5 shrink-0 transition-colors ${
          isPrimary
            ? "fill-accent text-accent"
            : busy
              ? "animate-pulse text-accent/60"
              : "text-faint hover:text-accent"
        }`}
        aria-hidden
      />
    </button>
  );
}

export function MovieReleasesTooltip({
  releases,
  movieSlug,
  movieId,
  primaryReleaseId,
}: MovieReleasesTooltipProps) {
  const router = useRouter();
  const [busyReleaseId, setBusyReleaseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setPrimary = async (releaseId: number) => {
    if (releaseId === primaryReleaseId || busyReleaseId != null) return;
    setBusyReleaseId(releaseId);
    setError(null);
    try {
      await apiFetch(
        `/api/movies/${movieId}/primary-release`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ releaseId }),
        },
        "Не удалось назначить основной релиз",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusyReleaseId(null);
    }
  };

  return (
    <TooltipListPanel>
      <TooltipListHeader label="релизы фильма" count={releases.length} />
      {error ? (
        <p className="px-2.5 pb-1 text-xs text-danger">{error}</p>
      ) : null}
      <ul className="space-y-0.5">
        {releases.map((release) => {
          const isPrimary = release.id === primaryReleaseId;
          const hints = releaseQuickSpecHints(release);
          const settingPrimary = busyReleaseId === release.id;
          return (
            <TooltipListItem key={release.id}>
              <div className="flex items-center pr-1">
                <PrimaryStarButton
                  isPrimary={isPrimary}
                  busy={settingPrimary}
                  onSelect={() => void setPrimary(release.id)}
                />
                <Link
                  href={`/movies/${movieSlug}?release=${release.id}`}
                  className="focus-ring group flex min-w-0 flex-1 items-center justify-between gap-2.5 py-2 pr-1.5 transition-colors hover:bg-bg-surface/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text group-hover:text-accent">
                      {releaseTabLabel(release)}
                    </span>
                    {hints.length > 0 ? (
                      <span className="font-mono-tech mt-0.5 flex flex-wrap gap-1.5 text-[0.6rem] text-faint">
                        {hints.map((h) => (
                          <span key={h}>{h}</span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-faint transition-colors group-hover:text-accent"
                    aria-hidden
                  />
                </Link>
              </div>
            </TooltipListItem>
          );
        })}
      </ul>
    </TooltipListPanel>
  );
}
