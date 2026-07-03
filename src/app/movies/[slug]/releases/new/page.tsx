import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { BackLink } from "@/components/primitives/BackLink";
import { ReleaseEditor } from "@/components/releases/ReleaseEditor";
import { MovieReleasePageHeader } from "@/components/releases/MovieReleasePageHeader";
import { generateMovieMetadata } from "@/lib/movies/load-movie-by-slug";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateMovieMetadata(slug, "Новый релиз");
}

export default async function NewReleasePage({ params }: PageProps) {
  const { slug } = await params;

  const movie = await prisma.movie.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      year: true,
      coverPath: true,
      updatedAt: true,
    },
  });
  if (!movie) notFound();

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackLink href={`/movies/${movie.slug}`}>Назад к фильму</BackLink>
      </div>

      <MovieReleasePageHeader movie={movie} eyebrow="новый релиз" />

      <ReleaseEditor
        mode="create"
        movieId={movie.id}
        movieSlug={movie.slug}
        movieTitle={movie.title}
      />
    </div>
  );
}
