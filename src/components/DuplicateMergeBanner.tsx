"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Layers } from "lucide-react";
import type { MergeCandidate } from "@/lib/merge-preview-types";
import { MergeMoviesModal } from "./MergeMoviesModal";

interface DuplicateMergeBannerProps {
  currentMovieId: number;
  candidates: MergeCandidate[];
}

export function DuplicateMergeBanner({
  currentMovieId,
  candidates,
}: DuplicateMergeBannerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const duplicates = candidates.filter((c) => c.id !== currentMovieId);
  if (duplicates.length === 0) return null;

  return (
    <>
      <div className="surface-card flex flex-col gap-3 border border-accent/25 bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
          <div>
            <p className="text-sm font-medium text-text">
              Похоже, это дубль другого фильма
            </p>
            <p className="mt-1 text-sm text-muted">
              Найдено {duplicates.length}{" "}
              {duplicates.length === 1 ? "совпадение" : "совпадения"} по названию и году.
              Объедините, чтобы собрать релизы в одной карточке.
            </p>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {duplicates.map((dup) => (
                <li key={dup.id}>
                  <Link
                    href={`/movies/${dup.slug}`}
                    className="text-accent hover:underline"
                  >
                    {dup.title}
                    {dup.year ? ` (${dup.year})` : ""}
                  </Link>
                  {" · "}
                  {dup.releases.length}{" "}
                  {dup.releases.length === 1 ? "релиз" : "релиза"}
                  {dup.releases.length > 0
                    ? ` (${dup.releases.map((r) => r.label).join(", ")})`
                    : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-[var(--radius)] border border-accent/40 bg-bg-surface px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
        >
          <Layers className="h-4 w-4" aria-hidden />
          Объединить
        </button>
      </div>

      <MergeMoviesModal
        open={open}
        onClose={() => setOpen(false)}
        currentMovieId={currentMovieId}
        candidates={candidates}
        onMerged={() => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
