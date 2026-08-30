import { describe, expect, it } from "vitest";
import { extractReleaseInputFromMovieCreate } from "@/lib/releases/release-api";

describe("extractReleaseInputFromMovieCreate", () => {
  it("ignores empty nested release", () => {
    expect(
      extractReleaseInputFromMovieCreate({
        title: "X",
        release: { filePath: null },
      }),
    ).toBeNull();
  });

  it("ignores nested release with blank filePath and no tracks", () => {
    expect(
      extractReleaseInputFromMovieCreate({
        title: "X",
        release: { filePath: "  " },
      }),
    ).toBeNull();
  });

  it("keeps nested release when filePath is set", () => {
    expect(
      extractReleaseInputFromMovieCreate({
        title: "X",
        release: { filePath: "/films/a.mkv" },
      }),
    ).toEqual({ filePath: "/films/a.mkv" });
  });
});
