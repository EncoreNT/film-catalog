import { describe, expect, it } from "vitest";
import { resolveRemakeGroupSlug } from "@/lib/remakes/remake-slug";

type RemakeGroupRow = { id: number; slug: string };

function createMockDb(existing: RemakeGroupRow[]) {
  return {
    remakeGroup: {
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

describe("resolveRemakeGroupSlug", () => {
  it("returns base slug when unique", async () => {
    const db = createMockDb([]);
    const slug = await resolveRemakeGroupSlug(
      db as unknown as Parameters<typeof resolveRemakeGroupSlug>[0],
      "Виновный",
    );
    expect(slug).toBe("vinovnyy");
  });

  it("appends suffix on collision", async () => {
    const db = createMockDb([{ id: 1, slug: "vinovnyy" }]);
    const slug = await resolveRemakeGroupSlug(
      db as unknown as Parameters<typeof resolveRemakeGroupSlug>[0],
      "Виновный",
    );
    expect(slug).toBe("vinovnyy-2");
  });

  it("excludes current id when updating", async () => {
    const db = createMockDb([{ id: 5, slug: "vinovnyy" }]);
    const slug = await resolveRemakeGroupSlug(
      db as unknown as Parameters<typeof resolveRemakeGroupSlug>[0],
      "Виновный",
      5,
    );
    expect(slug).toBe("vinovnyy");
  });
});
