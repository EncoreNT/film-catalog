import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { pickPrimaryRelease } from "@/lib/releases/release-primary";

/** Resolve which release to show on the movie detail page. */
export function resolveActiveRelease<T extends ReleaseWithTracks>(
  releases: T[],
  releaseIdParam: number | null,
): T | null {
  if (releases.length === 0) return null;
  if (releaseIdParam != null) {
    const matched = releases.find((r) => r.id === releaseIdParam);
    if (matched) return matched;
  }
  return pickPrimaryRelease(releases) ?? releases[0] ?? null;
}
