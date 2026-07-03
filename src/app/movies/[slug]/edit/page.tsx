import { notFound } from "next/navigation";
import { EntityEditLayout } from "@/components/layout/EntityEditLayout";
import { MovieEditor } from "@/components/movies/MovieForm";
import {
  generateMovieMetadata,
  loadMovieBySlug,
} from "@/lib/movies/load-movie-by-slug";
import { getMovieFranchiseMemberships } from "@/lib/movies/movie-franchise-memberships";
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

  const franchiseMemberships = await getMovieFranchiseMemberships(
    prisma,
    movie.id,
  );

  return (
    <EntityEditLayout
      backHref={`/movies/${movie.slug}`}
      backLabel="Назад к фильму"
      eyebrow="редактирование"
      title={movie.title}
    >
      <MovieEditor movie={movie} franchiseMemberships={franchiseMemberships} />
    </EntityEditLayout>
  );
}
