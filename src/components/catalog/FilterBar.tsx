"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Clapperboard,
  MonitorPlay,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import { Chip } from "@/components/primitives/Chip";
import {
  EmptyReleasesFilter,
  MinRatingFilter,
  MultiReleaseFilter,
  parseMinRating,
  parseWatchedFilter,
  WatchedFilter,
  TvReadyFilter,
} from "@/components/catalog/FilterToolbarControls";
import {
  RESOLUTIONS,
  displayGenreName,
} from "@/lib/shared/dictionaries";
import { trimInput } from "@/lib/shared/text-trim";
import {
  sortGenreFacets,
  type GenreSortMode,
} from "@/lib/catalog/genre-facet-sort";
import {
  CLEAR_FACET_PARAMS,
  countFacetFilters,
  facetCountMap,
  hasFacets,
  parseMulti,
  sortByDict,
  toggleMulti,
  type FilterBarFacets,
} from "@/lib/catalog/filter-bar-utils";
import { FilterAudioSection } from "@/components/catalog/FilterAudioSection";
import {
  FacetSection,
  GenreSortToggle,
  HDR_ANY,
  HDR_OPTIONS,
  QualityLadder,
} from "@/components/catalog/FilterFacetParts";

interface FilterToolbarProps {
  updateParams: (updates: Record<string, string | null>) => void;
  emptyReleaseCount?: number;
}

export function FilterToolbar({ updateParams, emptyReleaseCount = 0 }: FilterToolbarProps) {
  const searchParams = useSearchParams();
  const committedQuery = searchParams.get("q") ?? "";
  const [q, setQ] = useState(committedQuery);
  const [previousQuery, setPreviousQuery] = useState(committedQuery);
  // Keep the field in sync when browser Back or a reset changes the URL.
  if (previousQuery !== committedQuery) {
    setPreviousQuery(committedQuery);
    setQ(committedQuery);
  }
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = trimInput(q);
    setQ(trimmed);
    updateParams({ q: trimmed || null });
  };
  return (
    <form onSubmit={handleSearch} className="catalog-search-row" role="search">
      <div className="catalog-search-field">
        <button type="submit" className="catalog-icon focus-ring" aria-label="Найти фильм"><Search aria-hidden /></button>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти фильм по названию…" aria-label="Поиск по названию" />
        {q ? <button type="button" className="catalog-icon focus-ring" aria-label="Очистить поиск" onClick={() => { setQ(""); updateParams({ q: null }); }}><X aria-hidden /></button> : null}
      </div>
      <div className="catalog-quick-tools">
        <WatchedFilter value={parseWatchedFilter(searchParams.get("watched"))} onChange={(v) => updateParams({ watched: v === "all" ? null : v })} />
        <div className="catalog-release-tools">
          <MultiReleaseFilter active={searchParams.get("multiRelease") === "true"} onChange={(on) => updateParams({ multiRelease: on ? "true" : null })} />
          <TvReadyFilter active={searchParams.get("tvReady") === "true"} onChange={(on) => updateParams({ tvReady: on ? "true" : null })} />
          <EmptyReleasesFilter active={searchParams.get("emptyReleases") === "true"} count={emptyReleaseCount} onChange={(on) => updateParams({ emptyReleases: on ? "true" : null })} />
        </div>
        <MinRatingFilter value={parseMinRating(searchParams.get("minRating"))} onChange={(v) => updateParams({ minRating: v?.toString() ?? null })} />
      </div>
    </form>
  );
}

interface FilterPanelProps {
  facets: FilterBarFacets;
  updateParams: (updates: Record<string, string | null>) => void;
  anyFacets: boolean;
  onClose: () => void;
  group?: "all" | "genre" | "image" | "audio" | "translation";
}

export function FilterPanel({
  facets,
  updateParams,
  anyFacets,
  onClose,
  group = "all",
}: FilterPanelProps) {
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
  const activeHdr = useMemo(
    () => parseMulti(searchParams.get("hdr")),
    [searchParams],
  );
  const hdrAnyActive = activeHdr.includes(HDR_ANY);

  const showImage = group === "all" || group === "image";
  const showResolution = showImage && hasFacets(facets.resolutions);
  const showGenres = (group === "all" || group === "genre") && hasFacets(facets.genres);
  const sortedGenres = useMemo(
    () => sortGenreFacets(facets.genres, genreSort),
    [facets.genres, genreSort],
  );

  const showAudio = group === "all" || group === "audio" || group === "translation";

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

  return (
    <div
      className={`catalog-facet-panel catalog-facet-panel--${group}`}
    >
      {/* Slim panel header — pinned, scroll happens below */}
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="h-3.5 w-3.5 text-accent/70"
            aria-hidden
          />
          <span className="font-mono-tech text-faint">{group === "all" ? "Все фильтры" : group === "genre" ? "Жанры" : group === "image" ? "Изображение" : group === "audio" ? "Звук" : "Перевод"}</span>
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
            aria-label="Закрыть фильтры"
            className="focus-ring flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="catalog-facet-content scroll-subtle">
        {showGenres ? (
          <FacetSection
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

        {showImage ? <div className="space-y-5">

          {showResolution ? (
            <FacetSection
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


          <FacetSection
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

        </div> : null}

        {showAudio ? (
          <>
            <FilterAudioSection
              facets={facets}
              searchParams={searchParams}
              updateParams={updateParams}
              section={group === "translation" ? "translation" : group === "audio" ? "audio" : "all"}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
