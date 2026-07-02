import { describe, expect, it } from "vitest";
import { computeMatchKey } from "./movie-match-key";

describe("computeMatchKey", () => {
  it("lowercases and appends year", () => {
    expect(computeMatchKey("Drive", 2011)).toBe("drive|2011");
  });

  it("lowercases cyrillic (Unicode-aware, unlike SQLite lower())", () => {
    expect(computeMatchKey("Двадцать Одно / 21", 2008)).toBe(
      "двадцать одно / 21|2008",
    );
  });

  it("collapses whitespace and trims", () => {
    expect(computeMatchKey("  Dune   Part\tTwo  ", 2024)).toBe(
      "dune part two|2024",
    );
  });

  it("handles null year", () => {
    expect(computeMatchKey("Drive", null)).toBe("drive|");
  });

  it("is case-insensitive for matching", () => {
    expect(computeMatchKey("DRIVE", 2011)).toBe(computeMatchKey("Drive", 2011));
  });

  it("treats same title with and without trailing spaces as equal", () => {
    expect(computeMatchKey("Alita: Battle Angel ", 2019)).toBe(
      computeMatchKey("Alita: Battle Angel", 2019),
    );
  });
});
