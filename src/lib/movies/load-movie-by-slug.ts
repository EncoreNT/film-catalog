import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import {
  movieInclude,
  type MovieWithTracks,
} from "@/lib/movies/movie-include";

export const movieStubSelect = {
  id: true,
  slug: true,
  title: true,
  year: true,
  coverPath: true,
  updatedAt: true,
} as const;

export type MovieStub = {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  coverPath: string | null;
  updatedAt: Date;
};

export async function loadMovieBySlug(
  slug: string,
): Promise<MovieWithTracks | null> {
  return prisma.movie.findUnique({
    where: { slug },
    include: movieInclude,
  });
}

export async function loadMovieStubBySlug(
  slug: string,
): Promise<MovieStub | null> {
  return prisma.movie.findUnique({
    where: { slug },
    select: movieStubSelect,
  });
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
