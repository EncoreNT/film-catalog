import { describe, expect, it } from "vitest";
import {
  movieDurationSortKey,
  movieFileSizeSortKey,
  sortMovieCandidatesByReleaseAggregate,
} from "@/lib/movies/movie-release-sort";

describe("movieDurationSortKey", () => {
  it("returns max duration across releases", () => {
    expect(
      movieDurationSortKey([
        { durationSeconds: 3600, fileSize: null },
        { durationSeconds: 7200, fileSize: null },
      ]),
    ).toBe(7200);
  });

  it("returns null when no release has duration", () => {
    expect(
      movieDurationSortKey([
        { durationSeconds: null, fileSize: 100 },
        { durationSeconds: null, fileSize: 200 },
      ]),
    ).toBeNull();
  });
});

describe("movieFileSizeSortKey", () => {
  it("sums file sizes across releases", () => {
    expect(
      movieFileSizeSortKey([
        { durationSeconds: null, fileSize: 1_000 },
        { durationSeconds: null, fileSize: 2_500 },
      ]),
    ).toBe(3_500);
  });

  it("ignores releases without size", () => {
    expect(
      movieFileSizeSortKey([
        { durationSeconds: null, fileSize: 4_000 },
        { durationSeconds: null, fileSize: null },
      ]),
    ).toBe(4_000);
  });

  it("returns null when every release lacks size", () => {
    expect(
      movieFileSizeSortKey([
        { durationSeconds: 100, fileSize: null },
        { durationSeconds: 200, fileSize: null },
      ]),
    ).toBeNull();
  });
});

describe("sortMovieCandidatesByReleaseAggregate", () => {
  const candidates = [
    {
      id: 1,
      releases: [{ durationSeconds: 3600, fileSize: 1_000 }],
    },
    {
      id: 2,
      releases: [{ durationSeconds: 7200, fileSize: 3_000 }],
    },
    {
      id: 3,
      releases: [{ durationSeconds: null, fileSize: 500 }],
    },
    {
      id: 4,
      releases: [
        { durationSeconds: 5400, fileSize: 1_000 },
        { durationSeconds: 5400, fileSize: 2_000 },
      ],
    },
  ];

  it("sorts by duration ascending with nulls last", () => {
    expect(
      sortMovieCandidatesByReleaseAggregate(
        candidates,
        "durationSeconds",
        "asc",
      ),
    ).toEqual([1, 4, 2, 3]);
  });

  it("sorts by duration descending with nulls last", () => {
    expect(
      sortMovieCandidatesByReleaseAggregate(
        candidates,
        "durationSeconds",
        "desc",
      ),
    ).toEqual([2, 4, 1, 3]);
  });

  it("sorts by summed file size descending", () => {
    expect(
      sortMovieCandidatesByReleaseAggregate(candidates, "fileSize", "desc"),
    ).toEqual([4, 2, 1, 3]);
  });
});
