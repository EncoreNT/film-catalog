import { describe, expect, it } from "vitest";
import { buildCatalogFacetsFromRows } from "@/lib/catalog/catalog-facets";
import { buildMovieWhere, parseListQuery } from "@/lib/movies/movie-query";

function queryFrom(params: Record<string, string>) {
  return parseListQuery(new URLSearchParams(params));
}

describe("buildCatalogFacetsFromRows", () => {
  it("does not count author English tracks in original channel badges", () => {
    const facets = buildCatalogFacetsFromRows(
      [
        {
          movieId: 1,
          language: "eng",
          translationType: "author",
          channelLayout: "2.0",
          codec: "ac3",
          profile: null,
        },
        {
          movieId: 1,
          language: "eng",
          translationType: "author",
          channelLayout: "5.1",
          codec: "ac3",
          profile: null,
        },
        {
          movieId: 1,
          language: "rus",
          translationType: "dub",
          channelLayout: "5.1",
          codec: "dts-hd",
          profile: "HD MA",
        },
      ],
      [{ movieId: 1, resolutionLabel: "4K" }],
    );

    expect(facets.originalChannelLayouts).toEqual([]);
    expect(facets.originalAudioFormats.every((f) => f.count === 0)).toBe(true);
    expect(facets.russianChannelLayouts).toEqual([
      { value: "5.1", count: 1 },
    ]);
  });

  it("counts only explicitly tagged original tracks in original badges", () => {
    const facets = buildCatalogFacetsFromRows(
      [
        {
          movieId: 2,
          language: "spa",
          translationType: "original",
          channelLayout: "2.0",
          codec: "ac3",
          profile: null,
        },
        {
          movieId: 2,
          language: "eng",
          translationType: "author",
          channelLayout: "2.0",
          codec: "ac3",
          profile: null,
        },
      ],
      [{ movieId: 2, resolutionLabel: "4K" }],
    );

    expect(facets.originalChannelLayouts).toEqual([
      { value: "2.0", count: 1 },
    ]);
    expect(facets.originalAudioFormats.find((f) => f.value === "ac3")?.count).toBe(
      1,
    );
  });

  it("counts each movie once per bucket even with duplicate tracks", () => {
    const facets = buildCatalogFacetsFromRows(
      [
        {
          movieId: 3,
          language: "rus",
          translationType: "dub",
          channelLayout: "7.1",
          codec: "ac3",
          profile: null,
        },
        {
          movieId: 3,
          language: "rus",
          translationType: "dub",
          channelLayout: "7.1",
          codec: "ac3",
          profile: null,
        },
      ],
      [],
    );

    expect(facets.russianChannelLayouts).toEqual([
      { value: "7.1", count: 1 },
    ]);
  });

  it("counts TrueHD Atmos toward TrueHD codec badge", () => {
    const facets = buildCatalogFacetsFromRows(
      [
        {
          movieId: 5,
          language: "eng",
          translationType: "original",
          channelLayout: "7.1",
          codec: "truehd",
          profile: "Atmos",
        },
      ],
      [],
    );

    expect(facets.originalAudioFormats.find((f) => f.value === "truehd")?.count).toBe(
      1,
    );
  });

  it("excludes original translation type from Russian dub type badges", () => {
    const facets = buildCatalogFacetsFromRows(
      [
        {
          movieId: 4,
          language: "rus",
          translationType: "original",
          channelLayout: "2.0",
          codec: "ac3",
          profile: null,
        },
        {
          movieId: 4,
          language: "rus",
          translationType: "dub",
          channelLayout: "5.1",
          codec: "ac3",
          profile: null,
        },
      ],
      [],
    );

    expect(facets.russianTranslationTypes).toEqual([
      { value: "dub", count: 1 },
    ]);
  });
});

describe("buildMovieWhere audioScope alignment", () => {
  it("filters original scope by translationType, not language", () => {
    const where = buildMovieWhere(
      queryFrom({
        audioScope: "original",
        audioChannels: "2.0",
      }),
    );
    expect(where.releases).toEqual({
      some: {
        audioTracks: {
          some: {
            translationType: "original",
            channelLayout: { in: ["2.0"] },
          },
        },
      },
    });
  });

  it("does not match author English when filtering original 2.0", () => {
    const where = buildMovieWhere(
      queryFrom({
        audioScope: "original",
        audioChannels: "2.0",
        resolution: "4K",
      }),
    );
    expect(where.AND).toEqual([
      {
        releases: {
          some: {
            videoTrack: { resolutionLabel: { in: ["4K"] } },
          },
        },
      },
      {
        releases: {
          some: {
            audioTracks: {
              some: {
                translationType: "original",
                channelLayout: { in: ["2.0"] },
              },
            },
          },
        },
      },
    ]);
  });
});
