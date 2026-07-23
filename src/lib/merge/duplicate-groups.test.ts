import { describe, expect, it } from "vitest";
import { groupMoviesByMatchKey } from "@/lib/merge/duplicate-groups";

describe("groupMoviesByMatchKey", () => {
  it("groups movies with the same matchKey", () => {
    const groups = groupMoviesByMatchKey([
      {
        id: 1,
        slug: "a",
        title: "A",
        year: 2001,
        status: "CATALOG",
        matchKey: "a|2001",
        _count: { releases: 1 },
      },
      {
        id: 2,
        slug: "b",
        title: "B",
        year: 2001,
        status: "DRAFT",
        matchKey: "a|2001",
        _count: { releases: 0 },
      },
      {
        id: 3,
        slug: "c",
        title: "C",
        year: 1999,
        status: "CATALOG",
        matchKey: "c|1999",
        _count: { releases: 1 },
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.matchKey).toBe("a|2001");
    expect(groups[0]?.movies).toHaveLength(2);
  });

  it("ignores singleton groups", () => {
    expect(
      groupMoviesByMatchKey([
        {
          id: 1,
          slug: "solo",
          title: "Solo",
          year: null,
          status: "CATALOG",
          matchKey: "solo|",
          _count: { releases: 1 },
        },
      ]),
    ).toEqual([]);
  });
});
