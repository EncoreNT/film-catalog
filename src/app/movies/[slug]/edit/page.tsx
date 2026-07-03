import { BackLink } from "@/components/primitives/BackLink";
import { EditPageHeader } from "@/components/layout/EditPageHeader";
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

  const franchiseMemberships = await getMovieFranchiseMemberships(
    prisma,
    movie.id,
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackLink href={`/movies/${movie.slug}`}>Назад к фильму</BackLink>
      </div>

      <EditPageHeader eyebrow="редактирование" title={movie.title} />

      <MovieEditor movie={movie} franchiseMemberships={franchiseMemberships} />
    </div>
  );
}
