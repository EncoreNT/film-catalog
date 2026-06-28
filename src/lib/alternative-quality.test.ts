import { describe, expect, it } from "vitest";
import { alternativeQualityLabel } from "./alternative-quality";

describe("alternativeQualityLabel", () => {
  it("combines release type and resolution", () => {
    expect(
      alternativeQualityLabel({
        id: 2,
        slug: "film-2",
        title: "Film",
        releaseType: "bdrip",
        videoTrack: { resolutionLabel: "1080p" },
      }),
    ).toBe("BDRip · 1080p");
  });

  it("falls back when there are no distinguishing tags", () => {
    expect(
      alternativeQualityLabel({
        id: 2,
        slug: "film-2",
        title: "Film",
        releaseType: null,
        videoTrack: null,
      }),
    ).toBe("другая версия");
  });
});
