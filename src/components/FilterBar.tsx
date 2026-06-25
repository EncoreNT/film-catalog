"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Chip } from "./primitives/Chip";
import { Select } from "./primitives/Select";
import { RatingStepper } from "./RatingStepper";
import { Button } from "./primitives/Button";
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
const SCALAR_KEYS = ["q", "minRating"] as const;

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

function pluralFilters(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 19) return "фильтров";
  if (mod10 === 1) return "фильтр";
  if (mod10 >= 2 && mod10 <= 4) return "фильтра";
  return "фильтров";
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
  selectedIds: number[];
  onBulkAction: (action: "approve" | "exclude") => void;
  bulkLoading?: boolean;
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

export function FilterBar({
  facets,
  selectedIds,
  onBulkAction,
  bulkLoading,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

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

  const resetFilters = () => {
    setQ("");
    updateParams({
      q: null,
      minRating: null,
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
    <div className="mb-8 space-y-4">
      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
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
            className="focus-ring min-h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated py-2 pl-10 pr-4 text-sm text-text placeholder:text-faint"
            aria-label="Поиск по названию"
          />
        </div>
        <Button type="submit" variant="primary" loading={isPending}>
          Найти
        </Button>
      </form>

      {/* Filter controls */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Select
          label="Сортировка"
          value={searchParams.get("sort") ?? "title"}
          onChange={(v) => updateParams({ sort: v })}
          preserveOrder
          options={[
            { value: "title", label: "Название" },
            { value: "year", label: "Год" },
            { value: "createdAt", label: "Добавлено" },
            { value: "rating", label: "Оценка" },
            { value: "watchedAt", label: "Дата просмотра" },
            { value: "durationSeconds", label: "Продолжительность" },
          ]}
        />
        <Select
          label="Статус"
          value={searchParams.get("status") ?? "CATALOG"}
          onChange={(v) => updateParams({ status: v })}
          preserveOrder
          options={[
            { value: "CATALOG", label: "Каталог" },
            { value: "DRAFT", label: "Черновики" },
            { value: "EXCLUDED", label: "Исключённые" },
            { value: "CATALOG,DRAFT", label: "Каталог + черновики" },
          ]}
        />
        <Select
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
        <RatingStepper
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

      {/* Active filters summary — appears when any filter deviates from defaults */}
      <AnimatePresence>
        {activeCount > 0 ? (
          <motion.div
            key="active-filters"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-accent/20 bg-accent/5 px-4 py-2.5">
              <span className="font-mono-tech flex items-center gap-2 text-sm text-accent">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold leading-none text-bg-deep"
                  aria-label={`${activeCount} ${pluralFilters(activeCount)} активно`}
                >
                  {activeCount}
                </span>
                {pluralFilters(activeCount)} активно
              </span>
              <button
                type="button"
                onClick={resetFilters}
                className="focus-ring flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-muted transition-colors hover:text-danger"
                aria-label="Сбросить все фильтры"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Сбросить всё
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Facet chips */}
      {anyFacets ? (
        <div className="space-y-5 border-t border-border pt-5">
          {showResolution ? (
            <div className="space-y-3">
              <p className="font-mono-tech text-muted">разрешение</p>
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
                            toggleMulti(activeResolutions, f.value!).join(",") ||
                            null,
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
            <div className="space-y-3">
              <p className="font-mono-tech text-muted">аудио · язык</p>
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
                            toggleMulti(activeLanguages, f.value!).join(",") ||
                            null,
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
            <div className="space-y-3">
              <p className="font-mono-tech text-muted">аудио · формат</p>
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
                            toggleMulti(activeLayouts, f.value!).join(",") ||
                            null,
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
            <div className="space-y-3">
              <p className="font-mono-tech text-muted">субтитры · язык</p>
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
                            toggleMulti(activeSubtitleLangs, f.value!).join(",") ||
                            null,
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
            <div className="space-y-3">
              <p className="font-mono-tech text-muted">жанры</p>
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
      ) : null}

      {/* Bulk actions */}
      {selectedIds.length > 0 ? (
        <div className="surface-card flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm text-muted">
            Выбрано: {selectedIds.length}
          </span>
          <Button
            variant="primary"
            loading={bulkLoading}
            onClick={() => onBulkAction("approve")}
          >
            В каталог
          </Button>
          <Button
            variant="danger"
            loading={bulkLoading}
            onClick={() => onBulkAction("exclude")}
          >
            Исключить
          </Button>
        </div>
      ) : null}
    </div>
  );
}
