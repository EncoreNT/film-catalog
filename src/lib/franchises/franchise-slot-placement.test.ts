import { describe, expect, it } from "vitest";
import { parsePlacementTarget } from "@/lib/franchises/franchise-slot-placement";

describe("parsePlacementTarget", () => {
  it("defaults to end for invalid input", () => {
    expect(parsePlacementTarget(null)).toEqual({ kind: "end" });
    expect(parsePlacementTarget("bad")).toEqual({ kind: "end" });
    expect(parsePlacementTarget({ kind: "before" })).toEqual({ kind: "end" });
  });

  it("parses before with slotId", () => {
    expect(parsePlacementTarget({ kind: "before", slotId: 5 })).toEqual({
      kind: "before",
      slotId: 5,
    });
  });

  it("parses fill with slotId", () => {
    expect(parsePlacementTarget({ kind: "fill", slotId: 3 })).toEqual({
      kind: "fill",
      slotId: 3,
    });
  });

  it("ignores non-number slotId", () => {
    expect(parsePlacementTarget({ kind: "fill", slotId: "3" })).toEqual({
      kind: "end",
    });
  });
});
