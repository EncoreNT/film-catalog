import { describe, expect, it } from "vitest";
import { sortMovieIdsByLastWatch } from "@/lib/movies/movie-watch-sort";

describe("sortMovieIdsByLastWatch", () => {
  const candidates = [
    { id: 1, lastWatchedOn: new Date("2024-01-01") },
    { id: 2, lastWatchedOn: null },
    { id: 3, lastWatchedOn: new Date("2024-06-01") },
    { id: 4, lastWatchedOn: new Date("2024-01-01") },
  ];

  it("sorts by the latest viewing day and keeps undated movies last", () => {
    expect(sortMovieIdsByLastWatch(candidates, "asc")).toEqual([1, 4, 3, 2]);
    expect(sortMovieIdsByLastWatch(candidates, "desc")).toEqual([3, 4, 1, 2]);
  });
});
