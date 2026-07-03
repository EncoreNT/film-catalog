import { displayGenreName } from "@/lib/shared/dictionaries";

export type GenreSortMode = "alpha" | "count";

export interface GenreFacet {
  value: string | null;
  count: number;
}

function genreDisplayLabel(value: string): string {
  return displayGenreName(value);
}

/** Sort genre filter chips: Russian A–Z (default) or by count descending. */
export function sortGenreFacets(
  facets: GenreFacet[],
  mode: GenreSortMode,
): Array<GenreFacet & { value: string }> {
  const items = facets.filter((f): f is GenreFacet & { value: string } =>
    Boolean(f.value),
  );
  if (mode === "count") {
    return [...items].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return genreDisplayLabel(a.value).localeCompare(
        genreDisplayLabel(b.value),
        "ru",
      );
    });
  }
  return [...items].sort((a, b) =>
    genreDisplayLabel(a.value).localeCompare(genreDisplayLabel(b.value), "ru"),
  );
}
