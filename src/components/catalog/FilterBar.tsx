"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Clapperboard,
  MonitorPlay,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Waves,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Chip } from "@/components/primitives/Chip";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import {
  MinRatingFilter,
  MultiReleaseFilter,
  parseMinRating,
  parseWatchedFilter,
  WatchedFilter,
} from "@/components/catalog/FilterToolbarControls";
import {
  AUDIO_TRANSLATION_TYPES,
  CHANNEL_LAYOUTS,
  RESOLUTIONS,
  displayGenreName,
} from "@/lib/shared/dictionaries";
import { RUS_AUDIO_FORMATS } from "@/lib/catalog/russian-audio-formats";
import { trimInput } from "@/lib/shared/text-trim";
import {
  sortGenreFacets,
  type GenreSortMode,
} from "@/lib/catalog/genre-facet-sort";
import {
  CLEAR_ALL_FILTER_PARAMS,
  CLEAR_FACET_PARAMS,
  countActiveFilters,
  countFacetFilters,
  facetCountMap,
  hasFacets,
  parseMulti,
  sortByDict,
  toggleMulti,
  type FilterBarFacets,
} from "@/lib/catalog/filter-bar-utils";
import {
  Divider,
  FacetSection,
  GenreSortToggle,
  HDR_ANY,
  HDR_OPTIONS,
  QualityLadder,
  SEGMENT_SHELL,
  translationLabel,
} from "@/components/catalog/FilterFacetParts";

interface FilterToolbarProps {
  updateParams: (updates: Record<string, string | null>) => void;
  anyFacets: boolean;
  facetsOpen: boolean;
  onToggleFacets: () => void;
  className?: string;
}

export function FilterToolbar({
  updateParams,
  anyFacets,
  facetsOpen,
  onToggleFacets,
  className = "",
}: FilterToolbarProps) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  const activeCount = countActiveFilters(searchParams);
  const facetActiveCount = countFacetFilters(searchParams);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trimInput(q);
    if (trimmed !== q) setQ(trimmed);
    updateParams({ q: trimmed || null });
  };

  const resetFilters = () => {
    setQ("");
    updateParams(CLEAR_ALL_FILTER_PARAMS);
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`surface-card flex flex-col gap-2 p-2 lg:flex-row lg:items-center ${className}`}
    >
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent/60"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onBlur={() => {
            const trimmed = trimInput(q);
            if (trimmed !== q) setQ(trimmed);
          }}
          placeholder="Поиск по названию…"
          className="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated/80 py-2 pl-10 pr-3 text-sm text-text backdrop-blur-md placeholder:text-faint"
          aria-label="Поиск по названию"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {anyFacets ? (
          <div className={`${SEGMENT_SHELL} p-0.5`}>
            <HoverTooltip
              className="inline-flex"
              content={
                <div className="max-w-52 px-3 py-2">
                  <p className="text-xs font-medium text-text">
                    Фильтры по свойствам
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted">
                    Жанры, разрешение, HDR и звук
                  </p>
                </div>
              }
            >
              <button
                type="button"
                onClick={onToggleFacets}
                aria-expanded={facetsOpen}
                aria-controls="catalog-facet-sidebar"
                aria-label={
                  facetsOpen
                    ? "Скрыть фильтры по свойствам"
                    : "Открыть фильтры по свойствам"
                }
                className={`focus-ring relative inline-flex min-h-8 min-w-8 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] transition-colors ${
                  facetsOpen
                    ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
                    : "text-muted hover:bg-bg-surface hover:text-text"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
                {facetActiveCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-0.5 text-[0.55rem] font-medium tabular-nums text-bg-deep">
                    {facetActiveCount}
                  </span>
                ) : null}
              </button>
            </HoverTooltip>
          </div>
        ) : null}
        <WatchedFilter
          value={parseWatchedFilter(searchParams.get("watched"))}
          onChange={(v) => updateParams({ watched: v === "all" ? null : v })}
        />
        <MultiReleaseFilter
          active={searchParams.get("multiRelease") === "true"}
          onChange={(on) =>
            updateParams({ multiRelease: on ? "true" : null })
          }
        />
        <MinRatingFilter
          value={parseMinRating(searchParams.get("minRating"))}
          onChange={(v) => updateParams({ minRating: v?.toString() ?? null })}
        />
        <AnimatePresence>
          {activeCount > 0 ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              type="button"
              onClick={resetFilters}
              className="focus-ring font-mono-tech inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 text-xs text-accent transition-colors hover:bg-accent/10"
              aria-label="Сбросить все фильтры"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              сбросить · {activeCount}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </form>
  );
}

interface FilterSidebarProps {
  facets: FilterBarFacets;
  updateParams: (updates: Record<string, string | null>) => void;
  anyFacets: boolean;
  onClose: () => void;
}

export function FilterSidebar({
  facets,
  updateParams,
  anyFacets,
  onClose,
}: FilterSidebarProps) {
  const searchParams = useSearchParams();
  const [genreSort, setGenreSort] = useState<GenreSortMode>("alpha");

  const activeResolutions = useMemo(
    () => parseMulti(searchParams.get("resolution")),
    [searchParams],
  );
  const activeGenres = useMemo(
    () => parseMulti(searchParams.get("genre")),
    [searchParams],
  );
  const audioScope =
    searchParams.get("audioScope") === "original" ? "original" : "rus";
  const activeAudioChannels = useMemo(
    () => parseMulti(searchParams.get("audioChannels")),
    [searchParams],
  );
  const activeAudioFormats = useMemo(
    () => parseMulti(searchParams.get("audioFormat")),
    [searchParams],
  );
  const activeAudioTranslations = useMemo(
    () => parseMulti(searchParams.get("audioTranslation")),
    [searchParams],
  );
  const activeHdr = useMemo(
    () => parseMulti(searchParams.get("hdr")),
    [searchParams],
  );
  const hdrAnyActive = activeHdr.includes(HDR_ANY);
  const premiumAudioActive = searchParams.get("premiumAudio") === "true";

  const showResolution = hasFacets(facets.resolutions);
  const showGenres = hasFacets(facets.genres);
  const sortedGenres = useMemo(
    () => sortGenreFacets(facets.genres, genreSort),
    [facets.genres, genreSort],
  );

  // Audio facets are scope-aware: channels + codec constrain whichever track
  // the user is targeting (Russian dub or original), so the options and counts
  // swap with the toggle. Translation type only exists for the Russian scope.
  const channelLayoutFacets =
    audioScope === "rus"
      ? facets.russianChannelLayouts
      : facets.originalChannelLayouts;
  const audioFormatFacets =
    audioScope === "rus"
      ? facets.russianAudioFormats
      : facets.originalAudioFormats;
  const showChannelLayouts = hasFacets(channelLayoutFacets);
  const channelCounts = useMemo(
    () => facetCountMap(channelLayoutFacets),
    [channelLayoutFacets],
  );
  const channelOptions = useMemo(
    () =>
      sortByDict(channelLayoutFacets, CHANNEL_LAYOUTS).map((f) => ({
        value: f.value!,
        label: f.value!,
      })),
    [channelLayoutFacets],
  );
  const audioFormatCounts = useMemo(
    () => facetCountMap(audioFormatFacets),
    [audioFormatFacets],
  );
  const audioFormatOptions = useMemo(
    () =>
      RUS_AUDIO_FORMATS.filter((f) => (audioFormatCounts.get(f.value) ?? 0) > 0),
    [audioFormatCounts],
  );
  const showAudioFormats = audioFormatOptions.length > 0;
  const translationOptions = useMemo(
    () => sortByDict(facets.russianTranslationTypes, AUDIO_TRANSLATION_TYPES),
    [facets.russianTranslationTypes],
  );
  const showTranslationTypes =
    audioScope === "rus" && translationOptions.length > 0;
  const showAudio =
    hasFacets(facets.russianChannelLayouts) ||
    hasFacets(facets.originalChannelLayouts) ||
    facets.russianAudioFormats.some((f) => f.count > 0) ||
    facets.originalAudioFormats.some((f) => f.count > 0);

  const facetActiveCount = countFacetFilters(searchParams);

  const resetFacetFilters = () => {
    updateParams(CLEAR_FACET_PARAMS);
  };

  const resolutionOptions = useMemo(
    () =>
      sortByDict(facets.resolutions, RESOLUTIONS).map((f) => ({
        value: f.value!,
        label: f.value!,
      })),
    [facets.resolutions],
  );
  const resolutionCounts = useMemo(
    () => facetCountMap(facets.resolutions),
    [facets.resolutions],
  );

  const toggleHdr = (value: string) => {
    let next: string[];
    if (value === HDR_ANY) {
      next = hdrAnyActive ? [] : [HDR_ANY];
    } else {
      const withoutAny = activeHdr.filter((v) => v !== HDR_ANY);
      next = toggleMulti(withoutAny, value);
    }
    updateParams({ hdr: next.join(",") || null });
  };

  if (!anyFacets) return null;

  const scopeButtonClass = (active: boolean) =>
    `focus-ring inline-flex min-h-8 items-center rounded-full px-2.5 py-1 text-[0.72rem] transition-all duration-200 ${
      active
        ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
        : "text-muted hover:bg-bg-surface hover:text-text"
    }`;

  return (
    <div
      id="catalog-facet-sidebar"
      className="surface-card glass-frame-top-glow flex h-full min-h-0 flex-col overflow-hidden p-4"
    >
      {/* Slim panel header — pinned, scroll happens below */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="h-3.5 w-3.5 text-accent/70"
            aria-hidden
          />
          <span className="font-mono-tech text-faint">выбор по свойствам</span>
        </div>
        <div className="flex items-center gap-2">
          {facetActiveCount > 0 ? (
            <button
              type="button"
              onClick={resetFacetFilters}
              className="focus-ring font-mono-tech rounded-full text-[0.6rem] text-muted transition-colors hover:text-accent"
            >
              очистить · {facetActiveCount}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Скрыть панель фильтров"
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain scroll-subtle pr-1">
        {/* 01 — Genres */}
        {showGenres ? (
          <FacetSection
            index="01"
            icon={<Clapperboard className="h-3.5 w-3.5" />}
            title="жанры"
            hint="можно несколько"
            headerActions={
              <GenreSortToggle value={genreSort} onChange={setGenreSort} />
            }
          >
            <div className="flex flex-wrap gap-1.5">
              {sortedGenres.map((f) => (
                <Chip
                  key={f.value}
                  size="sm"
                  active={activeGenres.includes(f.value!)}
                  count={f.count}
                  onClick={() =>
                    updateParams({
                      genre:
                        toggleMulti(activeGenres, f.value!).join(",") || null,
                    })
                  }
                >
                  {displayGenreName(f.value)}
                </Chip>
              ))}
            </div>
          </FacetSection>
        ) : null}

        {showGenres && showResolution ? <Divider /> : null}

        {/* 02 — Resolution */}
        {showResolution ? (
          <FacetSection
            index="02"
            icon={<MonitorPlay className="h-3.5 w-3.5" />}
            title="разрешение"
          >
            <QualityLadder
              options={resolutionOptions}
              active={activeResolutions}
              counts={resolutionCounts}
              onToggle={(v) =>
                updateParams({
                  resolution:
                    toggleMulti(activeResolutions, v).join(",") || null,
                })
              }
            />
          </FacetSection>
        ) : null}

        {showResolution ? <Divider /> : null}

        {/* 03 — Dynamic range */}
        <FacetSection
          index="03"
          icon={<Sun className="h-3.5 w-3.5" />}
          title="динамический диапазон"
          hint="HDR"
        >
          <div className="flex flex-wrap gap-1.5">
            <Chip
              size="sm"
              active={hdrAnyActive}
              onClick={() => toggleHdr(HDR_ANY)}
            >
              Любой HDR
            </Chip>
            {HDR_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                size="sm"
                active={!hdrAnyActive && activeHdr.includes(opt.value)}
                onClick={() => toggleHdr(opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </FacetSection>

        {showAudio ? <Divider /> : null}

        {/* 04 — Audio (Russian dub vs original, with translation type) */}
        {showAudio ? (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.6rem] uppercase tracking-wider text-faint/70 tabular-nums">
                04
              </span>
              <span className="text-accent/80" aria-hidden>
                <Waves className="h-3.5 w-3.5" />
              </span>
              <h3 className="font-mono-tech text-faint">звук</h3>
            </div>

            <div className={`${SEGMENT_SHELL} p-0.5`}>
              <button
                type="button"
                onClick={() =>
                  updateParams({
                    audioScope: "rus",
                    audioChannels: null,
                    audioFormat: null,
                    audioTranslation: null,
                  })
                }
                aria-pressed={audioScope === "rus"}
                className={scopeButtonClass(audioScope === "rus")}
              >
                Русская дорожка
              </button>
              <button
                type="button"
                onClick={() =>
                  updateParams({
                    audioScope: "original",
                    audioChannels: null,
                    audioFormat: null,
                    audioTranslation: null,
                  })
                }
                aria-pressed={audioScope === "original"}
                className={`ml-0.5 ${scopeButtonClass(audioScope === "original")}`}
              >
                Оригинал
              </button>
            </div>

            <div className="space-y-4">
              {showTranslationTypes ? (
                <div className="space-y-2">
                  <p className="font-micro text-faint/70">тип озвучки</p>
                  <div className="flex flex-wrap gap-1.5">
                    {translationOptions.map((f) => (
                      <Chip
                        key={f.value}
                        size="sm"
                        active={activeAudioTranslations.includes(f.value!)}
                        count={f.count}
                        onClick={() =>
                          updateParams({
                            audioTranslation:
                              toggleMulti(
                                activeAudioTranslations,
                                f.value!,
                              ).join(",") || null,
                          })
                        }
                      >
                        {translationLabel(f.value!)}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}

              {showChannelLayouts ? (
                <div className="space-y-2">
                  <p className="font-micro text-faint/70">каналы</p>
                  <QualityLadder
                    options={channelOptions}
                    active={activeAudioChannels}
                    counts={channelCounts}
                    onToggle={(v) =>
                      updateParams({
                        audioChannels:
                          toggleMulti(activeAudioChannels, v).join(",") || null,
                      })
                    }
                  />
                </div>
              ) : null}

              {showAudioFormats ? (
                <div className="space-y-2">
                  <p className="font-micro text-faint/70">кодек</p>
                  <div className="flex flex-wrap gap-1.5">
                    {audioFormatOptions.map((fmt) => (
                      <Chip
                        key={fmt.value}
                        size="sm"
                        active={activeAudioFormats.includes(fmt.value)}
                        count={audioFormatCounts.get(fmt.value)}
                        onClick={() =>
                          updateParams({
                            audioFormat:
                              toggleMulti(activeAudioFormats, fmt.value).join(
                                ",",
                              ) || null,
                          })
                        }
                      >
                        {fmt.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <p className="font-micro text-faint/70">объектный звук</p>
                <Chip
                  size="sm"
                  active={premiumAudioActive}
                  onClick={() =>
                    updateParams({
                      premiumAudio: premiumAudioActive ? null : "true",
                    })
                  }
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {audioScope === "rus" ? "Рус. Atmos · DTS:X" : "Atmos · DTS:X"}
                </Chip>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
