import { describe, expect, it } from "vitest";
import {
  buildMovieWatchedFilter,
  isMovieWatched,
  latestWatchRangeWhere,
  movieIsUnwatchedWhere,
  movieIsWatchedWhere,
} from "@/lib/movies/movie-watched";

describe("isMovieWatched", () => {
  it("is true when a viewing day exists", () => {
    expect(isMovieWatched(new Date("2024-01-01"), 0)).toBe(true);
  });

  it("is true when any rating exists", () => {
    expect(isMovieWatched(null, 1)).toBe(true);
  });

  it("is false without a viewing day and ratings", () => {
    expect(isMovieWatched(null, 0)).toBe(false);
  });
});

describe("buildMovieWatchedFilter", () => {
  it("watched without date range matches a journal day or ratings", () => {
    expect(buildMovieWatchedFilter({ watched: "watched" })).toEqual(
      movieIsWatchedWhere,
    );
  });

  it("unwatched without date range requires no journal and no ratings", () => {
    expect(buildMovieWatchedFilter({ watched: "unwatched" })).toEqual(
      movieIsUnwatchedWhere,
    );
  });

  it("watched with date range uses the latest journal day", () => {
    expect(
      buildMovieWatchedFilter({
        watched: "watched",
        watchedFrom: "2024-01-01",
        watchedTo: "2024-12-31",
      }),
    ).toEqual(
      latestWatchRangeWhere({
        watchedFrom: "2024-01-01",
        watchedTo: "2024-12-31",
      }),
    );
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

describe("latestWatchRangeWhere", () => {
  it("treats a lower bound as the latest day", () => {
    expect(latestWatchRangeWhere({ watchedFrom: "2024-06-01" })).toEqual({
      watches: { some: { watchedOn: { gte: new Date("2024-06-01") } } },
    });
  });

  it("excludes a later day when the range has an end", () => {
    expect(
      latestWatchRangeWhere({
        watchedFrom: "2024-01-01",
        watchedTo: "2024-12-31",
      }),
    ).toEqual({
      AND: [
        {
          watches: {
            some: {
              watchedOn: {
                gte: new Date("2024-01-01"),
                lte: new Date("2024-12-31"),
              },
            },
          },
        },
        {
          watches: {
            none: { watchedOn: { gt: new Date("2024-12-31") } },
          },
        },
      ],
    });
  });
});
