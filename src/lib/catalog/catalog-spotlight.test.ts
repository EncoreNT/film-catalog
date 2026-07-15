import { describe, expect, it } from "vitest";
import {
  hasAnyHdrFilter,
  resolveCatalogSpotlightTier,
} from "@/lib/catalog/catalog-spotlight";

describe("resolveCatalogSpotlightTier", () => {
  it("returns ruby for elite rail preset (4K + HDR_ANY + Atmos)", () => {
    expect(
      resolveCatalogSpotlightTier({
        resolution: "4K",
        hdr: "HDR_ANY",
        premiumAudio: "true",
      }),
    ).toBe("ruby");
  });

  it("returns ruby for sidebar combo 4K + HDR10 + premium audio", () => {
    expect(
      resolveCatalogSpotlightTier({
        resolution: "4K",
        hdr: "HDR10,HDR10+",
        premiumAudio: "true",
      }),
    ).toBe("ruby");
  });

  it("returns gold for gold rail preset (4K + HDR_ANY)", () => {
    expect(
      resolveCatalogSpotlightTier({
        resolution: "4K",
        hdr: "HDR_ANY",
        premiumAudio: null,
      }),
    ).toBe("gold");
  });

  it("returns gold for sidebar combo 4K + HDR10 without premium audio", () => {
    expect(
      resolveCatalogSpotlightTier({
        resolution: "4K",
        hdr: "HDR_ANY",
        premiumAudio: null,
      }),
    ).toBe("gold");

    expect(
      resolveCatalogSpotlightTier({
        resolution: "4K",
        hdr: "HDR10,HDR10+",
        premiumAudio: null,
      }),
    ).toBe("gold");
  });

  it("returns general for single quality legs or non-catalog view", () => {
    expect(
      resolveCatalogSpotlightTier({
        resolution: "4K",
        hdr: null,
        premiumAudio: null,
      }),
    ).toBe("general");

    expect(
      resolveCatalogSpotlightTier({
        resolution: null,
        hdr: "HDR10,HDR10+",
        premiumAudio: null,
      }),
    ).toBe("general");

    expect(
      resolveCatalogSpotlightTier(
        { resolution: "4K", hdr: "HDR_ANY", premiumAudio: "true" },
        false,
      ),
    ).toBe("general");
  });
});

describe("hasAnyHdrFilter", () => {
  it("accepts HDR_ANY and explicit HDR formats", () => {
    expect(hasAnyHdrFilter("HDR_ANY")).toBe(true);
    expect(hasAnyHdrFilter("HDR10,HDR10+")).toBe(true);
    expect(hasAnyHdrFilter("DolbyVision")).toBe(true);
  });

  it("rejects null, empty, and SDR-only values", () => {
    expect(hasAnyHdrFilter(null)).toBe(false);
    expect(hasAnyHdrFilter("")).toBe(false);
    expect(hasAnyHdrFilter("SDR")).toBe(false);
  });
});
