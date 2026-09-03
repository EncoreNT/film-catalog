import {
  displayMovieVersionLabel,
  isBaseMovieVersion,
} from "@/lib/shared/dictionaries";

/** ffprobe of the same cut can drift by a few seconds; ignore that as a "different runtime". */
export const RUNTIME_EQUAL_TOLERANCE_SECONDS = 30;

export type RuntimeDurationSlice = {
  version?: string | null;
  durationSeconds: number | null;
};

export type MovieRuntimeDisplay = {
  seconds: number | null;
  /** Canonical movie runtime vs the selected non-theatrical cut. */
  source: "movie" | "cut";
  cutLabel: string | null;
  deltaSeconds: number | null;
};

function positiveDuration(
  seconds: number | null | undefined,
): number | null {
  if (seconds == null || seconds <= 0) return null;
  return seconds;
}

function maxPositiveDuration(
  releases: RuntimeDurationSlice[],
  predicate?: (release: RuntimeDurationSlice) => boolean,
): number | null {
  let max: number | null = null;
  for (const release of releases) {
    if (predicate && !predicate(release)) continue;
    const duration = positiveDuration(release.durationSeconds);
    if (duration == null) continue;
    if (max == null || duration > max) max = duration;
  }
  return max;
}

/** Theatrical (or missing-version) runtime only. Null when that cut has no duration. */
export function movieTheatricalDurationSeconds(
  releases: RuntimeDurationSlice[],
): number | null {
  return maxPositiveDuration(releases, (release) =>
    isBaseMovieVersion(release.version),
  );
}

/**
 * Movie runtime for catalog, sort, and archive totals: theatrical cut when
 * present, otherwise the longest known release duration.
 */
export function movieCanonicalDurationSeconds(
  releases: RuntimeDurationSlice[],
): number | null {
  return movieTheatricalDurationSeconds(releases) ?? maxPositiveDuration(releases);
}

export function runtimesDiffer(
  a: number,
  b: number,
  toleranceSeconds = RUNTIME_EQUAL_TOLERANCE_SECONDS,
): boolean {
  return Math.abs(a - b) > toleranceSeconds;
}

/**
 * Duration shown on the movie detail header.
 *
 * Theatrical (or multipart total) stays the movie runtime. Switching to a
 * longer/shorter cut shows that release's time as an alternate.
 */
export function resolveDetailRuntimeDisplay(input: {
  movieSeconds: number | null;
  activeRelease: RuntimeDurationSlice | null;
  lockToMovieRuntime?: boolean;
}): MovieRuntimeDisplay {
  const movieSeconds = positiveDuration(input.movieSeconds);

  if (input.lockToMovieRuntime) {
    return {
      seconds: movieSeconds,
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    };
  }

  const active = input.activeRelease;
  if (!active || isBaseMovieVersion(active.version)) {
    return {
      seconds: movieSeconds ?? positiveDuration(active?.durationSeconds),
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    };
  }

  const cutSeconds = positiveDuration(active.durationSeconds);
  const cutLabel = displayMovieVersionLabel(active.version);
  if (cutSeconds == null) {
    return {
      seconds: movieSeconds,
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    };
  }

  if (movieSeconds == null) {
    return {
      seconds: cutSeconds,
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    };
  }

  if (!runtimesDiffer(cutSeconds, movieSeconds)) {
    return {
      seconds: movieSeconds,
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    };
  }

  return {
    seconds: cutSeconds,
    source: "cut",
    cutLabel,
    deltaSeconds: cutSeconds - movieSeconds,
  };
}
