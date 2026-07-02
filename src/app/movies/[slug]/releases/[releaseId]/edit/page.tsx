import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { releaseInclude } from "@/lib/movie-include";
import { ReleaseEditor } from "@/components/ReleaseEditor";
import { MovieReleasePageHeader } from "@/components/MovieReleasePageHeader";
import { releaseTabLabel } from "@/lib/spec-tags";
import type { ReleaseWithTracks } from "@/lib/movie-query";

interface PageProps {
  params: Promise<{ slug: string; releaseId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug, releaseId } = await params;
  const releaseIdNum = Number(releaseId);
  if (!Number.isInteger(releaseIdNum)) return {};

  const movie = await prisma.movie.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!movie) return {};

  return { title: `Редактирование релиза: ${movie.title}` };
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
        <Link
          href={`/movies/${movie.slug}`}
          className="focus-ring inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Назад к фильму
        </Link>
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
