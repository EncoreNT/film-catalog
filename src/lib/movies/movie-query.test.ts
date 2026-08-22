import { describe, expect, it } from "vitest";
import { archiveEliteTierWhere } from "@/lib/media/quality-predicates";
import { buildMovieOrder, buildMovieWhere, parseListQuery } from "@/lib/movies/movie-query";

function queryFrom(params: Record<string, string>) {
  return parseListQuery(new URLSearchParams(params));
}

describe("parseListQuery", () => {
  it("defaults catalog page size to 70", () => {
    expect(queryFrom({}).limit).toBe(70);
  });

  it("defaults sort to fileDownloadedAt desc", () => {
    const q = queryFrom({});
    expect(q.sort).toBe("fileDownloadedAt");
    expect(q.order).toBe("desc");
  });
});

describe("buildMovieWhere", () => {
  it("merges watched status with date range", () => {
    const where = buildMovieWhere(
      queryFrom({
        watched: "watched",
        watchedFrom: "2024-01-01",
        watchedTo: "2024-12-31",
      }),
    );
    expect(where.AND).toEqual([
      {
        watchedAt: {
          not: null,
          gte: new Date("2024-01-01"),
          lte: new Date("2024-12-31"),
        },
      },
    ]);
  });

  it("treats rated movies as watched", () => {
    const where = buildMovieWhere(queryFrom({ watched: "watched" }));
    expect(where.AND).toEqual([
      {
        OR: [{ watchedAt: { not: null } }, { movieRatings: { some: {} } }],
      },
    ]);
  });

  it("treats movies without ratings or date as unwatched", () => {
    const where = buildMovieWhere(queryFrom({ watched: "unwatched" }));
    expect(where.AND).toEqual([
      {
        AND: [{ watchedAt: null }, { movieRatings: { none: {} } }],
      },
    ]);
  });

  it("returns impossible filter for unwatched + date range", () => {
    const where = buildMovieWhere(
      queryFrom({
        watched: "unwatched",
        watchedFrom: "2024-01-01",
      }),
    );
    expect(where.AND).toEqual([{ id: -1 }]);
  });

  it("searches case-insensitively via normalized matchKey", () => {
    const where = buildMovieWhere(queryFrom({ q: "подзем" }));
    expect(where.OR).toEqual([
      { matchKey: { contains: "подзем" } },
      { matchKey: null, title: { contains: "подзем" } },
    ]);
  });

  it("filters movies with multiple release variants", () => {
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
        hasLang: "rus",
        premiumAudio: "true",
        language: "rus,eng",
      }),
    );
    expect(where.AND).toEqual([
      { releases: { some: { audioTracks: { some: { language: "rus" } } } } },
      {
        releases: {
          some: {
            audioTracks: {
              some: {
                OR: expect.any(Array),
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

  it("filters original Atmos via hasLang=original + premium", () => {
    const where = buildMovieWhere(
      queryFrom({
        hasLang: "original",
        premiumAudio: "true",
      }),
    );
    expect(where.AND).toEqual([
      { releases: { some: { audioTracks: { some: { translationType: "original" } } } } },
      {
        releases: {
          some: {
            audioTracks: {
              some: { OR: expect.any(Array) },
            },
          },
        },
      },
    ]);
  });

  it("uses archive elite tier predicate for ruby rail preset", () => {
    const where = buildMovieWhere(
      queryFrom({
        resolution: "4K",
        hdr: "HDR_ANY",
        premiumAudio: "true",
      }),
    );
    expect(where.AND).toContainEqual(archiveEliteTierWhere);
    expect(where.releases).toBeUndefined();
  });

  it("requires rus and original tracks on the same release via hasLang", () => {
    const where = buildMovieWhere(
      queryFrom({ hasLang: "rus,original" }),
    );
    expect(where.AND).toEqual([
      { releases: { some: { audioTracks: { some: { language: "rus" } } } } },
      {
        releases: {
          some: { audioTracks: { some: { translationType: "original" } } },
        },
      },
    ]);
  });

  it("filters by russian track presence alone via hasLang=rus", () => {
    const where = buildMovieWhere(queryFrom({ hasLang: "rus" }));
    expect(where.releases).toEqual({
      some: {
        audioTracks: {
          some: { language: "rus" },
        },
      },
    });
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

  it("filters HDR10+ by overlay flag, not only hdr string", () => {
    const where = buildMovieWhere(queryFrom({ hdr: "HDR10+" }));
    expect(where.releases).toEqual({
      some: {
        videoTrack: {
          OR: [{ hasHdr10Plus: true }, { hdr: "HDR10+" }],
        },
      },
    });
  });

  it("filters TV-ready releases", () => {
    const where = buildMovieWhere(queryFrom({ tvReady: "true" }));
    expect(where.releases?.some).toMatchObject({
      OR: [
        { filePath: { endsWith: ".mkv" } },
        { filePath: { endsWith: ".mp4" } },
      ],
      videoTrack: {
        codec: { in: ["hevc", "h265", "h264", "avc"] },
      },
    });
  });
});

describe("buildMovieOrder", () => {
  it("always adds id as a stable tiebreaker for pagination (v7 array form)", () => {
    expect(buildMovieOrder(queryFrom({ sort: "title", order: "asc" }))).toEqual([
      { title: "asc" },
      { id: "asc" },
    ]);
    expect(buildMovieOrder(queryFrom({ sort: "year", order: "desc" }))).toEqual([
      { year: "desc" },
      { id: "desc" },
    ]);
    expect(() =>
      buildMovieOrder(queryFrom({ sort: "rating", order: "asc" })),
    ).toThrow(/rating aggregate/);
    expect(buildMovieOrder(queryFrom({ sort: "watchedAt", order: "asc" }))).toEqual([
      { watchedAt: "asc" },
      { id: "asc" },
    ]);
    expect(() =>
      buildMovieOrder(queryFrom({ sort: "durationSeconds" })),
    ).toThrow();
    expect(() => buildMovieOrder(queryFrom({ sort: "fileSize" }))).toThrow();
    expect(() =>
      buildMovieOrder(queryFrom({ sort: "fileDownloadedAt" })),
    ).toThrow();
    expect(buildMovieOrder(queryFrom({ sort: "createdAt", order: "asc" }))).toEqual([
      { createdAt: "asc" },
      { id: "asc" },
    ]);
  });
});
