import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import {
  movieInclude,
  type MovieWithTracks,
} from "@/lib/movies/movie-include";

export async function loadMovieBySlug(slug: string): Promise<MovieWithTracks> {
  const movie = await prisma.movie.findUnique({
    where: { slug },
    include: movieInclude,
  });

  if (!movie) notFound();
  return movie;
}

export async function generateMovieMetadata(
  slug: string,
  titlePrefix?: string,
): Promise<Metadata> {
  const movie = await prisma.movie.findUnique({
    where: { slug },
    select: { title: true },
  });

  if (!movie) return {};

  return {
    title: titlePrefix ? `${titlePrefix}: ${movie.title}` : movie.title,
  };
}
