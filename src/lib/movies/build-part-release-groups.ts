import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import type { MovieWithTracksAndParts } from "@/lib/movies/movie-include";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { sortReleasesByQuality } from "@/lib/releases/release-primary";
import { buildReleaseDetailViews } from "@/lib/releases/release-detail-view";

export interface ReleasePartGroup {
  partNumber: number;
  title: string | null;
  releases: ReleaseDetailView[];
}

export function buildPartReleaseGroups(
  movie: MovieWithTracksAndParts,
  allReleaseViews: ReleaseDetailView[],
): ReleasePartGroup[] | null {
  if (movie.partCount == null || movie.partCount <= 1) return null;
  if (!movie.parts?.length) return null;

  const viewById = new Map(allReleaseViews.map((view) => [view.id, view]));
  const groups: ReleasePartGroup[] = movie.parts.map((part) => ({
    partNumber: part.partNumber,
    title: part.title,
    releases: sortReleasesByQuality(part.releases as ReleaseWithTracks[])
      .map((release) => viewById.get(release.id))
      .filter((view): view is ReleaseDetailView => view != null),
  }));

  const linkedIds = new Set(
    movie.parts.flatMap((part) => part.releases.map((release) => release.id)),
  );
  const orphans = allReleaseViews.filter((view) => !linkedIds.has(view.id));
  if (orphans.length > 0) {
    groups.push({
      partNumber: 0,
      title: null,
      releases: orphans,
    });
  }

  const nonEmpty = groups.filter((group) => group.releases.length > 0);
  return nonEmpty.length > 0 ? nonEmpty : null;
}

export function buildReleaseViewsForMovie(
  releases: ReleaseWithTracks[],
): ReleaseDetailView[] {
  return buildReleaseDetailViews(sortReleasesByQuality(releases));
}
