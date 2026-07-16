"use client";

import { type ReactNode, useCallback, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { MovieCard } from "@/components/movies/MovieCard";
import { FilterToolbar, FilterSidebar } from "@/components/catalog/FilterBar";
import { hasFacets } from "@/lib/catalog/filter-bar-utils";
import { EmptyCatalog } from "@/components/catalog/EmptyCatalog";
import { Modal } from "@/components/primitives/Modal";
import { Pagination } from "@/components/primitives/Pagination";
import { Select } from "@/components/primitives/Select";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowDownUp, ChevronRight, Clock, HardDrive, Loader2, Plus, ScanSearch } from "lucide-react";
import { motion, AnimatePresence, MotionConfig, useScroll, useMotionValueEvent } from "motion/react";
import type { ArchiveMetrics, ArchiveTotals } from "@/lib/catalog/archive-metrics";
import { ARCHIVE_QUALITY_METRIC_DEFS } from "@/lib/catalog/archive-quality-metrics";
import { resolveCatalogSpotlightTier } from "@/lib/catalog/catalog-spotlight";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
import {
  formatArchiveTotalDuration,
  formatArchiveTotalSize,
} from "@/lib/shared/format";
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
  { value: "fileSize", label: "Размер файла" },
] as const;

const STATUS_TAB_CLASS = {
  active:
    "border-accent/55 bg-accent/12 text-accent shadow-[0_0_16px_rgba(232,176,90,0.55)]",
  inactive:
    "border-border bg-bg-surface/70 text-muted hover:border-border-strong hover:text-text hover:bg-bg-surface-hover",
} as const;

function statusTabClass(active: boolean): string {
  return `font-mono-tech inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors ${
    active ? STATUS_TAB_CLASS.active : STATUS_TAB_CLASS.inactive
  }`;
}

interface RailStatProps {
  icon: ReactNode;
  value: ReactNode;
  total?: ReactNode;
  label: ReactNode;
  stackedLabel?: [string, string];
  title?: string;
  interactive?: boolean;
  active?: boolean;
  elite?: boolean;
  onClick?: () => void;
}

/**
 * Instrument-rail cell for the archive console. Two visual registers split the
 * rail into two semantically distinct groups without extra labels:
 *
 *  - Filter cells (`interactive`) read as machined key-caps: accent-tinted icon
 *    chip, inset top highlight, hover lift + accent edge-glow, a chevron that
 *    fades in to signal drill-in, and the scan-sweep on the active state.
 *  - Total cells (display-only) read as a recessed readout strip: neutral slate
 *    chip, no border, no hover affordance, dimmer label. They sit in a darker
 *    recess so they visually sink below the floating key-caps.
 *
 * `stackedLabel` renders a two-line spec pair (HDR10 / HDR10+) inside a
 * fixed-height label slot so the rail stays aligned.
 */
function RailStat({
  icon,
  value,
  total,
  label,
  stackedLabel,
  title,
  interactive = false,
  active = false,
  elite = false,
  onClick,
}: RailStatProps) {
  const isFilter = interactive;
  const isRuby = elite;

  const frame = isFilter
    ? `group relative flex min-h-[3.75rem] items-center gap-2.5 overflow-hidden rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-left transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        active
          ? isRuby
            ? "border-crimson/55 bg-crimson/12 shadow-[0_0_24px_rgba(154,27,52,0.42),0_0_16px_rgba(154,27,52,0.34),inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "border-accent/50 bg-accent/10 shadow-[0_0_22px_rgba(232,176,90,0.40),inset_0_1px_0_rgba(255,255,255,0.08)]"
          : isRuby
            ? "border-crimson/30 bg-crimson-soft shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_14px_rgba(154,27,52,0.08)] hover:-translate-y-px hover:border-crimson/50 hover:bg-crimson/14 hover:shadow-[0_0_20px_rgba(154,27,52,0.28),inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "border-border-strong/45 bg-bg-surface/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-px hover:border-accent/45 hover:bg-bg-surface-hover/45 hover:shadow-[0_0_18px_rgba(232,176,90,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
      }`
    : "relative flex min-h-[3.75rem] items-center gap-2.5 rounded-none px-3.5 py-2.5 text-left";

  const chip = isFilter
    ? `flex h-7 w-7 shrink-0 items-center justify-center rounded-[calc(var(--radius-sm)-4px)] border transition-colors duration-300 ${
        active
          ? isRuby
            ? "border-crimson/60 bg-crimson/25 text-crimson-bright"
            : "border-accent/55 bg-accent/22 text-accent-bright"
          : isRuby
            ? "border-crimson/55 bg-crimson/18 text-crimson-bright group-hover:border-crimson/65 group-hover:bg-crimson/26"
            : "border-accent/40 bg-accent/10 text-accent group-hover:bg-accent/18"
      }`
    : "flex h-6 w-6 shrink-0 items-center justify-center rounded-[calc(var(--radius-sm)-6px)] border border-border/55 bg-bg-surface/40 text-muted";

  const valueClass = isFilter
    ? `font-display whitespace-nowrap text-xl font-bold tabular-nums leading-none transition-colors sm:text-2xl ${
        active
          ? isRuby
            ? "text-crimson-bright"
            : "text-accent-bright"
          : "text-text"
      }`
    : "font-display whitespace-nowrap text-base font-bold tabular-nums leading-none text-text sm:text-lg";

  const labelColor = active
    ? isRuby
      ? "text-crimson-bright"
      : "text-accent"
    : isFilter && isRuby
      ? "text-crimson-bright"
      : isFilter
        ? "text-muted"
        : "text-muted";
  const labelTypography =
    isFilter && isRuby
      ? "font-mono-tech text-[0.55rem] font-semibold tracking-[0.12em]"
      : "font-micro";
  const labelBlock = stackedLabel ? (
    <span className={`${labelTypography} flex min-h-[1.7rem] flex-col justify-center leading-[1.15] ${labelColor}`}>
      <span className="whitespace-nowrap">{stackedLabel[0]}</span>
      <span
        className={`whitespace-nowrap ${
          active
            ? isRuby
              ? "text-crimson-bright/90"
              : "text-accent/85"
            : "text-faint"
        }`}
      >
        {stackedLabel[1]}
      </span>
    </span>
  ) : (
    <span className={`${labelTypography} flex min-h-[1.7rem] items-center leading-none whitespace-nowrap ${labelColor}`}>
      {label}
    </span>
  );

  const content = (
    <>
      {active ? (
        <span
          className={`pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent to-transparent [animation:scan-h_3.5s_var(--ease)_infinite] motion-reduce:hidden ${
            isRuby ? "via-crimson-bright/12" : "via-accent-bright/12"
          }`}
          aria-hidden
        />
      ) : null}
      <span className={chip} aria-hidden>
        {icon}
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-1 overflow-hidden">
        <span className="flex min-w-0 items-baseline gap-1">
          <span className={valueClass}>
            {value}
          </span>
          {total != null ? (
            <span className="font-mono shrink-0 text-[0.58rem] tabular-nums text-faint">
              / {total}
            </span>
          ) : null}
        </span>
        {labelBlock}
      </span>
      {isFilter ? (
        <ChevronRight
          className={`absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 shrink-0 transition-opacity duration-300 ${
            active
              ? isRuby
                ? "text-crimson-bright opacity-80"
                : "text-accent-bright opacity-80"
              : isRuby
                ? "text-crimson-bright/70 opacity-0 group-hover:opacity-80"
                : "text-accent opacity-0 group-hover:opacity-80"
          }`}
          aria-hidden
        />
      ) : null}
    </>
  );

  if (!interactive) {
    return (
      <div className={frame} title={title}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={`${frame} focus-ring cursor-pointer active:scale-[0.98]`}
    >
      {content}
    </button>
  );
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
  archiveTotals?: ArchiveTotals;
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
  archiveMetrics = { gold: 0, hdr10: 0, elite: 0 },
  archiveTotals = { durationSeconds: 0, fileSizeBytes: 0 },
}: MovieCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "CATALOG";
  const [addOpen, setAddOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [facetsOpen, setFacetsOpen] = useState(false);
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
  // prevMoviesRef хранит `movies` предыдущего рендера — нужен, чтобы при
  // переходе page→page+1 в режиме more добавить старую страницу в накопление.
  const prevMoviesRef = useRef(movies);

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
      const oldPageMovies = prevMoviesRef.current;
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
  prevMoviesRef.current = movies;

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

  const sort = searchParams.get("sort") ?? "title";
  const order = searchParams.get("order") ?? "asc";

  const applySort = (nextSort: string, nextOrder: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSort === "title") params.delete("sort");
    else params.set("sort", nextSort);
    if (nextOrder === "asc") params.delete("order");
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

  const hasAnyMovies = totalCount > 0;

  const anyFacets =
    hasFacets(facets.resolutions) ||
    hasFacets(facets.genres) ||
    hasFacets(facets.russianChannelLayouts) ||
    hasFacets(facets.originalChannelLayouts) ||
    facets.russianAudioFormats.some((f) => f.count > 0) ||
    facets.originalAudioFormats.some((f) => f.count > 0);

  // The property sidebar steals ~340px on lg+, so the grid drops one column
  // per tier when it's open to keep cards comfortably sized. Below lg the
  // sidebar is an overlay, so column counts are unchanged.
  const gridCols = facetsOpen
    ? "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 3xl:grid-cols-5 4xl:grid-cols-6"
    : "grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7";

  return (
    <MotionConfig reducedMotion="user">
      <SpotlightTier tier={catalogSpotlight} />
      {isPending ? <div className="catalog-loading-bar" aria-hidden /> : null}
      {/* Archive console - compact integrated top. The page-level "Каталог /
          Личный архив" labels were dropped on purpose: the SiteHeader already
          carries the brand and the active status tab already carries the view,
          so repeating them here only burned vertical space. What stays is what
          the user actually reads here: the status tabs, the primary actions,
          and the archive quality index rendered as a hairline instrument rail
          instead of two rows of heavy cards. */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mb-5"
      >
        <div className="relative rounded-[var(--radius)] p-1 ring-1 ring-border-strong/60 bg-gradient-to-b from-white/[0.05] via-transparent to-transparent">
          <div className="glass-frame-top-glow relative overflow-hidden rounded-[calc(var(--radius)-4px)] border border-border/60 bg-bg-glass/70 backdrop-blur-md">
            {/* Row 1 - status tabs (left) + primary actions (right) */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href="/?status=CATALOG" className={statusTabClass(isCatalog)}>
                  каталог · <span className="tabular-nums">{catalogCount}</span>
                </Link>
                <Link href="/?status=DRAFT" className={statusTabClass(isDraftView)}>
                  черновики · <span className="tabular-nums">{draftCount}</span>
                </Link>
                <Link href="/?status=EXCLUDED" className={statusTabClass(isExcludedView)}>
                  скрытые · <span className="tabular-nums">{excludedCount}</span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(true)}
                  className="focus-ring group/btn flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border-strong bg-bg-surface/80 px-3.5 py-1.5 text-sm font-medium text-text backdrop-blur-md transition-all duration-300 hover:border-neural/55 hover:text-neural-bright hover:bg-bg-surface-hover hover:shadow-[0_0_18px_rgba(139,92,246,0.55)] active:scale-[0.97]"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Добавить вручную</span>
                  <span className="sm:hidden">Добавить</span>
                </button>
                <Link
                  href="/scan"
                  className="focus-ring group/btn relative flex min-h-9 cursor-pointer items-center justify-center gap-1.5 overflow-hidden rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-bg-deep shadow-[0_0_22px_rgba(232,176,90,0.55)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_32px_rgba(232,176,90,0.55)] active:scale-[0.97]"
                >
                  <ScanSearch className="h-4 w-4" aria-hidden />
                  Скан
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                    aria-hidden
                  />
                </Link>
              </div>
            </div>

            {/* Row 2 - archive quality index rail (catalog view only).
                Two registers split the rail without extra labels: the three
                quality filters render as floating machined key-caps (accent
                chips, hover lift, drill-in chevron, scan-sweep on active),
                while duration / size render as a recessed hairline readout
                strip (neutral chips, no hover). A functional hairline divider
                separates the groups; on mobile it stacks vertically. */}
            {isCatalog ? (
              <>
                <div className="h-px bg-border/60" aria-hidden />
                <div className="flex flex-col p-2 md:flex-row md:items-stretch">
                  <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3 md:flex-[3]">
                    {ARCHIVE_QUALITY_METRIC_DEFS.map((def) => {
                      const Icon = def.icon;
                      const active = def.isActive(filterParams, isCatalog);
                      return (
                        <RailStat
                          key={def.key}
                          icon={<Icon className="h-4 w-4" />}
                          value={archiveMetrics[def.key]}
                          total={catalogCount}
                          label={def.shortLabel ?? def.label}
                          stackedLabel={def.stackedLabel}
                          title={`${def.label}${def.caption ? ` · ${def.caption}` : ""} · нажмите, чтобы отфильтровать`}
                          interactive
                          active={active}
                          elite={def.elite}
                          onClick={() => applyFilter(def.toggleFilter(active))}
                        />
                      );
                    })}
                  </div>
                  <div
                    className="my-1.5 h-px bg-border/60 md:mx-1.5 md:my-0 md:h-auto md:w-px"
                    aria-hidden
                  />
                  <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-sm)] bg-border/40 md:flex-[3]">
                    <RailStat
                      icon={<Clock className="h-4 w-4" />}
                      value={formatArchiveTotalDuration(archiveTotals.durationSeconds) ?? "-"}
                      label="хронометраж"
                      title="Суммарный хронометраж каталога"
                    />
                    <RailStat
                      icon={<HardDrive className="h-4 w-4" />}
                      value={formatArchiveTotalSize(archiveTotals.fileSizeBytes) ?? "-"}
                      label="объём"
                      title="Файлы релизов в каталоге"
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </motion.section>

      {/* Sidebar + catalog share one row so both sticky at top-4 side-by-side.
          Main column uses self-start so position:sticky works inside flex.
          The SiteHeader is non-sticky, so the sticky deck/sidebar pin near the
          viewport top without reserving space for a header. */}
      <div className="flex items-start gap-5 lg:gap-6">
        <AnimatePresence initial={false}>
          {facetsOpen && anyFacets ? (
            <>
              <motion.div
                key="facet-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 bg-bg-deep/70 backdrop-blur-sm lg:hidden"
                onClick={() => setFacetsOpen(false)}
                aria-hidden
              />
              <motion.aside
                key="facet-sidebar"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-[360px] flex-col overflow-hidden lg:sticky lg:top-4 lg:z-20 lg:inset-auto lg:h-[calc(100dvh-2rem)] lg:w-[320px] lg:max-w-none lg:shrink-0 lg:self-start xl:w-[340px]"
              >
                <FilterSidebar
                  facets={facets}
                  updateParams={updateParams}
                  anyFacets={anyFacets}
                  onClose={() => setFacetsOpen(false)}
                />
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>

        <div className="min-w-0 w-full flex-1 self-start">
          <div
            ref={deckRef}
            className={`catalog-sticky-deck sticky top-4 z-30 border-b border-border/40 ${
              deckScrolled ? "catalog-sticky-deck--active border-b-transparent" : ""
            }`}
          >
            <FilterToolbar
              updateParams={updateParams}
              anyFacets={anyFacets}
              facetsOpen={facetsOpen}
              onToggleFacets={() => setFacetsOpen((open) => !open)}
              className="mb-2"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span
                  className="font-display text-2xl font-bold tabular-nums text-accent"
                  style={{
                    textShadow:
                      "0 0 18px rgba(232,176,90,0.55), 0 0 36px rgba(139,92,246,0.55)",
                  }}
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
                    className="focus-ring flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border bg-bg-elevated/80 px-3 py-1.5 text-xs text-muted backdrop-blur-md transition-all duration-200 hover:border-accent/55 hover:text-accent hover:bg-bg-surface-hover active:scale-[0.97]"
                    aria-label={
                      order === "asc"
                        ? "По возрастанию — нажать для убывания"
                        : "По убыванию — нажать для возрастания"
                    }
                    title={order === "asc" ? "По возрастанию" : "По убыванию"}
                  >
                    <ArrowDownUp className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-mono-tech">
                      {order === "asc" ? "А→Я" : "Я→А"}
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="pt-4">
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
              <div className={gridCols} aria-busy={isPending}>
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
                    disabled={isPending}
                    className="focus-ring group/btn relative flex min-h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-border-strong bg-bg-surface/80 px-6 py-2.5 text-sm font-medium text-text backdrop-blur-md transition-all duration-300 hover:border-accent/55 hover:text-accent hover:shadow-[0_0_26px_rgba(232,176,90,0.55),0_0_20px_rgba(139,92,246,0.55)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
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
                    <span
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-accent-bright/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full"
                      aria-hidden
                    />
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
      </div>

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
