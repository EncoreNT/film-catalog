import { describe, expect, it } from "vitest";
import { ARCHIVE_QUALITY_METRIC_DEFS } from "@/lib/catalog/archive-quality-metrics";

describe("ARCHIVE_QUALITY_METRIC_DEFS", () => {
  const gold = ARCHIVE_QUALITY_METRIC_DEFS.find((def) => def.key === "gold")!;

  it("gold quick filter sets 4K + HDR_ANY preset", () => {
    expect(gold.toggleFilter(false)).toEqual({
      resolution: "4K",
      hdr: "HDR_ANY",
      premiumAudio: null,
    });
  });

  it("gold quick filter is active only for the gold preset", () => {
    expect(
      gold.isActive(
        { resolution: "4K", hdr: "HDR_ANY", premiumAudio: null },
        true,
      ),
    ).toBe(true);
    expect(
      gold.isActive({ resolution: "4K", hdr: null, premiumAudio: null }, true),
    ).toBe(false);
    expect(
      gold.isActive(
        { resolution: "4K", hdr: "HDR10,HDR10+", premiumAudio: null },
        true,
      ),
    ).toBe(false);
  });
});
