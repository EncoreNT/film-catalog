import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  countFacetFilters,
  facetCountMap,
  parseMulti,
  sortByDict,
  toggleMulti,
} from "@/lib/catalog/filter-bar-utils";

describe("filter-bar-utils", () => {
  describe("parseMulti", () => {
    it("splits comma-separated values", () => {
      expect(parseMulti("4K,1080p")).toEqual(["4K", "1080p"]);
    });

    it("returns empty array for null", () => {
      expect(parseMulti(null)).toEqual([]);
    });

    it("drops empty segments", () => {
      expect(parseMulti("4K,,1080p,")).toEqual(["4K", "1080p"]);
    });
  });

  describe("toggleMulti", () => {
    it("adds a value when absent", () => {
      expect(toggleMulti(["4K"], "1080p")).toEqual(["4K", "1080p"]);
    });

    it("removes a value when present", () => {
      expect(toggleMulti(["4K", "1080p"], "4K")).toEqual(["1080p"]);
    });
  });

  describe("facetCountMap", () => {
    it("maps non-null facet values to counts", () => {
      const map = facetCountMap([
        { value: "4K", count: 3 },
        { value: null, count: 1 },
        { value: "1080p", count: 5 },
      ]);
      expect(map.get("4K")).toBe(3);
      expect(map.get("1080p")).toBe(5);
      expect(map.has(null as unknown as string)).toBe(false);
    });
  });

  describe("countFacetFilters", () => {
    it("counts only facet panel params", () => {
      const params = new URLSearchParams(
        "resolution=4K&genre=action&hdr=1&q=test&sort=title",
      );
      expect(countFacetFilters(params)).toBe(3);
    });
  });

  describe("countActiveFilters", () => {
    it("counts scalar, facet and non-default sort/watched", () => {
      const params = new URLSearchParams(
        "q=test&resolution=4K&sort=rating&watched=yes",
      );
      expect(countActiveFilters(params)).toBe(4);
    });

    it("ignores default sort and watched", () => {
      const params = new URLSearchParams("sort=title&watched=all");
      expect(countActiveFilters(params)).toBe(0);
    });
  });

  describe("sortByDict", () => {
    const dict = [
      { value: "4K" },
      { value: "1080p" },
      { value: "720p" },
    ];

    it("orders facets by dictionary and drops null values", () => {
      const sorted = sortByDict(
        [
          { value: "720p", count: 1 },
          { value: null, count: 0 },
          { value: "4K", count: 2 },
          { value: "1080p", count: 3 },
        ],
        dict,
      );
      expect(sorted.map((f) => f.value)).toEqual(["4K", "1080p", "720p"]);
    });

    it("puts unknown values after known dictionary entries", () => {
      const sorted = sortByDict(
        [{ value: "other", count: 1 }, { value: "4K", count: 2 }],
        dict,
      );
      expect(sorted.map((f) => f.value)).toEqual(["4K", "other"]);
    });
  });
});
