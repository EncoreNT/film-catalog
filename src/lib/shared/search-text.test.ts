import { describe, expect, it } from "vitest";
import {
  normalizeSearchText,
  searchTextEquals,
  searchTextIncludes,
} from "@/lib/shared/search-text";

describe("normalizeSearchText", () => {
  it("lowercases Russian text", () => {
    expect(normalizeSearchText("  ПИ  ")).toBe("пи");
    expect(normalizeSearchText("Пираты")).toBe("пираты");
  });
});

describe("searchTextIncludes", () => {
  it("matches regardless of case", () => {
    expect(searchTextIncludes("Пираты Карибского моря", "пи")).toBe(true);
    expect(searchTextIncludes("Пираты Карибского моря", "ПИ")).toBe(true);
    expect(searchTextIncludes("Пираты Карибского моря", "моря")).toBe(true);
  });

  it("returns true for empty needle", () => {
    expect(searchTextIncludes("Пираты", "   ")).toBe(true);
  });

  it("returns false when no match", () => {
    expect(searchTextIncludes("Гарри Поттер", "пи")).toBe(false);
  });
});

describe("searchTextEquals", () => {
  it("compares case-insensitively", () => {
    expect(searchTextEquals("Пи", "пи")).toBe(true);
    expect(searchTextEquals("Пи", "ПИ")).toBe(true);
    expect(searchTextEquals("Пи", "Пираты")).toBe(false);
  });
});
