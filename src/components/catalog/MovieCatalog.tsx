"use client";

import { useCallback, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { MovieCard } from "@/components/movies/MovieCard";
import { FilterBar } from "@/components/catalog/FilterBar";
import { EmptyCatalog } from "@/components/catalog/EmptyCatalog";
import { Modal } from "@/components/primitives/Modal";
import { Pagination } from "@/components/primitives/Pagination";
import { Select } from "@/components/primitives/Select";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDownUp, Loader2, Plus, ScanSearch } from "lucide-react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { QualityGauge } from "@/components/primitives/QualityGauge";
import type { ArchiveMetrics } from "@/lib/catalog/archive-metrics";
import { ARCHIVE_QUALITY_METRIC_DEFS } from "@/lib/catalog/archive-quality-metrics";
import { pluralRu } from "@/lib/shared/russian-plural";

const AddMovieForm = dynamic(
  () => import("@/components/movies/AddMovieForm").then((module) => module.AddMovieForm),
  { ssr: false },
);

const SORT_OPTIONS = [
  { value: "title", label: "Название" },
  { value: "year", label: "Год" },
  { value: "createdAt", label: "Добавлено" },
  { value: "rating", label: "Оценка" },
  { value: "watchedAt", label: "Дата просмотра" },
  { value: "durationSeconds", label: "Продолжительность" },
] as const;

const STATUS_TAB_CLASS = {
  active: "border-accent/40 bg-accent/5 text-accent",
  inactive: "border-border bg-bg-surface text-muted hover:text-text",
} as const;

function statusTabClass(active: boolean): string {
  return `font-mono-tech inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors ${
    active ? STATUS_TAB_CLASS.active : STATUS_TAB_CLASS.inactive
  }`;
}

interface Facet {
  value: string | null;
  count: number;
}

interface MovieCatalogProps {
  movies: MovieWithTracks[];
  facets: {
    resolutions: Facet[];
    russianChannelLayouts: Facet[];
    originalChannelLayouts: Facet[];
    russianTranslationTypes: Facet[];
    russianAudioFormats: Facet[];
    originalAudioFormats: Facet[];
    genres: Facet[];
  };
  total: number;
  totalCount: number;
  page: number;
  limit: number;
  catalogCount?: number;
  draftCount?: number;
  excludedCount?: number;
  archiveMetrics?: ArchiveMetrics;
}

export function MovieCatalog({
  movies,
  facets,
  total,
  totalCount,
  page,
  limit,
  catalogCount = 0,
  draftCount = 0,
  excludedCount = 0,
  archiveMetrics = { fourK: 0, hdr10: 0, russianAtmos: 0, elite: 0 },
}: MovieCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "CATALOG";
  const [addOpen, setAddOpen] = useState(false);
  const [extraMovies, setExtraMovies] = useState<MovieWithTracks[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedPages, setLoadedPages] = useState(0);
  const [isPending, startTransition] = useTransition();

  // "Показать ещё" accumulates extra pages into extraMovies. When the user
  // changes filters / sort / page, the server passes a new first page as
  // `movies`, but extraMovies from the previous query would otherwise survive
  // and get concatenated — producing duplicate ids (and React key collisions).
  // Reset the accumulated state whenever the query string changes.
  const filterKey = searchParams.toString();
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setExtraMovies([]);
    setLoadedPages(0);
  }

  // Filter/sort changes go through a transition with `scroll: false` so the
  // URL updates and the server re-fetches the catalog without scrolling back
  // to the top or flashing the Suspense skeleton — React keeps the current
  // view mounted until the new one is ready. `isPending` drives the top
  // loading bar.
  const navigate = useCallback(
    (
      updates: Record<string, string | null>,
      opts?: { forceCatalog?: boolean },
    ) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // Reshuffling the result set can move the current page out of range,
      // so drop any page offset on a filter/sort change.
      params.delete("page");
      if (opts?.forceCatalog) params.set("status", "CATALOG");
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `/?${qs}` : "/", { scroll: false });
      });
    },
    [router, searchParams, startTransition],
  );

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => navigate(updates),
    [navigate],
  );

  const applyFilter = useCallback(
    (updates: Record<string, string | null>) =>
      navigate(updates, { forceCatalog: true }),
    [navigate],
  );

  const sort = searchParams.get("sort") ?? "title";
  const order = searchParams.get("order") ?? "asc";

  const applySort = (nextSort: string, nextOrder: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSort === "title") params.delete("sort");
    else params.set("sort", nextSort);
    if (nextOrder === "asc") params.delete("order");
    else params.set("order", nextOrder);
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    });
  };

  const toggleOrder = () =>
    applySort(sort, order === "asc" ? "desc" : "asc");

  const isDraftView = status === "DRAFT";
  const isExcludedView = status === "EXCLUDED";
  const isCatalog = !isDraftView && !isExcludedView;

  const activeResolution = searchParams.get("resolution");
  const activeHdr = searchParams.get("hdr");
  const activePremiumAudio = searchParams.get("premiumAudio");

  const filterParams = {
    resolution: activeResolution,
    hdr: activeHdr,
    premiumAudio: activePremiumAudio,
  };

  const pages = Math.max(1, Math.ceil(total / limit));
  // Defense-in-depth: even if two pages ever overlap (e.g. a non-stable sort
  // shifts a movie between pages between requests), dedup by id so React keys
  // stay unique. First occurrence wins, preserving the first-page order.
  const allMovies: MovieWithTracks[] = [];
  {
    const seen = new Set<number>();
    for (const movie of [...movies, ...extraMovies]) {
      if (seen.has(movie.id)) continue;
      seen.add(movie.id);
      allMovies.push(movie);
    }
  }
  const shownCount = allMovies.length;
  const canLoadMore = page + loadedPages < pages && shownCount < total;

  const buildHref = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (p === 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + loadedPages + 1;
      const sp = new URLSearchParams(searchParams.toString());
      sp.set("page", String(nextPage));
      sp.set("limit", String(limit));
      const res = await fetch(`/api/movies?${sp.toString()}`);
      if (!res.ok) throw new Error("Network error");
      const data = (await res.json()) as { movies: MovieWithTracks[] };
      setExtraMovies((prev) => [...prev, ...data.movies]);
      setLoadedPages((prev) => prev + 1);
    } catch {
      // ignore — пользователь может повторить
    } finally {
      setLoadingMore(false);
    }
  };

  const hasAnyMovies = totalCount > 0;

  const viewLabel = isDraftView
    ? "черновики"
    : isExcludedView
      ? "скрытые"
      : "каталог";
  const viewTitle = isDraftView
    ? "На проверку"
    : isExcludedView
      ? "Скрытые"
      : "Личный архив";

  return (
    <MotionConfig reducedMotion="user">
      {isPending ? <div className="catalog-loading-bar" aria-hidden /> : null}
      {/* Compact header — title + actions in one line, metrics as chips below */}
      <section className="mb-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono-tech text-accent">{viewLabel}</p>
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              {viewTitle}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="focus-ring flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-border-strong bg-bg-surface px-3 py-1.5 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:text-accent"
            >
              <Plus className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Добавить вручную</span>
              <span className="sm:hidden">Добавить</span>
            </button>
            <Link
              href="/scan"
              className="focus-ring flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-sm font-semibold text-bg-deep shadow-[0_0_20px_var(--accent-glow)] transition-all duration-200 hover:bg-accent-bright"
            >
              <ScanSearch className="h-4 w-4" aria-hidden />
              Скан
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Link
            href="/?status=CATALOG"
            className={statusTabClass(isCatalog)}
          >
            каталог · <span className="tabular-nums">{catalogCount}</span>
          </Link>
          <Link
            href="/?status=DRAFT"
            className={statusTabClass(isDraftView)}
          >
            черновики · <span className="tabular-nums">{draftCount}</span>
          </Link>
          <Link
            href="/?status=EXCLUDED"
            className={statusTabClass(isExcludedView)}
          >
            скрытые · <span className="tabular-nums">{excludedCount}</span>
          </Link>
        </div>

        {isCatalog ? (
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="font-mono-tech text-faint">
                индекс качества архива
              </p>
              <p className="font-mono-tech hidden text-faint sm:inline">
                нажмите, чтобы отфильтровать
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {ARCHIVE_QUALITY_METRIC_DEFS.map((def) => {
                const Icon = def.icon;
                const active = def.isActive(filterParams, isCatalog);
                return (
                  <QualityGauge
                    key={def.key}
                    count={archiveMetrics[def.key]}
                    total={catalogCount}
                    label={def.label}
                    caption={def.caption}
                    icon={<Icon className="h-5 w-5" />}
                    active={active}
                    elite={def.elite}
                    onClick={() => applyFilter(def.toggleFilter(active))}
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <FilterBar facets={facets} updateParams={updateParams} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-baseline gap-3">
          <span
            className="font-display text-2xl font-bold tabular-nums text-accent"
            style={{ textShadow: "0 0 18px var(--accent-glow)" }}
          >
            {total}
          </span>
          <span className="font-mono-tech text-sm text-muted">
            {pluralRu(total, "фильм", "фильма", "фильмов")}
          </span>
        </div>

        {allMovies.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="font-mono-tech hidden text-faint sm:inline">
              сортировка
            </span>
            <Select
              compact
              label="Сортировка"
              value={sort}
              onChange={(v) => applySort(v, order)}
              preserveOrder
              options={[...SORT_OPTIONS]}
            />
            <button
              type="button"
              onClick={toggleOrder}
              className="focus-ring flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-2.5 py-1.5 text-xs text-muted transition-all duration-200 hover:border-accent/50 hover:text-accent"
              aria-label={
                order === "asc"
                  ? "По возрастанию — нажать для убывания"
                  : "По убыванию — нажать для возрастания"
              }
              title={order === "asc" ? "По возрастанию" : "По убыванию"}
            >
              <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
              <span className="font-mono-tech">{order === "asc" ? "А→Я" : "Я→А"}</span>
            </button>
          </div>
        ) : null}
      </div>

      {allMovies.length === 0 ? (
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
        <>
          <div
            className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4"
            aria-busy={isPending}
          >
            <AnimatePresence mode="popLayout">
              {allMovies.map((movie, index) => (
                <motion.div
                  key={movie.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                      delay: Math.min(index * 0.04, 0.4),
                    },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
                  }}
                >
                  <MovieCard movie={movie} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {canLoadMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="focus-ring flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-border-strong bg-bg-surface px-5 py-2.5 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:text-accent hover:shadow-[0_0_20px_var(--accent-glow)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden />
                )}
                Показать ещё
                <span className="text-faint">
                  ({shownCount} из {total})
                </span>
              </button>
            </div>
          )}

          {pages > 1 && (
            <Pagination page={page} pages={pages} buildHref={buildHref} />
          )}
        </>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Добавить фильм"
        size="wide"
      >
        <AddMovieForm onDone={() => setAddOpen(false)} />
      </Modal>
    </MotionConfig>
  );
}
