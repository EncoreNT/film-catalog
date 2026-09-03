import { describe, expect, it } from "vitest";
import {
  movieDurationSortKey,
  movieFileDownloadedAtSortKey,
  movieFileSizeSortKey,
  sortMovieCandidatesByReleaseAggregate,
} from "@/lib/movies/movie-release-sort";

const noDownload = { fileDownloadedAt: null as Date | null };

describe("movieDurationSortKey", () => {
  it("returns max duration across theatrical releases", () => {
    expect(
      movieDurationSortKey([
        { durationSeconds: 3600, fileSize: null, fileDownloadedAt: null },
        { durationSeconds: 7200, fileSize: null, fileDownloadedAt: null },
      ]),
    ).toBe(7200);
  });

  it("ignores a longer non-theatrical cut", () => {
    expect(
      movieDurationSortKey([
        {
          durationSeconds: 5808,
          fileSize: null,
          fileDownloadedAt: null,
          version: "theatrical",
        },
        {
          durationSeconds: 6431,
          fileSize: null,
          fileDownloadedAt: null,
          version: "kid-mode",
        },
      ]),
    ).toBe(5808);
  });

  it("returns null when no release has duration", () => {
    expect(
      movieDurationSortKey([
        { durationSeconds: null, fileSize: 100, fileDownloadedAt: null },
        { durationSeconds: null, fileSize: 200, fileDownloadedAt: null },
      ]),
    ).toBeNull();
  });
});

describe("movieFileSizeSortKey", () => {
  it("sums file sizes across releases", () => {
    expect(
      movieFileSizeSortKey([
        { durationSeconds: null, fileSize: 1_000, fileDownloadedAt: null },
        { durationSeconds: null, fileSize: 2_500, fileDownloadedAt: null },
      ]),
    ).toBe(3_500);
  });

  it("ignores releases without size", () => {
    expect(
      movieFileSizeSortKey([
        { durationSeconds: null, fileSize: 4_000, fileDownloadedAt: null },
        { durationSeconds: null, fileSize: null, fileDownloadedAt: null },
      ]),
    ).toBe(4_000);
  });

  it("returns null when every release lacks size", () => {
    expect(
      movieFileSizeSortKey([
        { durationSeconds: 100, fileSize: null, fileDownloadedAt: null },
        { durationSeconds: 200, fileSize: null, fileDownloadedAt: null },
      ]),
    ).toBeNull();
  });
});

describe("movieFileDownloadedAtSortKey", () => {
  it("returns latest download timestamp across releases", () => {
    expect(
      movieFileDownloadedAtSortKey([
        {
          durationSeconds: null,
          fileSize: null,
          fileDownloadedAt: new Date("2024-01-01T00:00:00.000Z"),
        },
        {
          durationSeconds: null,
          fileSize: null,
          fileDownloadedAt: new Date("2024-06-01T00:00:00.000Z"),
        },
      ]),
    ).toBe(new Date("2024-06-01T00:00:00.000Z").getTime());
  });
});

describe("sortMovieCandidatesByReleaseAggregate", () => {
  const candidates = [
    {
      id: 1,
      releases: [
        { durationSeconds: 3600, fileSize: 1_000, ...noDownload },
      ],
    },
    {
      id: 2,
      releases: [
        { durationSeconds: 7200, fileSize: 3_000, ...noDownload },
      ],
    },
    {
      id: 3,
      releases: [
        { durationSeconds: null, fileSize: 500, ...noDownload },
      ],
    },
    {
      id: 4,
      releases: [
        { durationSeconds: 5400, fileSize: 1_000, ...noDownload },
        { durationSeconds: 5400, fileSize: 2_000, ...noDownload },
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

  it("sorts by latest fileDownloadedAt descending", () => {
    const withDates = [
      {
        id: 10,
        releases: [
          {
            durationSeconds: null,
            fileSize: null,
            fileDownloadedAt: new Date("2020-01-01T00:00:00.000Z"),
          },
        ],
      },
      {
        id: 20,
        releases: [
          {
            durationSeconds: null,
            fileSize: null,
            fileDownloadedAt: new Date("2024-01-01T00:00:00.000Z"),
          },
        ],
      },
      { id: 30, releases: [{ durationSeconds: null, fileSize: null, ...noDownload }] },
    ];
    expect(
      sortMovieCandidatesByReleaseAggregate(
        withDates,
        "fileDownloadedAt",
        "desc",
      ),
    ).toEqual([20, 10, 30]);
  });
});
