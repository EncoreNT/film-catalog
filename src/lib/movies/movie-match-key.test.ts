import { describe, expect, it } from "vitest";
import { computeMatchKey } from "@/lib/movies/movie-match-key";

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

  it("folds mixed-case cyrillic like latin (regression: SQLite lower() misses Cyrillic)", () => {
    const title =
      "Подземелья и драконы: Честь среди воров / Dungeons & Dragons: Honor Among Thieves";
    expect(computeMatchKey(title, 2023)).toBe(
      "подземелья и драконы: честь среди воров / dungeons & dragons: honor among thieves|2023",
    );
    expect(computeMatchKey(title, 2023)).toBe(
      computeMatchKey(title.toLowerCase(), 2023),
    );
  });
});
