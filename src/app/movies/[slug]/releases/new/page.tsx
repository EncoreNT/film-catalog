import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { ReleaseEditor } from "@/components/releases/ReleaseEditor";
import { ReleaseEditPageLayout } from "@/components/releases/ReleaseEditPageLayout";
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
    <ReleaseEditPageLayout movie={movie} eyebrow="новый релиз" fillViewport>
      <ReleaseEditor
        mode="create"
        movieId={movie.id}
        movieSlug={movie.slug}
        movieTitle={movie.title}
      />
    </ReleaseEditPageLayout>
  );
}
