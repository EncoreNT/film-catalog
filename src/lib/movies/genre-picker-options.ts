import { GENRES } from "@/lib/shared/dictionaries";
import { searchTextIncludes } from "@/lib/shared/search-text";

export type GenrePickerSort = "alphabetical" | "popular";
export interface GenrePopularity {
  value: string;
  count: number;
}

/** Sort the available choices, never the movie's selected genre order. */
export function genrePickerOptions(
  popularity: readonly GenrePopularity[],
  sort: GenrePickerSort = "alphabetical",
  query = "",
) {
  const counts = new Map(popularity.map(({ value, count }) => [value, count]));
  return GENRES.map((genre) => ({
    ...genre,
    count: counts.get(genre.value) ?? 0,
  }))
    .filter((genre) => searchTextIncludes(genre.label, query))
    .sort((a, b) => {
      const alphabetical = a.label.localeCompare(b.label, "ru");
      return sort === "popular"
        ? b.count - a.count || alphabetical
        : alphabetical;
    });
}
