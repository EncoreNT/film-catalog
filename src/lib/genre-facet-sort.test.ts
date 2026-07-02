import { describe, expect, it } from "vitest";
import { sortGenreFacets } from "./genre-facet-sort";

const facets = [
  { value: "drama", count: 31 },
  { value: "comedy", count: 22 },
  { value: "action", count: 21 },
  { value: "mysticism", count: 1 },
];

describe("sortGenreFacets", () => {
  it("sorts alphabetically by Russian label by default", () => {
    const sorted = sortGenreFacets(facets, "alpha").map((f) => f.value);
    expect(sorted).toEqual(["action", "drama", "comedy", "mysticism"]);
  });

  it("sorts by count descending with alpha tiebreaker", () => {
    const sorted = sortGenreFacets(facets, "count").map((f) => f.value);
    expect(sorted).toEqual(["drama", "comedy", "action", "mysticism"]);
  });

  it("skips facets without value", () => {
    const sorted = sortGenreFacets(
      [{ value: null, count: 5 }, ...facets],
      "alpha",
    );
    expect(sorted).toHaveLength(4);
  });
});
