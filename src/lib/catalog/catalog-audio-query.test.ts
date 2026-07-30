import { describe, expect, it } from "vitest";
import {
  buildCatalogAudioReleaseFilters,
  normalizeCatalogAudioQuery,
} from "@/lib/catalog/catalog-audio-query";

describe("normalizeCatalogAudioQuery", () => {
  it("splits flat params (original → sentinel)", () => {
    const n = normalizeCatalogAudioQuery({
      hasLang: "rus,original",
      channels: "5.1,7.1",
      codec: "AC-3",
      translation: "dub",
    });
    expect(n.languages).toEqual(["rus", "__original__"]);
    expect(n.channels).toEqual(["5.1", "7.1"]);
    expect(n.codecs).toEqual(["AC-3"]);
    expect(n.translations).toEqual(["dub"]);
  });

  it("maps legacy hasRus/hasOrig into languages", () => {
    const n = normalizeCatalogAudioQuery({ hasRus: "1", hasOrig: "1" });
    expect(n.languages).toEqual(["rus", "__original__"]);
  });

  it("maps legacy audioScope + shared into flat lists", () => {
    const n = normalizeCatalogAudioQuery({
      audioScope: "original",
      audioChannels: "2.0",
      audioFormat: "AC-3",
    });
    expect(n.languages).toEqual(["__original__"]);
    expect(n.channels).toEqual(["2.0"]);
    expect(n.codecs).toEqual(["AC-3"]);
  });

  it("maps legacy premiumAudio (no scope) to premium flag", () => {
    const n = normalizeCatalogAudioQuery({ premiumAudio: "true" });
    expect(n.premium).toBe(true);
  });

  it("maps legacy premiumRus into languages + premium", () => {
    const n = normalizeCatalogAudioQuery({ premiumRus: "true" });
    expect(n.premium).toBe(true);
    expect(n.languages).toEqual(["rus"]);
  });
});

describe("buildCatalogAudioReleaseFilters", () => {
  it("emits one presence filter per language (AND between languages)", () => {
    const filters = buildCatalogAudioReleaseFilters({
      hasLang: "rus,original",
    });
    expect(filters).toEqual([
      { audioTracks: { some: { language: "rus" } } },
      { audioTracks: { some: { translationType: "original" } } },
    ]);
  });

  it("emits channels filter as OR within", () => {
    const filters = buildCatalogAudioReleaseFilters({ channels: "2.0,5.1" });
    expect(filters).toEqual([
      { audioTracks: { some: { channelLayout: { in: ["2.0", "5.1"] } } } },
    ]);
  });

  it("combines language presence + channels as AND at release level", () => {
    const filters = buildCatalogAudioReleaseFilters({
      hasLang: "rus,original",
      channels: "5.1",
    });
    expect(filters).toEqual([
      { audioTracks: { some: { language: "rus" } } },
      { audioTracks: { some: { translationType: "original" } } },
      { audioTracks: { some: { channelLayout: { in: ["5.1"] } } } },
    ]);
  });

  it("emits premium filter as OR across russian and original Atmos", () => {
    const filters = buildCatalogAudioReleaseFilters({ premiumAudio: "true" });
    expect(filters).toHaveLength(1);
    expect(filters[0]).toMatchObject({
      audioTracks: { some: { OR: expect.any(Array) } },
    });
  });

  it("returns no filters when nothing is selected", () => {
    const filters = buildCatalogAudioReleaseFilters({});
    expect(filters).toEqual([]);
  });
});
