import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { releaseInclude } from "@/lib/movies/movie-include";
import { ReleaseEditor } from "@/components/releases/ReleaseEditor";
import { ReleaseEditPageLayout } from "@/components/releases/ReleaseEditPageLayout";
import {
  generateMovieMetadata,
  loadMovieStubBySlug,
} from "@/lib/movies/load-movie-by-slug";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

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

  const movie = await loadMovieStubBySlug(slug);
  if (!movie) notFound();

  const release = await prisma.release.findFirst({
    where: { id: releaseIdNum, movieId: movie.id },
    include: releaseInclude,
  });
  if (!release) notFound();

  const releaseLabel = releaseTabLabel(release as ReleaseWithTracks);

  return (
    <ReleaseEditPageLayout
      movie={movie}
      eyebrow="редактирование релиза"
      releaseLabel={releaseLabel}
    >
      <ReleaseEditor
        mode="edit"
        movieId={movie.id}
        movieSlug={movie.slug}
        movieTitle={movie.title}
        release={release as ReleaseWithTracks}
      />
    </ReleaseEditPageLayout>
  );
}
