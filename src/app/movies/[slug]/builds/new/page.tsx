import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { movieInclude } from "@/lib/movies/movie-include";
import { ReleaseBuildEditor } from "@/components/builds/ReleaseBuildEditor";
import { ReleaseEditPageLayout } from "@/components/releases/ReleaseEditPageLayout";
import { generateMovieMetadata } from "@/lib/movies/load-movie-by-slug";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateMovieMetadata(slug, "Сборка релиза");
}

export default async function NewReleaseBuildPage({ params }: PageProps) {
  const { slug } = await params;

  const movie = await prisma.movie.findUnique({
    where: { slug },
    include: movieInclude,
  });
  if (!movie) notFound();
  if (movie.releases.length === 0) notFound();

  return (
    <ReleaseEditPageLayout movie={movie} eyebrow="сборка релиза" fillViewport>
      <ReleaseBuildEditor
        movieId={movie.id}
        movieTitle={movie.title}
        movieYear={movie.year}
        releases={movie.releases}
      />
    </ReleaseEditPageLayout>
  );
}
