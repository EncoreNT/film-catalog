type CoverVersion = Date | string | number;

function coverVersionKey(version: CoverVersion): number {
  if (typeof version === "number") return version;
  return new Date(version).getTime();
}

export function movieCoverUrl(movieId: number, version: CoverVersion): string {
  return `/api/covers/${movieId}?v=${coverVersionKey(version)}`;
}

export function movieCoverUrlFromMovie(movie: {
  id: number;
  coverPath: string | null;
  updatedAt: CoverVersion;
}): string | null {
  if (!movie.coverPath) return null;
  return movieCoverUrl(movie.id, movie.updatedAt);
}
