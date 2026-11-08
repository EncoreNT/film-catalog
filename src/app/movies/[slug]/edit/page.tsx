import { notFound } from "next/navigation";
import { getCatalogGenreFacets } from "@/lib/catalog/catalog-facets";
import { MovieForm } from "@/components/movies/MovieForm";
import {
  generateMovieMetadata,
  loadMovieBySlug,
} from "@/lib/movies/load-movie-by-slug";
import { getMovieFranchiseMemberships } from "@/lib/movies/movie-franchise-memberships";
import { getMovieRemakeMemberships } from "@/lib/remakes/remake-membership";
import { prisma } from "@/lib/db/prisma";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateMovieMetadata(slug, "Редактирование");
}

export default async function EditMoviePage({ params }: PageProps) {
  const { slug } = await params;
  const movie = await loadMovieBySlug(slug);
  if (!movie) notFound();

  const [franchiseMemberships, remakeMemberships, genrePopularity] =
    await Promise.all([
      getMovieFranchiseMemberships(prisma, movie.id),
      getMovieRemakeMemberships(prisma, movie.id),
      getCatalogGenreFacets(),
    ]);

  return (
    <MovieForm
      key={movie.id}
      movie={movie}
      genrePopularity={genrePopularity}
      franchiseMemberships={franchiseMemberships}
      remakeMemberships={remakeMemberships}
    />
  );
}
