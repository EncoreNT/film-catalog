import { describe, expect, it } from "vitest";
import {
  computeAverageRating,
  formatRatingDisplay,
} from "@/lib/movies/movie-rating";
import {
  filterCandidatesByMinRating,
  sortMovieCandidatesByRating,
} from "@/lib/movies/movie-rating-sort";

describe("computeAverageRating", () => {
  it("returns null for empty list", () => {
    expect(computeAverageRating([])).toBeNull();
  });

  it("averages ratings and rounds to one decimal", () => {
    expect(
      computeAverageRating([{ rating: 8 }, { rating: 9 }]),
    ).toBe(8.5);
  });
});

describe("formatRatingDisplay", () => {
  it("formats integers without decimal", () => {
    expect(formatRatingDisplay(8)).toBe("8");
  });

  it("formats decimals with one digit", () => {
    expect(formatRatingDisplay(8.5)).toBe("8.5");
  });
});

describe("sortMovieCandidatesByRating", () => {
  it("sorts by average with nulls last in asc order", () => {
    const ids = sortMovieCandidatesByRating(
      [
        { id: 1, ratings: [{ rating: 6 }] },
        { id: 2, ratings: [] },
        { id: 3, ratings: [{ rating: 9 }] },
      ],
      "asc",
    );
    expect(ids).toEqual([1, 3, 2]);
  });

  it("uses id tiebreaker", () => {
    const ids = sortMovieCandidatesByRating(
      [
        { id: 2, ratings: [{ rating: 8 }] },
        { id: 1, ratings: [{ rating: 8 }] },
      ],
      "asc",
    );
    expect(ids).toEqual([1, 2]);
  });
});

describe("filterCandidatesByMinRating", () => {
  it("filters by average threshold", () => {
    expect(
      filterCandidatesByMinRating(
        [
          { id: 1, ratings: [{ rating: 7 }] },
          { id: 2, ratings: [{ rating: 9 }] },
          { id: 3, ratings: [] },
        ],
        8,
      ),
    ).toEqual([2]);
  });
});
