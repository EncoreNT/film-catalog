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
import { Chip } from "./primitives/Chip";
import { Select } from "./primitives/Select";
import { RatingStepper } from "./RatingStepper";
import {
  AUDIO_TRANSLATION_TYPES,
  CHANNEL_LAYOUTS,
  RESOLUTIONS,
  genreLabel,
} from "@/lib/dictionaries";
import { RUS_AUDIO_FORMATS } from "@/lib/russian-audio-formats";
import { trimInput } from "@/lib/text-trim";

const FILTER_DEFAULTS: Record<string, string> = {
  sort: "title",
  watched: "all",
};

// Property-facet param keys rendered inside the collapsible panel.
const FACET_KEYS = [
  "resolution",
  "genre",
  "audioChannels",
  "audioFormat",
  "audioTranslation",
] as const;
const SCALAR_FACET_KEYS = ["hdr", "premiumAudio"] as const;
const SCALAR_KEYS = ["q", "minRating", ...SCALAR_FACET_KEYS] as const;

function countActiveFilters(params: URLSearchParams): number {
  let n = 0;
  for (const key of SCALAR_KEYS) {
    if (params.has(key)) n++;
  }
  for (const key of FACET_KEYS) {
    if (params.has(key)) n++;
  }
  for (const [key, def] of Object.entries(FILTER_DEFAULTS)) {
    const v = params.get(key);
    if (v && v !== def) n++;
  }
  return n;
}

function countFacetFilters(params: URLSearchParams): number {
  let n = 0;
  for (const key of FACET_KEYS) {
    if (params.has(key)) n++;
  }
  for (const key of SCALAR_FACET_KEYS) {
    if (params.has(key)) n++;
  }
  return n;
}

interface Facet {
  value: string | null;
  count: number;
}

interface FilterBarProps {
  facets: {
    resolutions: Facet[];
    russianChannelLayouts: Facet[];
    originalChannelLayouts: Facet[];
    russianTranslationTypes: Facet[];
    russianAudioFormats: Facet[];
    originalAudioFormats: Facet[];
    genres: Facet[];
  };
  updateParams: (updates: Record<string, string | null>) => void;
}

function parseMulti(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

function toggleMulti(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

function hasFacets(facets: Facet[]): boolean {
  return facets.some((f) => f.value && f.count > 0);
}

function dictOrder(value: string, dict: { value: string }[]): number {
  const idx = dict.findIndex(
    (d) => d.value.toLowerCase() === value.toLowerCase(),
  );
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

function sortByDict<T extends { value: string | null }>(
  items: T[],
  dict: { value: string }[],
): T[] {
  return [...items]
    .filter((f) => f.value)
    .sort((a, b) => dictOrder(a.value!, dict) - dictOrder(b.value!, dict));
}

const translationLabel = (value: string) =>
  AUDIO_TRANSLATION_TYPES.find((t) => t.value === value)?.label ?? value;

const HDR_OPTIONS = [
  { value: "HDR10", label: "HDR10" },
  { value: "HDR10+", label: "HDR10+" },
  { value: "DolbyVision", label: "Dolby Vision" },
  { value: "HLG", label: "HLG" },
] as const;
const HDR_ANY = "HDR_ANY";

function FacetSection({
  index,
  icon,
  title,
  hint,
  children,
}: {
  index: string;
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[0.62rem] uppercase tracking-wider text-faint/70 tabular-nums">
          {index}
        </span>
        <span className="text-accent/80" aria-hidden>
          {icon}
        </span>
        <h3 className="font-mono-tech text-faint">{title}</h3>
        {hint ? (
          <span className="ml-auto font-mono-tech text-[0.6rem] text-faint/70">
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function QualityLadder({
  options,
  active,
  counts,
  onToggle,
}: {
  options: { value: string; label: string }[];
  active: string[];
  counts: Map<string, number>;
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="inline-flex flex-wrap rounded-[var(--radius-sm)] border border-border bg-bg-elevated/50 p-1">
      {options.map((opt, i) => {
        const on = active.includes(opt.value);
        const count = counts.get(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            aria-pressed={on}
            className={`focus-ring inline-flex min-h-9 items-center gap-1.5 rounded-[calc(var(--radius-sm)-3px)] px-3 py-1.5 text-xs transition-all duration-200 ${
              i > 0 ? "ml-0.5" : ""
            } ${
              on
                ? "bg-accent/15 text-accent ring-1 ring-inset ring-accent/40"
                : "text-muted hover:bg-bg-surface hover:text-text"
            }`}
          >
            <span className={on ? "text-accent" : "text-text/90"}>
              {opt.label}
            </span>
            {count != null ? (
              <span
                className={`tabular-nums text-[0.6rem] ${
                  on ? "text-accent/70" : "text-faint"
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Divider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
  );
}

export function FilterBar({ facets, updateParams }: FilterBarProps) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [facetsOpen, setFacetsOpen] = useState(false);

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
    () =>
      new Map(
        channelLayoutFacets
          .filter((f) => f.value)
          .map((f) => [f.value!, f.count]),
      ),
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
    () =>
      new Map(
        audioFormatFacets
          .filter((f) => f.value)
          .map((f) => [f.value!, f.count]),
      ),
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
    updateParams({
      q: null,
      minRating: null,
      hdr: null,
      premiumAudio: null,
      resolution: null,
      language: null,
      channelLayout: null,
      subtitleLang: null,
      genre: null,
      audioScope: null,
      audioChannels: null,
      audioFormat: null,
      audioTranslation: null,
      sort: null,
      watched: null,
    });
  };

  const resetFacetFilters = () => {
    updateParams({
      resolution: null,
      genre: null,
      hdr: null,
      premiumAudio: null,
      audioScope: null,
      audioChannels: null,
      audioFormat: null,
      audioTranslation: null,
      language: null,
      channelLayout: null,
      subtitleLang: null,
    });
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
    () =>
      new Map(
        facets.resolutions
          .filter((f) => f.value)
          .map((f) => [f.value!, f.count]),
      ),
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
        <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
          <Select
            compact
            label="Просмотр"
            value={searchParams.get("watched") ?? "all"}
            onChange={(v) => updateParams({ watched: v })}
            preserveOrder
            options={[
              { value: "all", label: "Все" },
              { value: "watched", label: "Просмотренные" },
              { value: "unwatched", label: "Непросмотренные" },
            ]}
          />
          <div className="lg:w-44">
            <RatingStepper
              compact
              label="Мин. оценка"
              min={1}
              max={10}
              value={
                searchParams.get("minRating")
                  ? parseInt(searchParams.get("minRating")!, 10)
                  : null
              }
              onChange={(v) => updateParams({ minRating: v?.toString() ?? null })}
            />
          </div>
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
                  >
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {facets.genres
                        .filter((f) => f.value)
                        .map((f) => (
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
                            {genreLabel(f.value) ?? f.value}
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
                      <div className="inline-flex rounded-[var(--radius-sm)] border border-border bg-bg-elevated/50 p-0.5">
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

                      {audioScope === "rus" ? (
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
                            <Sparkles
                              className="h-3.5 w-3.5"
                              aria-hidden
                            />
                            Рус. Atmos · DTS:X
                          </Chip>
                        </div>
                      ) : null}
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
