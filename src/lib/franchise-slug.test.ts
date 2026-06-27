import { describe, expect, it } from "vitest";
import { resolveFranchiseSlug } from "./franchise-slug";

type FranchiseRow = { id: number; slug: string };

function createMockDb(existing: FranchiseRow[]) {
  return {
    franchise: {
      findFirst: async ({
        where,
      }: {
        where: { slug: string; NOT?: { id: number } };
      }) => {
        const match = existing.find(
          (row) =>
            row.slug === where.slug &&
            (where.NOT == null || row.id !== where.NOT.id),
        );
        return match ? { id: match.id } : null;
      },
    },
  };
}

describe("resolveFranchiseSlug", () => {
  it("returns base slug when unique", async () => {
    const db = createMockDb([]);
    const slug = await resolveFranchiseSlug(
      db as unknown as Parameters<typeof resolveFranchiseSlug>[0],
      "Джон Уик",
    );
    expect(slug).toBe("dzhon-uik");
  });

  it("appends suffix on collision", async () => {
    const db = createMockDb([{ id: 1, slug: "dzhon-uik" }]);
    const slug = await resolveFranchiseSlug(
      db as unknown as Parameters<typeof resolveFranchiseSlug>[0],
      "Джон Уик",
    );
    expect(slug).toBe("dzhon-uik-2");
  });

  it("excludes current id when updating", async () => {
    const db = createMockDb([{ id: 5, slug: "dzhon-uik" }]);
    const slug = await resolveFranchiseSlug(
      db as unknown as Parameters<typeof resolveFranchiseSlug>[0],
      "Джон Уик",
      5,
    );
    expect(slug).toBe("dzhon-uik");
  });
});
