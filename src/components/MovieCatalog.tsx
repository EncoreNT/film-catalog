"use client";

import { useState } from "react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { MovieCard } from "./MovieCard";
import { FilterBar } from "./FilterBar";
import { EmptyCatalog } from "./EmptyCatalog";
import { AddMovieForm } from "./AddMovieForm";
import { Modal } from "./primitives/Modal";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Film, Clapperboard, Plus, ScanSearch } from "lucide-react";

function pluralFilm(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 19) return "фильмов";
  if (mod10 === 1) return "фильм";
  if (mod10 >= 2 && mod10 <= 4) return "фильма";
  return "фильмов";
}

interface Facet {
  value: string | null;
  count: number;
}

function HeroSection({
  catalogCount,
  draftCount,
  isDraftView,
  onAddManual,
}: {
  catalogCount: number;
  draftCount: number;
  isDraftView: boolean;
  onAddManual: () => void;
}) {
  return (
    <section className="mb-12">
      <div className="relative overflow-hidden rounded-[var(--radius)] border border-border bg-gradient-to-br from-bg-surface to-transparent p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-40 blur-3xl"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="font-mono-tech text-accent">
              {isDraftView ? "черновики" : "каталог"}
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {isDraftView ? "На проверку" : "Личный архив"}
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-muted">
              Фильмы с фильтрацией по качеству, звуковым дорожкам и языкам.
              Сканер сам разложит хаос папок по полочкам.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:items-end">
            <div className="flex gap-3">
              <Link
                href="/?status=CATALOG"
                className="surface-elevated group flex min-w-32 flex-col gap-1 p-4 transition-colors hover:border-accent/40"
              >
                <span className="flex items-center gap-2 text-faint">
                  <Film className="h-4 w-4" aria-hidden />
                  <span className="font-mono-tech">в каталоге</span>
                </span>
                <span className="font-display text-3xl font-bold text-accent">
                  {catalogCount}
                </span>
              </Link>
              <Link
                href="/?status=DRAFT"
                className="surface-elevated group flex min-w-32 flex-col gap-1 p-4 transition-colors hover:border-accent/40"
              >
                <span className="flex items-center gap-2 text-faint">
                  <Clapperboard className="h-4 w-4" aria-hidden />
                  <span className="font-mono-tech">черновики</span>
                </span>
                <span className="font-display text-3xl font-bold text-text">
                  {draftCount}
                </span>
              </Link>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAddManual}
                className="focus-ring flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-strong bg-bg-surface px-3.5 py-2 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:text-accent hover:shadow-[0_0_20px_var(--accent-glow)]"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Добавить вручную
              </button>
              <Link
                href="/scan"
                className="focus-ring flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-accent px-3.5 py-2 text-sm font-semibold text-bg-deep shadow-[0_0_20px_var(--accent-glow)] transition-all duration-200 hover:bg-accent-bright hover:shadow-[0_0_32px_var(--accent-glow)]"
              >
                <ScanSearch className="h-4 w-4" aria-hidden />
                Скан
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

interface MovieCatalogProps {
  movies: MovieWithTracks[];
  facets: {
    resolutions: Facet[];
    audioLanguages: Facet[];
    subtitleLanguages: Facet[];
    channelLayouts: Facet[];
    genres: Facet[];
  };
  total: number;
  totalCount: number;
  catalogCount?: number;
  draftCount?: number;
}

export function MovieCatalog({
  movies,
  facets,
  total,
  totalCount,
  catalogCount = 0,
  draftCount = 0,
}: MovieCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "CATALOG";
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const toggleSelect = (id: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleBulk = async (action: "approve" | "exclude") => {
    setBulkLoading(true);
    try {
      await fetch("/api/movies/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkLoading(false);
    }
  };

  const hasAnyMovies = totalCount > 0;
  const isDraftView = status.includes("DRAFT") && !status.includes("CATALOG");

  return (
    <>
      <HeroSection
        catalogCount={catalogCount}
        draftCount={draftCount}
        isDraftView={isDraftView}
        onAddManual={() => setAddOpen(true)}
      />

      <FilterBar
        facets={facets}
        selectedIds={Array.from(selected)}
        onBulkAction={handleBulk}
        bulkLoading={bulkLoading}
      />

      <p className="font-mono-tech mb-6 text-muted">
        {total} {pluralFilm(total)}
      </p>

      {movies.length === 0 ? (
        hasAnyMovies ? (
          <div className="surface-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="font-display text-2xl font-semibold">
              Ничего не найдено
            </p>
            <p className="max-w-md text-sm text-muted">
              Попробуйте изменить фильтры или поисковый запрос.
            </p>
          </div>
        ) : (
          <EmptyCatalog isDraftView={isDraftView} />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {movies.map((movie, index) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              index={index}
              selected={selected.has(movie.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Добавить фильм"
        size="wide"
      >
        <AddMovieForm onDone={() => setAddOpen(false)} />
      </Modal>
    </>
  );
}
