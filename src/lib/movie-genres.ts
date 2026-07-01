import type { Prisma } from "@/generated/prisma/client";
import type { movieInclude } from "@/lib/movie-include";

export type MovieWithGenreLinks = Prisma.MovieGetPayload<{
  include: { movieGenres: { include: { genre: true } } };
}>;

export type MovieGenreEntry = MovieWithGenreLinks["movieGenres"][number]["genre"];

/** Genres linked to a movie, in user-defined display order. */
export function orderedMovieGenres(
  movie: Pick<MovieWithGenreLinks, "movieGenres">,
): MovieGenreEntry[] {
  return movie.movieGenres.map((link) => link.genre);
}
