import { describe, expect, it } from "vitest";
import { MovieStatus } from "@/generated/prisma/client";
import { eliteTierWhere } from "@/lib/catalog/archive-metrics";
import { archiveEliteTierWhere } from "@/lib/media/quality-predicates";

describe("archive elite tier semantics", () => {
  it("requires 4K, non-SDR HDR, and Russian Atmos each on some release", () => {
    expect(archiveEliteTierWhere).toEqual({
      AND: [
        {
          releases: {
            some: { videoTrack: { resolutionLabel: "4K" } },
          },
        },
        {
          releases: {
            some: { videoTrack: { hdr: { notIn: ["SDR"] } } },
          },
        },
        {
          releases: {
            some: {
              audioTracks: {
                some: {
                  isDefault: true,
                  language: "rus",
                  profile: { in: ["Atmos", "DTS:X MA"] },
                },
              },
            },
          },
        },
      ],
    });
  });

  it("eliteTierWhere scopes to catalog movies", () => {
    expect(eliteTierWhere).toMatchObject({
      status: MovieStatus.CATALOG,
      AND: archiveEliteTierWhere.AND,
    });
  });

  it("allows specs split across different releases (AND of three some-clauses)", () => {
    const andClauses = archiveEliteTierWhere.AND;
    expect(Array.isArray(andClauses)).toBe(true);
    expect(andClauses).toHaveLength(3);
    for (const clause of andClauses ?? []) {
      expect(clause).toHaveProperty("releases.some");
    }
  });
});
