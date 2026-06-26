"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Chip } from "./primitives/Chip";
import { Select } from "./primitives/Select";
import { RatingStepper } from "./RatingStepper";
import { genreLabel } from "@/lib/dictionaries";

const FILTER_DEFAULTS: Record<string, string> = {
  sort: "title",
  status: "CATALOG",
  watched: "all",
};

const MULTI_KEYS = [
  "resolution",
  "language",
  "channelLayout",
  "subtitleLang",
  "genre",
] as const;
const SCALAR_KEYS = ["q", "minRating", "hdr", "premiumAudio"] as const;

function countActiveFilters(params: URLSearchParams): number {
  let n = 0;
  for (const key of SCALAR_KEYS) {
    if (params.has(key)) n++;
  }
  for (const key of MULTI_KEYS) {
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
  for (const key of MULTI_KEYS) {
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
    audioLanguages: Facet[];
    subtitleLanguages: Facet[];
    channelLayouts: Facet[];
    genres: Facet[];
  };
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

export function FilterBar({ facets }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [facetsOpen, setFacetsOpen] = useState(false);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value == null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.push(`/?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const activeResolutions = useMemo(
    () => parseMulti(searchParams.get("resolution")),
    [searchParams],
  );
  const activeLanguages = useMemo(
    () => parseMulti(searchParams.get("language")),
    [searchParams],
  );
  const activeLayouts = useMemo(
    () => parseMulti(searchParams.get("channelLayout")),
    [searchParams],
  );
  const activeSubtitleLangs = useMemo(
    () => parseMulti(searchParams.get("subtitleLang")),
    [searchParams],
  );
  const activeGenres = useMemo(
    () => parseMulti(searchParams.get("genre")),
    [searchParams],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: q || null });
  };

  const showResolution = hasFacets(facets.resolutions);
  const showAudioLang = hasFacets(facets.audioLanguages);
  const showSubtitleLang = hasFacets(facets.subtitleLanguages);
  const showChannelLayout = hasFacets(facets.channelLayouts);
  const showGenres = hasFacets(facets.genres);
  const anyFacets =
    showResolution ||
    showAudioLang ||
    showSubtitleLang ||
    showChannelLayout ||
    showGenres;

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
      sort: null,
      status: null,
      watched: null,
    });
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
            placeholder="Поиск по названию…"
            className="focus-ring min-h-9 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated py-2 pl-10 pr-3 text-sm text-text placeholder:text-faint"
            aria-label="Поиск по названию"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-center">
          <Select
            compact
            label="Статус"
            value={searchParams.get("status") ?? "CATALOG"}
            onChange={(v) => updateParams({ status: v })}
            preserveOrder
            options={[
              { value: "CATALOG", label: "Каталог" },
              { value: "DRAFT", label: "Черновики" },
              { value: "EXCLUDED", label: "Скрытые" },
              { value: "CATALOG,DRAFT", label: "Каталог + черновики" },
            ]}
          />
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
            <div className="surface-card space-y-5 p-4">
              {showResolution ? (
                <div className="space-y-2.5">
                  <p className="font-mono-tech text-faint">разрешение</p>
                  <div className="flex flex-wrap gap-2">
                    {facets.resolutions.map((f) =>
                      f.value ? (
                        <Chip
                          key={f.value}
                          active={activeResolutions.includes(f.value)}
                          count={f.count}
                          onClick={() =>
                            updateParams({
                              resolution:
                                toggleMulti(activeResolutions, f.value!).join(
                                  ",",
                                ) || null,
                            })
                          }
                        >
                          {f.value}
                        </Chip>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}

              {showAudioLang ? (
                <div className="space-y-2.5">
                  <p className="font-mono-tech text-faint">аудио · язык</p>
                  <div className="flex flex-wrap gap-2">
                    {facets.audioLanguages.map((f) =>
                      f.value ? (
                        <Chip
                          key={f.value}
                          active={activeLanguages.includes(f.value)}
                          count={f.count}
                          onClick={() =>
                            updateParams({
                              language:
                                toggleMulti(activeLanguages, f.value!).join(
                                  ",",
                                ) || null,
                            })
                          }
                        >
                          {f.value}
                        </Chip>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}

              {showChannelLayout ? (
                <div className="space-y-2.5">
                  <p className="font-mono-tech text-faint">аудио · формат</p>
                  <div className="flex flex-wrap gap-2">
                    {facets.channelLayouts.map((f) =>
                      f.value ? (
                        <Chip
                          key={f.value}
                          active={activeLayouts.includes(f.value)}
                          count={f.count}
                          onClick={() =>
                            updateParams({
                              channelLayout:
                                toggleMulti(activeLayouts, f.value!).join(
                                  ",",
                                ) || null,
                            })
                          }
                        >
                          {f.value}
                        </Chip>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}

              {showSubtitleLang ? (
                <div className="space-y-2.5">
                  <p className="font-mono-tech text-faint">субтитры · язык</p>
                  <div className="flex flex-wrap gap-2">
                    {facets.subtitleLanguages.map((f) =>
                      f.value ? (
                        <Chip
                          key={f.value}
                          active={activeSubtitleLangs.includes(f.value)}
                          count={f.count}
                          onClick={() =>
                            updateParams({
                              subtitleLang:
                                toggleMulti(activeSubtitleLangs, f.value!).join(
                                  ",",
                                ) || null,
                            })
                          }
                        >
                          {f.value}
                        </Chip>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}

              {showGenres ? (
                <div className="space-y-2.5">
                  <p className="font-mono-tech text-faint">жанры</p>
                  <div className="flex flex-wrap gap-2">
                    {facets.genres.map((f) =>
                      f.value ? (
                        <Chip
                          key={f.value}
                          active={activeGenres.includes(f.value)}
                          count={f.count}
                          onClick={() =>
                            updateParams({
                              genre:
                                toggleMulti(activeGenres, f.value!).join(",") ||
                                null,
                            })
                          }
                        >
                          {genreLabel(f.value) ?? f.value}
                        </Chip>
                      ) : null,
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
