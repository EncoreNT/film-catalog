import * as movieFileMeta from "./movie-file-meta";

export { assertMovieFileReadable, readMovieFileMeta } from "./movie-file-meta";

/** Lazy accessor kept for existing call sites; module is bundled statically. */
export async function loadMovieFileMeta() {
  return movieFileMeta;
}
