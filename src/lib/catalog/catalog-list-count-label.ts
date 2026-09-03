import { pluralRu } from "@/lib/shared/russian-plural";

const RELEASE_FORMS = ["релиз", "релиза", "релизов"] as const;

export type CatalogListView = "catalog" | "draft" | "excluded";

const MOVIE_FORMS: Record<CatalogListView, [string, string, string]> = {
  catalog: ["фильм", "фильма", "фильмов"],
  draft: ["черновик", "черновика", "черновиков"],
  excluded: ["скрытый", "скрытых", "скрытых"],
};

export function catalogListCountLabel(
  view: CatalogListView,
  movieCount: number,
  releaseCount: number,
) {
  const movieWord = pluralRu(movieCount, ...MOVIE_FORMS[view]);
  const releaseWord = pluralRu(releaseCount, ...RELEASE_FORMS);
  const displayText = `${movieCount} ${movieWord} / ${releaseCount} ${releaseWord}`;
  return {
    movieWord,
    releaseWord,
    displayText,
    ariaLabel: `${movieCount} ${movieWord}, ${releaseCount} ${releaseWord}`,
  };
}
