"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ChevronDown,
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

interface FilterBarProps {
  facets: FilterBarFacets;
  updateParams: (updates: Record<string, string | null>) => void;
}

export function FilterBar({ facets, updateParams }: FilterBarProps) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [facetsOpen, setFacetsOpen] = useState(false);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trimInput(q);
    if (trimmed !== q) setQ(trimmed);
    updateParams({ q: trimmed || null });
  };

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
  const anyFacets = showResolution || showGenres || showAudio;

  const activeCount = countActiveFilters(searchParams);
  const facetActiveCount = countFacetFilters(searchParams);

  const resetFilters = () => {
    setQ("");
    updateParams(CLEAR_ALL_FILTER_PARAMS);
  };

  const resetFacetFilters = () => {
    updateParams(CLEAR_FACET_PARAMS);
  };

  // Ordered, de-duplicated options derived from facets.
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

  return (
    <div className="mb-6 space-y-3">
      {/* Toolbar — search + inline selects in one strip */}
      <form
        onSubmit={handleSearch}
        className="surface-card flex flex-col gap-2 p-2 lg:flex-row lg:items-center"
      >
        <div className="relative flex-1">
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
            className="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated py-2 pl-10 pr-3 text-sm text-text placeholder:text-faint"
            aria-label="Поиск по названию"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
        </div>
      </form>

      {/* Active filters + facet trigger row */}
      <div className="flex flex-wrap items-center gap-2">
        {anyFacets ? (
          <button
            type="button"
            onClick={() => setFacetsOpen((open) => !open)}
            className="focus-ring font-mono-tech inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-border bg-bg-surface px-3 text-xs text-muted transition-all duration-200 hover:border-accent/40 hover:text-text"
            aria-expanded={facetsOpen}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            фильтры по свойствам
            {facetActiveCount > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent/20 px-1 text-[0.6rem] text-accent">
                {facetActiveCount}
              </span>
            ) : null}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                facetsOpen ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>
        ) : null}

        <AnimatePresence>
          {activeCount > 0 ? (
            <motion.button
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              type="button"
              onClick={resetFilters}
              className="focus-ring font-mono-tech inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 text-xs text-accent transition-colors hover:bg-accent/10"
              aria-label="Сбросить все фильтры"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              сбросить · {activeCount}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Facet drawer */}
      <AnimatePresence initial={false}>
        {facetsOpen && anyFacets ? (
          <motion.div
            key="facet-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="surface-card p-5">
              {/* Slim panel header */}
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal
                    className="h-3.5 w-3.5 text-accent/70"
                    aria-hidden
                  />
                  <span className="font-mono-tech text-faint">
                    выбор по свойствам
                  </span>
                </div>
                {facetActiveCount > 0 ? (
                  <button
                    type="button"
                    onClick={resetFacetFilters}
                    className="focus-ring font-mono-tech rounded-full text-[0.6rem] text-muted transition-colors hover:text-accent"
                  >
                    очистить · {facetActiveCount}
                  </button>
                ) : null}
              </div>

              <div className="space-y-6">
                {/* 01 — Genres */}
                {showGenres ? (
                  <FacetSection
                    index="01"
                    icon={<Clapperboard className="h-4 w-4" />}
                    title="жанры"
                    hint="можно несколько"
                    headerActions={
                      <GenreSortToggle value={genreSort} onChange={setGenreSort} />
                    }
                  >
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {sortedGenres.map((f) => (
                          <Chip
                            key={f.value}
                            active={activeGenres.includes(f.value!)}
                            count={f.count}
                            onClick={() =>
                              updateParams({
                                genre:
                                  toggleMulti(activeGenres, f.value!).join(
                                    ",",
                                  ) || null,
                              })
                            }
                            className="w-full justify-center"
                          >
                            {displayGenreName(f.value)}
                          </Chip>
                        ))}
                    </div>
                  </FacetSection>
                ) : null}

                {showGenres && showResolution ? <Divider /> : null}

                {/* 02 + 03 — Resolution & Dynamic range */}
                {showResolution && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {showResolution ? (
                      <FacetSection
                        index="02"
                        icon={<MonitorPlay className="h-4 w-4" />}
                        title="разрешение"
                      >
                        <QualityLadder
                          options={resolutionOptions}
                          active={activeResolutions}
                          counts={resolutionCounts}
                          onToggle={(v) =>
                            updateParams({
                              resolution:
                                toggleMulti(activeResolutions, v).join(",") ||
                                null,
                            })
                          }
                        />
                      </FacetSection>
                    ) : null}

                    <FacetSection
                      index="03"
                      icon={<Sun className="h-4 w-4" />}
                      title="динамический диапазон"
                      hint="HDR"
                    >
                      <div className="flex flex-wrap gap-2">
                        <Chip
                          active={hdrAnyActive}
                          onClick={() => toggleHdr(HDR_ANY)}
                        >
                          Любой HDR
                        </Chip>
                        {HDR_OPTIONS.map((opt) => (
                          <Chip
                            key={opt.value}
                            active={
                              !hdrAnyActive && activeHdr.includes(opt.value)
                            }
                            onClick={() => toggleHdr(opt.value)}
                          >
                            {opt.label}
                          </Chip>
                        ))}
                      </div>
                    </FacetSection>
                  </div>
                )}

                {showResolution && showAudio ? (
                  <Divider />
                ) : null}

                {/* 04 — Audio (Russian dub vs original, with translation type) */}
                {showAudio ? (
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-[0.62rem] uppercase tracking-wider text-faint/70 tabular-nums">
                        04
                      </span>
                      <span className="text-accent/80" aria-hidden>
                        <Waves className="h-4 w-4" />
                      </span>
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
                          className={`focus-ring ml-0.5 inline-flex min-h-8 items-center rounded-[calc(var(--radius-sm)-3px)] px-3 py-1 text-xs transition-all ${
                            audioScope === "rus"
                              ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
                              : "text-muted hover:text-text"
                          }`}
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
                          className={`focus-ring ml-0.5 inline-flex min-h-8 items-center rounded-[calc(var(--radius-sm)-3px)] px-3 py-1 text-xs transition-all ${
                            audioScope === "original"
                              ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
                              : "text-muted hover:text-text"
                          }`}
                        >
                          Оригинал
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {showTranslationTypes ? (
                        <div className="space-y-2">
                          <p className="font-mono-tech text-[0.6rem] text-faint/70">
                            тип озвучки
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {translationOptions.map((f) => (
                              <Chip
                                key={f.value}
                                active={activeAudioTranslations.includes(
                                  f.value!,
                                )}
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
                          <p className="font-mono-tech text-[0.6rem] text-faint/70">
                            каналы
                          </p>
                          <QualityLadder
                            options={channelOptions}
                            active={activeAudioChannels}
                            counts={channelCounts}
                            onToggle={(v) =>
                              updateParams({
                                audioChannels:
                                  toggleMulti(activeAudioChannels, v).join(
                                    ",",
                                  ) || null,
                              })
                            }
                          />
                        </div>
                      ) : null}

                      {showAudioFormats ? (
                        <div className="space-y-2">
                          <p className="font-mono-tech text-[0.6rem] text-faint/70">
                            кодек
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {audioFormatOptions.map((fmt) => (
                              <Chip
                                key={fmt.value}
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
                        <p className="font-mono-tech text-[0.6rem] text-faint/70">
                          объектный звук
                        </p>
                        <Chip
                          active={premiumAudioActive}
                          onClick={() =>
                            updateParams({
                              premiumAudio: premiumAudioActive ? null : "true",
                            })
                          }
                        >
                          <Sparkles className="h-3.5 w-3.5" aria-hidden />
                          {audioScope === "rus"
                            ? "Рус. Atmos · DTS:X"
                            : "Atmos · DTS:X"}
                        </Chip>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
