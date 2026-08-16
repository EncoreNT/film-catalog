import type { MovieWithTracks } from "@/lib/movies/movie-include";
import { listRaters } from "@/lib/raters/rater-crud";
import type { MovieRatingRow } from "@/components/movies/MovieRating";

export async function buildMovieRatingRows(
  movie: Pick<MovieWithTracks, "movieRatings">,
): Promise<MovieRatingRow[]> {
  const raters = await listRaters();
  const byRaterId = new Map(
    movie.movieRatings.map((row) => [row.raterId, row.rating]),
  );

  return raters.map((rater) => ({
    raterId: rater.id,
    raterName: rater.name,
    rating: byRaterId.get(rater.id) ?? null,
  }));
}
