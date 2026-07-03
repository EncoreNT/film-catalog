export type CoverVersion = Date | string | number;

export function coverVersionKey(version: CoverVersion): number {
  if (typeof version === "number") return version;
  return new Date(version).getTime();
}

export function buildCoverUrl(path: string, version: CoverVersion): string {
  return `${path}?v=${coverVersionKey(version)}`;
}

export function movieCoverUrl(movieId: number, version: CoverVersion): string {
  return buildCoverUrl(`/api/covers/${movieId}`, version);
}

export function movieCoverUrlFromMovie(movie: {
  id: number;
  coverPath: string | null;
  updatedAt: CoverVersion;
}): string | null {
  if (!movie.coverPath) return null;
  return movieCoverUrl(movie.id, movie.updatedAt);
}
