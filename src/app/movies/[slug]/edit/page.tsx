import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MovieEditor } from "@/components/MovieForm";
import { movieInclude } from "@/lib/movie-include";
import type { Metadata } from "next";

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

  return { title: `Редактирование: ${movie.title}` };
}

export default async function EditMoviePage({ params }: PageProps) {
  const { slug } = await params;

  const movie = await prisma.movie.findUnique({
    where: { slug },
    include: movieInclude,
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

      <header>
        <p className="font-mono-tech text-accent">редактирование</p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
          {movie.title}
        </h1>
      </header>

      <MovieEditor movie={movie} />
    </div>
  );
}
