import type { Metadata } from "next";
import { getCatalogGenreFacets } from "@/lib/catalog/catalog-facets";
import { MovieForm } from "@/components/movies/MovieForm";

export const metadata: Metadata = {
  title: "Добавить фильм",
};

export default async function NewMoviePage() {
  const genrePopularity = await getCatalogGenreFacets();
  return <MovieForm genrePopularity={genrePopularity} />;
}
