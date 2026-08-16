import { describe, expect, it } from "vitest";
import {
  buildMovieWatchedFilter,
  isMovieWatched,
  movieIsUnwatchedWhere,
  movieIsWatchedWhere,
} from "@/lib/movies/movie-watched";

describe("isMovieWatched", () => {
  it("is true when watchedAt is set", () => {
    expect(isMovieWatched(new Date("2024-01-01"), 0)).toBe(true);
  });

  it("is true when any rating exists", () => {
    expect(isMovieWatched(null, 1)).toBe(true);
  });

  it("is false without date and ratings", () => {
    expect(isMovieWatched(null, 0)).toBe(false);
  });
});

describe("buildMovieWatchedFilter", () => {
  it("watched without date range matches date or ratings", () => {
    expect(buildMovieWatchedFilter({ watched: "watched" })).toEqual(
      movieIsWatchedWhere,
    );
  });

  it("unwatched without date range requires no date and no ratings", () => {
    expect(buildMovieWatchedFilter({ watched: "unwatched" })).toEqual(
      movieIsUnwatchedWhere,
    );
  });

  it("watched with date range filters only watchedAt", () => {
    expect(
      buildMovieWatchedFilter({
        watched: "watched",
        watchedFrom: "2024-01-01",
        watchedTo: "2024-12-31",
      }),
    ).toEqual({
      watchedAt: {
        not: null,
        gte: new Date("2024-01-01"),
        lte: new Date("2024-12-31"),
      },
    });
  });

  it("unwatched with date range is impossible", () => {
    expect(
      buildMovieWatchedFilter({
        watched: "unwatched",
        watchedFrom: "2024-01-01",
      }),
    ).toEqual({ id: -1 });
  });
});
