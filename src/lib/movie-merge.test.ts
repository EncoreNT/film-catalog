import { describe, expect, it } from "vitest";
import { planMerge } from "./movie-merge";

describe("planMerge", () => {
  it("detects field conflicts when both movies have data", () => {
    const plan = planMerge(
      {
        id: 1,
        description: "A",
        coverPath: "covers/1.jpg",
        rating: 8,
        watchedAt: new Date("2024-01-01"),
        _count: { releases: 2 },
      },
      {
        id: 2,
        description: "B",
        coverPath: "covers/2.jpg",
        rating: 7,
        watchedAt: new Date("2024-06-01"),
        _count: { releases: 1 },
      },
      [10],
      [11],
    );

    expect(plan.canonicalReleaseCount).toBe(2);
    expect(plan.otherReleaseCount).toBe(1);
    expect(plan.conflicts.description).toBe(true);
    expect(plan.conflicts.coverPath).toBe(true);
    expect(plan.conflicts.rating).toBe(true);
    expect(plan.conflicts.watchedAt).toBe(true);
    expect(plan.conflicts.franchiseSlots).toBe(false);
  });
});
