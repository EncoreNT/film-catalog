import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { ReleaseEditPageLayout } from "@/components/releases/ReleaseEditPageLayout";
import { BdmvRemuxEditor } from "@/components/releases/BdmvRemuxEditor";
import { generateMovieMetadata } from "@/lib/movies/load-movie-by-slug";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return generateMovieMetadata(slug, "Сборка из BDMV");
}

export default async function BdmvRemuxPage({ params }: PageProps) {
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
      parts: { orderBy: { partNumber: "asc" } },
    },
  });
  if (!movie) notFound();

  return (
    <ReleaseEditPageLayout movie={movie} eyebrow="сборка из BDMV" fillViewport>
      <BdmvRemuxEditor
        movieId={movie.id}
        movieTitle={movie.title}
        movieYear={movie.year}
        parts={movie.parts}
      />
    </ReleaseEditPageLayout>
  );
}
