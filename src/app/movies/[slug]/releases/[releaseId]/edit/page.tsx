import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { releaseInclude } from "@/lib/movies/movie-include";
import { BackLink } from "@/components/primitives/BackLink";
import { ReleaseEditor } from "@/components/releases/ReleaseEditor";
import { MovieReleasePageHeader } from "@/components/releases/MovieReleasePageHeader";
import { generateMovieMetadata } from "@/lib/movies/load-movie-by-slug";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import type { ReleaseWithTracks } from "@/lib/movies/movie-query";

interface PageProps {
  params: Promise<{ slug: string; releaseId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateMovieMetadata(slug, "Редактирование релиза");
}

export default async function EditReleasePage({ params }: PageProps) {
  const { slug, releaseId } = await params;
  const releaseIdNum = Number(releaseId);
  if (!Number.isInteger(releaseIdNum) || releaseIdNum <= 0) notFound();

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

  const release = await prisma.release.findFirst({
    where: { id: releaseIdNum, movieId: movie.id },
    include: releaseInclude,
  });
  if (!release) notFound();

  const releaseLabel = releaseTabLabel(release as ReleaseWithTracks);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <BackLink href={`/movies/${movie.slug}`}>Назад к фильму</BackLink>
      </div>

      <MovieReleasePageHeader
        movie={movie}
        eyebrow="редактирование релиза"
        releaseLabel={releaseLabel}
      />

      <ReleaseEditor
        mode="edit"
        movieId={movie.id}
        movieSlug={movie.slug}
        movieTitle={movie.title}
        release={release as ReleaseWithTracks}
      />
    </div>
  );
}
