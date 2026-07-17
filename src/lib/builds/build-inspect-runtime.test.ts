import { describe, expect, it } from "vitest";
import { durationDeltaWarnings } from "@/lib/builds/build-inspect-runtime";

describe("durationDeltaWarnings", () => {
  it("returns warning when delta exceeds threshold", () => {
    const warnings = durationDeltaWarnings(7200, 7190, "RU DTS");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.code).toBe("duration_mismatch");
  });

  it("returns empty array for close durations", () => {
    expect(durationDeltaWarnings(100, 100.5, "RU")).toEqual([]);
  });
});
