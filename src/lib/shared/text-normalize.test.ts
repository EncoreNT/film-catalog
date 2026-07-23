import { describe, expect, it } from "vitest";
import {
  normalizeComparableTitle,
  normalizeMatchKeyTitle,
  normalizeSearchText,
  searchTextEquals,
  searchTextIncludes,
} from "@/lib/shared/text-normalize";

describe("normalizeSearchText", () => {
  it("trims and lowercases with locale", () => {
    expect(normalizeSearchText("  ПИ  ")).toBe("пи");
  });
});

describe("normalizeMatchKeyTitle", () => {
  it("applies NFC and collapses whitespace", () => {
    expect(normalizeMatchKeyTitle("  Foo   Bar  ")).toBe("foo bar");
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
