import { describe, expect, it } from "vitest";
import type { CalendarWatch } from "./watch-calendar";
import { buildWatchTimeline } from "./watch-timeline";

function watch(id: number, watchedOn: string, movieId = id): CalendarWatch {
  return { id, watchedOn, movie: { id: movieId, slug: `film-${movieId}`, title: `Фильм ${movieId}`, year: null, description: null, coverUrl: null, genres: [], rating: null, ratings: [] } };
}

describe("viewing timeline", () => {
  it("groups films of one day, skips empty days, and sorts independently of input order", () => {
    const watches = [watch(4, "2026-11-08"), watch(3, "2026-11-04"), watch(1, "2026-10-31"), watch(2, "2026-11-04")];
    const days = buildWatchTimeline(watches);
    expect(days.map(({ iso, gapDays }) => ({ iso, gapDays }))).toEqual([
      { iso: "2026-10-31", gapDays: null }, { iso: "2026-11-04", gapDays: 4 }, { iso: "2026-11-08", gapDays: 4 },
    ]);
    expect(days[1].watches.map((item) => item.id)).toEqual([2, 3]);
    expect(watches.map((item) => item.id)).toEqual([4, 3, 1, 2]);
  });
  it("retains repeat viewings of the same film on different dates", () => {
    expect(buildWatchTimeline([watch(1, "2026-11-01", 9), watch(2, "2026-11-03", 9)]).map((day) => day.watches[0].movie.id)).toEqual([9, 9]);
  });
  it.each([
    ["2024-02-28", "2024-03-01", 2],
    ["2026-03-28", "2026-03-30", 2],
    ["2026-12-31", "2027-01-01", 1],
    ["2025-01-01", "2026-01-01", 365],
  ])("counts elapsed calendar days across leap days, DST and year boundaries: %s", (first, last, expected) => {
    expect(buildWatchTimeline([watch(1, first), watch(2, last)])[1].gapDays).toBe(expected);
  });
  it("handles empty and single-day periods without inventing neighbours", () => {
    expect(buildWatchTimeline([])).toEqual([]);
    const days = buildWatchTimeline([watch(1, "2026-11-08"), watch(2, "2026-11-08")]);
    expect(days).toHaveLength(1);
    expect(days[0].gapDays).toBeNull();
    expect(days[0].watches).toHaveLength(2);
  });
});
