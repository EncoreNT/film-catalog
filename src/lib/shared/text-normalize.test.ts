import { describe, expect, it } from "vitest";
import {
  normalizeComparableTitle,
  normalizeMatchKeyTitle,
  normalizeSearchText,
  normalizeTitleSlash,
  searchTextEquals,
  searchTextIncludes,
} from "@/lib/shared/text-normalize";

describe("normalizeSearchText", () => {
  it("trims and lowercases with locale", () => {
    expect(normalizeSearchText("  ПИ  ")).toBe("пи");
  });
});

describe("normalizeTitleSlash", () => {
  it("replaces bilingual backslash with a forward slash", () => {
    expect(normalizeTitleSlash("Элементарно \\ Elemental")).toBe(
      "Элементарно / Elemental",
    );
  });
});

describe("normalizeComparableTitle", () => {
  it("returns null for blank values", () => {
    expect(normalizeComparableTitle("  ")).toBeNull();
    expect(normalizeComparableTitle(null)).toBeNull();
  });
});

describe("searchTextIncludes", () => {
  it("matches case-insensitively", () => {
    expect(searchTextIncludes("Пираты", "пир")).toBe(true);
    expect(searchTextEquals("ABC", "abc")).toBe(true);
  });
});
