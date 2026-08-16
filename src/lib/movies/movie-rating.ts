/** Pure helpers for per-rater movie ratings. */

export type MovieRatingRow = {
  rating: number;
};

export function computeAverageRating(
  ratings: MovieRatingRow[],
): number | null {
  if (ratings.length === 0) return null;
  const sum = ratings.reduce((acc, row) => acc + row.rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function formatRatingDisplay(value: number | null): string | null {
  if (value == null) return null;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
