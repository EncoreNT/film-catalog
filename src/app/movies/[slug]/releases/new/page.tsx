import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ReleaseEditor } from "@/components/ReleaseEditor";
import { MovieReleasePageHeader } from "@/components/MovieReleasePageHeader";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const movie = await prisma.movie.findUnique({
    where: { slug },
    select: { title: true },
  });
  if (!movie) return {};

  return { title: `Новый релиз: ${movie.title}` };
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
        <Link
          href={`/movies/${movie.slug}`}
          className="focus-ring inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Назад к фильму
        </Link>
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
