import { describe, expect, it } from "vitest";
import { posterQuality, type PosterFileMetadata } from "./poster-quality";

function metadata(width: number, height: number): PosterFileMetadata {
  return { status: "ready", width, height, bytes: 100, format: "webp",
    mtimeMs: 1, ctimeMs: 1, checkedAt: "2026-11-15T00:00:00.000Z" };
}

describe("poster quality groups", () => {
  it.each([
    [300, 450, "low"], [599, 900, "low"], [600, 899, "low"],
    [600, 900, "medium"], [1000, 1500, "medium"], [1200, 1799, "medium"],
    [1200, 1800, "high"], [1600, 2400, "high"], [5250, 7874, "high"],
    [1920, 1080, "medium"], [4000, 500, "low"], [2000, 2000, "high"],
  ] as const)("rates %s × %s as %s after a 2:3 crop", (width, height, expected) => {
    expect(posterQuality(metadata(width, height))).toBe(expected);
  });

  it("distinguishes missing and unreadable files from low-resolution images", () => {
    expect(posterQuality(null)).toBe("missing");
    expect(posterQuality({ ...metadata(300, 450), status: "unreadable" })).toBe("unreadable");
  });
});
