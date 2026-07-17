import { describe, expect, it } from "vitest";
import { suggestBuildOutputFilename, suggestBuildOutputPath } from "@/lib/builds/build-filename";

describe("suggestBuildOutputFilename", () => {
  it("builds filename from movie metadata", () => {
    expect(
      suggestBuildOutputFilename({
        movieTitle: "Inception",
        movieYear: 2010,
        releaseType: "bluray",
        version: "theatrical",
        resolutionLabel: "4K",
        hdr: "HDR10",
      }),
    ).toContain("Inception (2010)");
    expect(
      suggestBuildOutputFilename({
        movieTitle: "Inception",
        movieYear: 2010,
        releaseType: "bluray",
        version: "theatrical",
        resolutionLabel: "4K",
        hdr: "HDR10",
      }),
    ).toMatch(/\.mkv$/);
  });
});

describe("suggestBuildOutputPath", () => {
  it("joins media dir with suggested filename", () => {
    expect(
      suggestBuildOutputPath("D:\\TV\\Movies", {
        movieTitle: "Test",
        movieYear: null,
        releaseType: "",
        version: "theatrical",
      }),
    ).toBe("/mnt/d/TV/Movies/Test.mkv");
  });
});
