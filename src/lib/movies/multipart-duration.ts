import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  movieCanonicalDurationSeconds,
  movieTheatricalDurationSeconds,
  resolveDetailRuntimeDisplay,
} from "@/lib/movies/movie-runtime";
import { sortReleasesByQuality } from "@/lib/releases/release-primary";
import { isBaseMovieVersion } from "@/lib/shared/dictionaries";

import { formatCountRu } from "@/lib/shared/russian-plural";

export function formatSeriesCountLabel(count: number): string {
  return formatCountRu(count, ["серия", "серии", "серий"]);
}

/** Sum best release duration per linked series (multi-part films). */
export function sumMultiPartDuration(
  releases: ReleaseWithTracks[],
  partCount: number,
): number | null {
  const withPart = releases.filter((r) => r.moviePartId != null);
  if (withPart.length === 0) return null;

  const byPartId = new Map<number, ReleaseWithTracks[]>();
  for (const release of withPart) {
    const partId = release.moviePartId!;
    const list = byPartId.get(partId) ?? [];
    list.push(release);
    byPartId.set(partId, list);
  }

  let total = 0;
  let partsWithDuration = 0;

  for (const group of byPartId.values()) {
    const theatrical = group.filter(
      (release) =>
        isBaseMovieVersion(release.version) &&
        release.durationSeconds != null &&
        release.durationSeconds > 0,
    );
    const best = sortReleasesByQuality(
      theatrical.length > 0 ? theatrical : group,
    )[0];
    if (best?.durationSeconds != null && best.durationSeconds > 0) {
      total += best.durationSeconds;
      partsWithDuration++;
    }
  }

  if (partsWithDuration === 0) return null;
  if (partsWithDuration < Math.min(partCount, byPartId.size)) {
    return total > 0 ? total : null;
  }
  return total;
}

export function catalogDisplayDurationSeconds(
  releases: ReleaseWithTracks[],
  partCount: number | null | undefined,
  _primaryReleaseId?: number | null,
): number | null {
  if (partCount != null && partCount > 1) {
    const summed = sumMultiPartDuration(releases, partCount);
    if (summed != null) return summed;
  }
  return movieCanonicalDurationSeconds(releases);
}

/**
 * Baseline shown as "movie runtime" on the detail header: theatrical (or the
 * multipart theatrical sum). Does not fall back to a longer alternate cut.
 */
export function detailBaselineDurationSeconds(
  releases: ReleaseWithTracks[],
  partCount: number | null | undefined,
): number | null {
  if (partCount != null && partCount > 1) {
    return catalogDisplayDurationSeconds(releases, partCount);
  }
  return movieTheatricalDurationSeconds(releases);
}

export function detailDisplayDurationSeconds(
  releases: ReleaseWithTracks[],
  partCount: number | null | undefined,
  activeRelease: ReleaseWithTracks | null,
): number | null {
  const movieSeconds = detailBaselineDurationSeconds(releases, partCount);
  return resolveDetailRuntimeDisplay({
    movieSeconds,
    activeRelease,
    lockToMovieRuntime: partCount != null && partCount > 1,
  }).seconds;
}

type ReleasePartLink = Pick<ReleaseWithTracks, "moviePartId">;

/**
 * True when the movie has multiple distinct release *variants* (not merely
 * one file per series in a multi-part film).
 */
export function movieHasMultipleReleaseVariants(
  releaseCount: number,
  partCount: number | null | undefined,
  releases: ReleasePartLink[],
): boolean {
  if (releaseCount <= 1) return false;
  if (partCount == null || partCount <= 1) return true;

  const perPart = new Map<number, number>();
  let linked = 0;
  for (const release of releases) {
    if (release.moviePartId == null) continue;
    linked++;
    perPart.set(
      release.moviePartId,
      (perPart.get(release.moviePartId) ?? 0) + 1,
    );
  }

  for (const count of perPart.values()) {
    if (count > 1) return true;
  }

  const orphans = releaseCount - linked;
  if (orphans > 0 && releaseCount > partCount) return true;

  if (releaseCount <= partCount) return false;

  return true;
}

/** Catalog card «N релизов» badge — same rule as multi-release filter. */
export function shouldShowCatalogReleaseCountBadge(
  releaseCount: number,
  partCount: number | null | undefined,
  releases: ReleasePartLink[],
): boolean {
  return movieHasMultipleReleaseVariants(releaseCount, partCount, releases);
}
