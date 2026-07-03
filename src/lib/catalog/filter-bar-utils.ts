export const FILTER_DEFAULTS: Record<string, string> = {
  sort: "title",
  watched: "all",
};

// Property-facet param keys rendered inside the collapsible panel.
export const FACET_KEYS = [
  "resolution",
  "genre",
  "audioChannels",
  "audioFormat",
  "audioTranslation",
] as const;
export const SCALAR_FACET_KEYS = ["hdr", "premiumAudio"] as const;
export const SCALAR_KEYS = [
  "q",
  "minRating",
  "multiRelease",
  ...SCALAR_FACET_KEYS,
] as const;
export const LEGACY_FACET_KEYS = [
  "language",
  "channelLayout",
  "subtitleLang",
  "audioScope",
] as const;

export const CLEAR_FACET_PARAMS = Object.fromEntries(
  [...FACET_KEYS, ...SCALAR_FACET_KEYS, ...LEGACY_FACET_KEYS].map((key) => [
    key,
    null,
  ]),
) as Record<string, null>;

export const CLEAR_ALL_FILTER_PARAMS = {
  ...CLEAR_FACET_PARAMS,
  q: null,
  minRating: null,
  multiRelease: null,
  sort: null,
  watched: null,
};

export interface Facet {
  value: string | null;
  count: number;
}

export interface FilterBarFacets {
  resolutions: Facet[];
  russianChannelLayouts: Facet[];
  originalChannelLayouts: Facet[];
  russianTranslationTypes: Facet[];
  russianAudioFormats: Facet[];
  originalAudioFormats: Facet[];
  genres: Facet[];
}

export function facetCountMap(facets: Facet[]): Map<string, number> {
  return new Map(
    facets.filter((f) => f.value).map((f) => [f.value!, f.count]),
  );
}

export function countActiveFilters(params: URLSearchParams): number {
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

export function countFacetFilters(params: URLSearchParams): number {
  let n = 0;
  for (const key of FACET_KEYS) {
    if (params.has(key)) n++;
  }
  for (const key of SCALAR_FACET_KEYS) {
    if (params.has(key)) n++;
  }
  return n;
}

export function parseMulti(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : [];
}

export function toggleMulti(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

export function hasFacets(facets: Facet[]): boolean {
  return facets.some((f) => f.value && f.count > 0);
}

export function dictOrder(value: string, dict: { value: string }[]): number {
  const idx = dict.findIndex(
    (d) => d.value.toLowerCase() === value.toLowerCase(),
  );
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export function sortByDict<T extends { value: string | null }>(
  items: T[],
  dict: { value: string }[],
): T[] {
  return [...items]
    .filter((f) => f.value)
    .sort((a, b) => dictOrder(a.value!, dict) - dictOrder(b.value!, dict));
}
