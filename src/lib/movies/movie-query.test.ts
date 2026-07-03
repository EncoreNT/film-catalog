import { describe, expect, it } from "vitest";
import { buildMovieOrder, buildMovieWhere, parseListQuery } from "@/lib/movies/movie-query";

function queryFrom(params: Record<string, string>) {
  return parseListQuery(new URLSearchParams(params));
}

describe("buildMovieWhere", () => {
  it("merges watched status with date range", () => {
    const where = buildMovieWhere(
      queryFrom({
        watched: "watched",
        watchedFrom: "2024-01-01",
        watchedTo: "2024-12-31",
      }),
    );
    expect(where.watchedAt).toEqual({
      not: null,
      gte: new Date("2024-01-01"),
      lte: new Date("2024-12-31"),
    });
  });

  it("returns impossible filter for unwatched + date range", () => {
    const where = buildMovieWhere(
      queryFrom({
        watched: "unwatched",
        watchedFrom: "2024-01-01",
      }),
    );
    expect(where.id).toBe(-1);
  });

  it("searches case-insensitively via normalized matchKey", () => {
    const where = buildMovieWhere(queryFrom({ q: "подзем" }));
    expect(where.OR).toEqual([
      { matchKey: { contains: "подзем" } },
      { matchKey: null, title: { contains: "подзем" } },
    ]);
  });

  it("filters movies with multiple releases", () => {
    const where = buildMovieWhere(queryFrom({ multiRelease: "true" }), {
      multiReleaseMovieIds: [10, 20],
    });
    expect(where.id).toEqual({ in: [10, 20] });
  });

  it("returns impossible filter when no multi-release movies exist", () => {
    const where = buildMovieWhere(queryFrom({ multiRelease: "true" }), {
      multiReleaseMovieIds: [],
    });
    expect(where.id).toBe(-1);
  });

  it("combines premium audio and language filters with AND", () => {
    const where = buildMovieWhere(
      queryFrom({
        premiumAudio: "true",
        language: "rus,eng",
      }),
    );
    expect(where.AND).toEqual([
      {
        releases: {
          some: {
            audioTracks: {
              some: {
                isDefault: true,
                language: "rus",
                profile: { in: ["Atmos", "DTS:X MA"] },
              },
            },
          },
        },
      },
      {
        releases: {
          some: {
            audioTracks: {
              some: { language: { in: ["rus", "eng"] } },
            },
          },
        },
      },
    ]);
  });

  it("keeps single audio filter without AND wrapper", () => {
    const where = buildMovieWhere(queryFrom({ language: "rus" }));
    expect(where.releases).toEqual({
      some: {
        audioTracks: {
          some: { language: { in: ["rus"] } },
        },
      },
    });
    expect(where.AND).toBeUndefined();
  });
});

describe("buildMovieOrder", () => {
  it("always adds id as a stable tiebreaker for pagination (v7 array form)", () => {
    expect(buildMovieOrder(queryFrom({ sort: "title" }))).toEqual([
      { title: "asc" },
      { id: "asc" },
    ]);
    expect(buildMovieOrder(queryFrom({ sort: "year", order: "desc" }))).toEqual([
      { year: "desc" },
      { id: "desc" },
    ]);
    expect(buildMovieOrder(queryFrom({ sort: "rating" }))).toEqual([
      { rating: "asc" },
      { id: "asc" },
    ]);
    expect(buildMovieOrder(queryFrom({ sort: "watchedAt" }))).toEqual([
      { watchedAt: "asc" },
      { id: "asc" },
    ]);
    expect(buildMovieOrder(queryFrom({ sort: "durationSeconds" }))).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
    expect(buildMovieOrder(queryFrom({ sort: "createdAt" }))).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
  });
});
