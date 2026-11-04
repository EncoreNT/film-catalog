"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { MovieCard } from "@/components/movies/MovieCard";
import { FilterToolbar } from "@/components/catalog/FilterBar";
import { applyCatalogFilterUpdates } from "@/lib/catalog/filter-bar-utils";
import { EmptyCatalog } from "@/components/catalog/EmptyCatalog";
import { Pagination } from "@/components/primitives/Pagination";
import { Select } from "@/components/primitives/Select";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDownWideNarrow, Loader2, Plus } from "lucide-react";
import { motion, AnimatePresence, MotionConfig, useScroll, useMotionValueEvent } from "motion/react";
import type { ArchiveMetrics, ArchiveTotals } from "@/lib/catalog/archive-metrics";
import { CatalogOverview } from "./CatalogOverview";
import { FilterMenus } from "./FilterMenus";
import { resolveCatalogSpotlightTier } from "@/lib/catalog/catalog-spotlight";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
import { catalogListCountLabel } from "@/lib/catalog/catalog-list-count-label";
import type { CatalogRemakeBadge } from "@/lib/remakes/remake-catalog-badges";
import {
  DEFAULT_MOVIE_LIST_ORDER,
  DEFAULT_MOVIE_LIST_SORT,
} from "@/lib/movies/movie-list-defaults";

const SORT_OPTIONS = [
  { value: "title", label: "Название" },
  { value: "year", label: "Год" },
  { value: "createdAt", label: "Добавлен в каталог" },
  { value: "fileDownloadedAt", label: "Скачан" },
  { value: "rating", label: "Оценка" },
  { value: "watchedAt", label: "Дата просмотра" },
  { value: "durationSeconds", label: "Продолжительность" },
  { value: "fileSize", label: "Размер файла" },
] as const;

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
    tvReady: number;
    languages: Facet[];
    channelLayouts: Facet[];
    audioFormats: Facet[];
    translationTypes: Facet[];
  };
  total: number;
  releaseCount: number;
  totalCount: number;
  page: number;
  limit: number;
  catalogCount?: number;
  catalogReleaseCount?: number;
  draftCount?: number;
  excludedCount?: number;
  archiveMetrics?: ArchiveMetrics;
  archiveTotals?: ArchiveTotals;
  remakeBadges?: Record<number, CatalogRemakeBadge>;
  emptyReleaseCount?: number;
}

export function MovieCatalog({
  movies,
  facets,
  total,
  releaseCount,
  totalCount,
  page,
  limit,
  catalogCount = 0,
  catalogReleaseCount = 0,
  draftCount = 0,
  excludedCount = 0,
  archiveMetrics = { gold: 0, hdr10: 0, elite: 0 },
  archiveTotals = { durationSeconds: 0, fileSizeBytes: 0 },
  remakeBadges = {},
  emptyReleaseCount = 0,
}: MovieCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "CATALOG";
  const [isPending, startTransition] = useTransition();
  const { scrollY } = useScroll();
  const [deckScrolled, setDeckScrolled] = useState(false);
  // Detect when the sticky FilterToolbar deck is actually pinned (its top
  // reaches the sticky offset) instead of a hardcoded scroll threshold. This
  // is robust against console-height changes: the deck turns into its glass
  // panel exactly when it starts overlapping scrolling content, with no
  // premature flash while it is still in its natural position.
  const deckRef = useRef<HTMLDivElement>(null);

  useMotionValueEvent(scrollY, "change", () => {
    const el = deckRef.current;
    setDeckScrolled(el ? el.getBoundingClientRect().top <= 17 : false);
  });

  // Два режима просмотра каталога, различаются URL-параметром `mode`:
  //  - `mode=more`  — «Показать ещё»: накапливать страницы на клиенте,
  //    показываем страницы 1..page. Каждое нажатие грузит ОДНУ страницу
  //    (масштабируется до сотен страниц, без мегабатчей).
  //  - без mode     — пагинация: прыжок на страницу page, показываем ТОЛЬКО её.
  // URL всегда отражает реальное состояние, поэтому пагинация, кнопка «назад»
  // браузера, refresh и шеринг ссылки работают одинаково и без no-op'ов.
  const mode = searchParams.get("mode") === "more" ? "more" : "page";
  // filterKey — поисковые параметры БЕЗ page/mode: его смена = новый фильтр/сорт
  // = сброс накопления. Смена только page/mode = навигация в том же результате.
  const filterKey = (() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("page");
    sp.delete("mode");
    return sp.toString();
  })();

  const [priorMovies, setPriorMovies] = useState<MovieWithTracks[]>([]);
  const [prevPage, setPrevPage] = useState(page);
  const [prevMode, setPrevMode] = useState(mode);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  // prevMovies хранит `movies` предыдущего рендера — нужен, чтобы при
  // переходе page→page+1 в режиме more добавить старую страницу в накопление.
  const [prevMovies, setPrevMovies] = useState(movies);

  if (filterKey !== prevFilterKey) {
    // Сменился фильтр/сорт — новый результат, накопление неактуально.
    setPrevFilterKey(filterKey);
    setPrevPage(page);
    setPrevMode(mode);
    setPriorMovies([]);
  } else if (page !== prevPage || mode !== prevMode) {
    // Та же выборка, но перешли на другую страницу / сменили режим.
    if (mode === "page") {
      // Прыжок пагинацией — показываем только запрошенную страницу.
      setPriorMovies([]);
    } else if (page === prevPage + 1) {
      // «Показать ещё» (mode=more, +1 страница): добавляем прежнюю страницу
      // в накопление. Из режима page в more — текущая страница становится
      // «предыдущей», поверх неё догрузится новая.
      const oldPageMovies = prevMovies;
      setPriorMovies((prev) =>
        prevMode === "more" ? [...prev, ...oldPageMovies] : [...oldPageMovies],
      );
    } else {
      // Непредвиденный скачок page в режиме more — сбрасываем накопление,
      // чтобы не показать «дыру» между страницами.
      setPriorMovies([]);
    }
    setPrevPage(page);
    setPrevMode(mode);
  }
  if (movies !== prevMovies) setPrevMovies(movies);

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
      const nextUpdates = applyCatalogFilterUpdates(updates);
      for (const [key, value] of Object.entries(nextUpdates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      // Reshuffling the result set can move the current page out of range,
      // so drop any page offset and accumulate mode on a filter/sort change.
      params.delete("page");
      params.delete("mode");
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

  const sort = searchParams.get("sort") ?? DEFAULT_MOVIE_LIST_SORT;
  const order = searchParams.get("order") ?? DEFAULT_MOVIE_LIST_ORDER;

  const applySort = (nextSort: string, nextOrder: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSort === DEFAULT_MOVIE_LIST_SORT) params.delete("sort");
    else params.set("sort", nextSort);
    if (nextOrder === DEFAULT_MOVIE_LIST_ORDER) params.delete("order");
    else params.set("order", nextOrder);
    params.delete("page");
    params.delete("mode");
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
  const listCount = catalogListCountLabel(
    isDraftView ? "draft" : isExcludedView ? "excluded" : "catalog",
    total,
    releaseCount,
  );

  const activeResolution = searchParams.get("resolution");
  const activeHdr = searchParams.get("hdr");
  const activePremiumAudio = searchParams.get("premiumAudio");

  const filterParams = {
    resolution: activeResolution,
    hdr: activeHdr,
    premiumAudio: activePremiumAudio,
  };

  const catalogSpotlight = resolveCatalogSpotlightTier(filterParams, isCatalog);

  const pages = Math.max(1, Math.ceil(total / limit));
  // В режиме more показываем накопленные страницы + текущую; в режиме page —
  // только текущую. Дедуп по id на случай нестабильной сортировки между страницами.
  const allMovies: MovieWithTracks[] = [];
  {
    const seen = new Set<number>();
    const source = mode === "more" ? [...priorMovies, ...movies] : movies;
    for (const movie of source) {
      if (seen.has(movie.id)) continue;
      seen.add(movie.id);
      allMovies.push(movie);
    }
  }
  const shownCount = allMovies.length;
  const canLoadMore = page < pages && shownCount < total;

  const buildHref = (p: number) => {
    const sp = new URLSearchParams(searchParams.toString());
    // Клик по пагинации — это прыжок (режим page): очищаем накопление.
    sp.delete("mode");
    if (p === 1) sp.delete("page");
    else sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  const handleLoadMore = () => {
    // «Показать ещё» — переходим на page+1 в режиме more. Сервер отдаёт только
    // новую страницу (один пакет по limit фильмов), клиент добавляет её к уже
    // просмотренному. URL меняется → пагинация и «назад» браузера работают.
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("page", String(page + 1));
    sp.set("mode", "more");
    const qs = sp.toString();
    startTransition(() => {
      router.push(qs ? `/?${qs}` : "/", { scroll: false });
    });
  };

  const isEmptyReleasesView = searchParams.get("emptyReleases") === "true";
  const hasAnyMovies = totalCount > 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="catalog-page">
        <SpotlightTier tier={catalogSpotlight} />
        {isPending ? <div className="catalog-loading-bar" aria-hidden /> : null}
        {isCatalog ? <CatalogOverview count={catalogCount} releaseCount={catalogReleaseCount} metrics={archiveMetrics} totals={archiveTotals} filters={filterParams} onFilter={applyFilter} /> : <h1 className="catalog-view-title">{isDraftView ? "Черновики" : "Скрытые фильмы"}</h1>}
        <div ref={deckRef} className={`catalog-sticky-deck catalog-deck ${deckScrolled ? "catalog-sticky-deck--active" : ""}`}>
          <FilterToolbar updateParams={updateParams} emptyReleaseCount={emptyReleaseCount} />
          <FilterMenus facets={facets} updateParams={updateParams} />
          <div className="catalog-results-row">
            <nav className="catalog-status-tabs" aria-label="Раздел каталога">
              {[{ value: "CATALOG", label: "Каталог", count: 0 }, { value: "DRAFT", label: "Черновики", count: draftCount }, { value: "EXCLUDED", label: "Скрытые", count: excludedCount }].map((tab) => <Link key={tab.value} href={tab.value === "CATALOG" ? "/" : `/?status=${tab.value}`} className="focus-ring" aria-current={status === tab.value ? "page" : undefined}>{tab.label}{tab.count > 0 ? <span>{tab.count}</span> : null}</Link>)}
            </nav>
            <p className="catalog-result-count" aria-label={listCount.ariaLabel} aria-live="polite">{listCount.displayText}</p>
            {allMovies.length > 0 ? <div className="catalog-sort">
              <span className="catalog-sort-label">Сортировка</span>
              <Select compact label="Сортировка" value={sort} onChange={(v) => applySort(v, order)} preserveOrder options={[...SORT_OPTIONS]} />
              <button type="button" onClick={toggleOrder} className="catalog-icon focus-ring" aria-label={order === "asc" ? "По возрастанию, переключить на убывание" : "По убыванию, переключить на возрастание"} title={order === "asc" ? "По возрастанию" : "По убыванию"}><ArrowDownWideNarrow className={order === "asc" ? "rotate-180" : ""} aria-hidden /></button>
            </div> : null}
          </div>
        </div>
        <div className="pt-4">
          {allMovies.length === 0 ? (
            isEmptyReleasesView ? (
              <EmptyCatalog variant="emptyReleases" />
            ) : hasAnyMovies ? (
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
              <div className="catalog-grid" aria-busy={isPending}>
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
                      <MovieCard
                        movie={movie}
                        index={index}
                        remakeBadge={remakeBadges[movie.id]}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {canLoadMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isPending}
                    className="catalog-load-more focus-ring"
                  >
                    {isPending ? (
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
        </div>
      </div>
    </MotionConfig>
  );
}
