import { describe, expect, it } from "vitest";
import {
  movieHasMultipleReleaseVariants,
  shouldShowCatalogReleaseCountBadge,
} from "@/lib/movies/multipart-duration";

describe("movieHasMultipleReleaseVariants", () => {
  it("shows for ordinary multi-release movie", () => {
    expect(
      movieHasMultipleReleaseVariants(2, null, [
        { moviePartId: null },
        { moviePartId: null },
      ]),
    ).toBe(true);
  });

  it("is false for multipart with one file per series", () => {
    expect(
      movieHasMultipleReleaseVariants(2, 2, [
        { moviePartId: 1 },
        { moviePartId: 2 },
      ]),
    ).toBe(false);
  });

  it("is false when part count matches release count even without links", () => {
    expect(
      movieHasMultipleReleaseVariants(2, 2, [
        { moviePartId: null },
        { moviePartId: null },
      ]),
    ).toBe(false);
  });

  it("is true when a series has multiple releases", () => {
    expect(
      movieHasMultipleReleaseVariants(3, 2, [
        { moviePartId: 1 },
        { moviePartId: 1 },
        { moviePartId: 2 },
      ]),
    ).toBe(true);
  });

  it("is true when extra orphan releases exceed series count", () => {
    expect(
      movieHasMultipleReleaseVariants(4, 2, [
        { moviePartId: 1 },
        { moviePartId: 2 },
        { moviePartId: null },
        { moviePartId: null },
      ]),
    ).toBe(true);
  });
});

describe("shouldShowCatalogReleaseCountBadge", () => {
  it("matches movieHasMultipleReleaseVariants", () => {
    const releases = [{ moviePartId: 1 }, { moviePartId: 2 }] as const;
    expect(shouldShowCatalogReleaseCountBadge(2, 2, [...releases])).toBe(
      movieHasMultipleReleaseVariants(2, 2, [...releases]),
    );
  });
});
