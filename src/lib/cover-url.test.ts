import { describe, expect, it } from "vitest";
import { movieCoverUrl, movieCoverUrlFromMovie } from "./cover-url";

describe("movieCoverUrl", () => {
  it("appends version query param", () => {
    expect(movieCoverUrl(42, 1_700_000_000_000)).toBe(
      "/api/covers/42?v=1700000000000",
    );
    expect(movieCoverUrl(42, new Date("2024-06-01T12:00:00.000Z"))).toBe(
      "/api/covers/42?v=1717243200000",
    );
  });

  it("returns null when movie has no cover", () => {
    expect(
      movieCoverUrlFromMovie({
        id: 1,
        coverPath: null,
        updatedAt: new Date(),
      }),
    ).toBeNull();
  });
});
