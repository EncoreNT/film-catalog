/**
 * Runtime-only import for movie file paths outside ./data.
 * Keeps Turbopack NFT from tracing the whole project (see next build warning).
 */
export async function loadMovieFileMeta() {
  return import(/* turbopackIgnore: true */ "./movie-file-meta");
}
