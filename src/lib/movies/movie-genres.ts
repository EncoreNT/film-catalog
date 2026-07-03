import type { Prisma } from "@/generated/prisma/client";
import type { movieInclude } from "@/lib/movies/movie-include";

type MovieWithGenreLinks = Prisma.MovieGetPayload<{
  include: { movieGenres: { include: { genre: true } } };
}>;

type MovieGenreEntry = MovieWithGenreLinks["movieGenres"][number]["genre"];

/** Genres linked to a movie, in user-defined display order. */
export function orderedMovieGenres(
  movie: Pick<MovieWithGenreLinks, "movieGenres">,
): MovieGenreEntry[] {
  return movie.movieGenres.map((link) => link.genre);
}
