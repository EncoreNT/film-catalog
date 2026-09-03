import { describe, expect, it } from "vitest";
import {
  catalogDisplayDurationSeconds,
  detailBaselineDurationSeconds,
  movieHasMultipleReleaseVariants,
  shouldShowCatalogReleaseCountBadge,
} from "@/lib/movies/multipart-duration";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function releaseSlice(
  partial: Pick<ReleaseWithTracks, "version" | "durationSeconds">,
): ReleaseWithTracks {
  return partial as ReleaseWithTracks;
}

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

describe("detailBaselineDurationSeconds", () => {
  it("uses theatrical runtime and ignores a longer kid-mode cut", () => {
    expect(
      detailBaselineDurationSeconds(
        [
          releaseSlice({ version: "theatrical", durationSeconds: 5808 }),
          releaseSlice({ version: "kid-mode", durationSeconds: 6431 }),
        ],
        null,
      ),
    ).toBe(5808);
  });

  it("stays null when only an alternate cut is present", () => {
    expect(
      detailBaselineDurationSeconds(
        [releaseSlice({ version: "kid-mode", durationSeconds: 6431 })],
        null,
      ),
    ).toBeNull();
  });
});

describe("catalogDisplayDurationSeconds", () => {
  it("falls back to the longest cut when theatrical duration is missing", () => {
    expect(
      catalogDisplayDurationSeconds(
        [releaseSlice({ version: "kid-mode", durationSeconds: 6431 })],
        null,
      ),
    ).toBe(6431);
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
