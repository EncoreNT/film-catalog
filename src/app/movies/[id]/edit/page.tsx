import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MovieForm, TrackEditor } from "@/components/MovieForm";
import { movieInclude } from "@/lib/movie-include";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) return {};

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { title: true },
  });
  if (!movie) return {};

  return { title: `Редактирование: ${movie.title}` };
}

export default async function EditMoviePage({ params }: PageProps) {
  const { id } = await params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) notFound();

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: movieInclude,
  });

  if (!movie) notFound();

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/movies/${movie.id}`}
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

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="font-display mb-6 text-xl font-semibold">
            Редактирование
          </h2>
          <MovieForm movie={movie} />
        </div>
        <div className="surface-card p-5">
          <h2 className="font-display mb-6 text-xl font-semibold">
            Дорожки
          </h2>
          <TrackEditor movie={movie} />
        </div>
      </section>
    </div>
  );
}
