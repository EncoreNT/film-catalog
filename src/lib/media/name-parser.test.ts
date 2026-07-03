import { describe, expect, it } from "vitest";
import {
  parseMovieName,
  parseMoviePath,
  parseReleaseType,
} from "@/lib/media/name-parser";

describe("parseMovieName", () => {
  it("extracts title from release file name", () => {
    const result = parseMovieName("Inception.2010.1080p.BluRay.x264.mkv");
    expect(result.title).toContain("Inception");
  });

  it("prefers parent folder when file name is mostly tags", () => {
    const result = parseMovieName(
      "2160p.HDR.Atmos.mkv",
      "The Matrix 1999",
    );
    expect(result.title).toContain("Matrix");
    expect(result.year).toBe(1999);
  });
});

describe("parseMoviePath", () => {
  it("parses unix file paths", () => {
    const result = parseMoviePath("/Movies/Dune Part Two (2024)/Dune.Part.Two.2160p.mkv");
    expect(result.title.length).toBeGreaterThan(0);
    expect(result.year).toBe(2024);
  });
});

describe("parseReleaseType", () => {
  it("detects a hybrid release", () => {
    expect(parseReleaseType("Dune.Part.Two.2024.2160p.Hybrid.mkv")).toBe(
      "hybrid",
    );
  });

  it("prefers hybrid over the underlying source types in a merged release", () => {
    expect(
      parseReleaseType(
        "Dune.Part.Two.2024.2160p.UHD.BDRemux.HDR.Hybrid.WEB-DL.DV.TrueHD.Atmos.mkv",
      ),
    ).toBe("hybrid");
  });

  it("strips the hybrid tag from the cleaned title", () => {
    const result = parseMovieName(
      "Dune.Part.Two.2024.2160p.UHD.BDRemux.HDR.Hybrid.WEB-DL.DV.TrueHD.Atmos.mkv",
    );
    expect(result.releaseType).toBe("hybrid");
    expect(result.title).not.toMatch(/hybrid/i);
  });

  it("still classifies a non-hybrid BDRemux as bdremux", () => {
    expect(parseReleaseType("Inception.2010.1080p.BDRemux.mkv")).toBe(
      "bdremux",
    );
  });
});
