import { prisma } from "@/lib/db/prisma";
import { movieInclude } from "./movie-include";
import { computeAverageRating } from "./movie-rating";
import { watchInstantFromISODate, watchISODateFromInstant } from "./movie-watch-date";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { displayGenreName } from "@/lib/shared/dictionaries";
import type { CalendarWatch } from "./watch-calendar";

/** Only dated journal entries; ratings alone never invent a viewing date. */
export async function getCalendarWatches(start: string, endExclusive: string): Promise<CalendarWatch[]> {
  const watches = await prisma.movieWatch.findMany({
    where: { watchedOn: { gte: watchInstantFromISODate(start), lt: watchInstantFromISODate(endExclusive) } },
    orderBy: [{ watchedOn: "asc" }, { id: "asc" }],
    select: {
      id: true,
      watchedOn: true,
      movie: {
        select: {
          id: true, slug: true, title: true, year: true, description: true,
          coverPath: true, updatedAt: true,
          movieGenres: movieInclude.movieGenres,
          movieRatings: movieInclude.movieRatings,
        },
      },
    },
  });
  return watches.map(({ id, watchedOn, movie }) => ({
    id,
    watchedOn: watchISODateFromInstant(watchedOn),
    movie: {
      id: movie.id, slug: movie.slug, title: movie.title, year: movie.year,
      description: movie.description,
      coverUrl: movieCoverUrlFromMovie(movie),
      genres: movie.movieGenres.map(({ genre }) => displayGenreName(genre.name)),
      rating: computeAverageRating(movie.movieRatings),
      ratings: movie.movieRatings.map(({ rating, rater }) => ({ name: rater.name, rating })),
    },
  }));
}
