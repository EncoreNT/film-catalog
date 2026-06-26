import { describe, expect, it } from "vitest";
import { parseMovieName, parseMoviePath } from "./name-parser";

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
