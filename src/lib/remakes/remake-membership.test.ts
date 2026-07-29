import { describe, expect, it, vi } from "vitest";
import { getMovieRemakeMemberships } from "@/lib/remakes/remake-membership";
import { getCatalogRemakeBadges } from "@/lib/remakes/remake-catalog-badges";

describe("getMovieRemakeMemberships", () => {
  it("returns co-members excluding the queried movie", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 1,
        groupId: 10,
        movieId: 100,
        role: "ORIGINAL",
        group: {
          id: 10,
          name: "Виновный",
          slug: "vinovnyj",
          members: [
            {
              movieId: 100,
              role: "ORIGINAL",
              movie: {
                id: 100,
                title: "Виновный (2018)",
                slug: "vinovnyj-2018",
                year: 2018,
              },
            },
            {
              movieId: 200,
              role: "REMAKE",
              movie: {
                id: 200,
                title: "Виновный (2021)",
                slug: "vinovnyj-2021",
                year: 2021,
              },
            },
          ],
        },
      },
    ]);

    const result = await getMovieRemakeMemberships(
      { remakeMember: { findMany } } as never,
      100,
    );

    expect(result).toHaveLength(1);
    expect(result[0].groupName).toBe("Виновный");
    expect(result[0].role).toBe("ORIGINAL");
    expect(result[0].coMembers).toEqual([
      {
        movieId: 200,
        movieTitle: "Виновный (2021)",
        movieSlug: "vinovnyj-2021",
        movieYear: 2021,
        role: "REMAKE",
      },
    ]);
    expect(result[0].groupSize).toBe(2);
  });
});

describe("getCatalogRemakeBadges", () => {
  it("returns empty map for empty input", async () => {
    const result = await getCatalogRemakeBadges([]);
    expect(result.size).toBe(0);
  });

  it("maps movie ids to badge data", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        movieId: 100,
        groupId: 10,
        role: "ORIGINAL",
        group: {
          id: 10,
          name: "Король Лев",
          members: [
            {
              movieId: 100,
              role: "ORIGINAL",
              movie: {
                id: 100,
                title: "Король Лев",
                slug: "korol-lev",
                year: 1994,
              },
            },
            {
              movieId: 200,
              role: "REMAKE",
              movie: {
                id: 200,
                title: "Король Лев",
                slug: "korol-lev-2",
                year: 2019,
              },
            },
          ],
        },
      },
    ]);

    const result = await getCatalogRemakeBadges(
      [100],
      { remakeMember: { findMany } } as never,
    );

    expect(result.get(100)).toEqual({
      role: "ORIGINAL",
      groupId: 10,
      groupName: "Король Лев",
      groupSize: 2,
      coMembers: [
        {
          movieId: 200,
          movieTitle: "Король Лев",
          movieSlug: "korol-lev-2",
          movieYear: 2019,
          role: "REMAKE",
        },
      ],
    });
  });
});
