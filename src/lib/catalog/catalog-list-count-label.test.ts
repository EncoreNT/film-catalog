import { describe, expect, it } from "vitest";
import { catalogListCountLabel } from "@/lib/catalog/catalog-list-count-label";

describe("catalogListCountLabel", () => {
  it("uses many-form for typical catalog sizes", () => {
    expect(catalogListCountLabel("catalog", 288, 412)).toEqual({
      movieWord: "фильмов",
      releaseWord: "релизов",
      displayText: "288 фильмов / 412 релизов",
      ariaLabel: "288 фильмов, 412 релизов",
    });
  });

  it("uses one-form", () => {
    expect(catalogListCountLabel("catalog", 1, 1).displayText).toBe(
      "1 фильм / 1 релиз",
    );
  });

  it("uses few-form for drafts", () => {
    expect(catalogListCountLabel("draft", 2, 3).displayText).toBe(
      "2 черновика / 3 релиза",
    );
  });

  it("keeps excluded movie wording", () => {
    expect(catalogListCountLabel("excluded", 5, 8).displayText).toBe(
      "5 скрытых / 8 релизов",
    );
  });
});
