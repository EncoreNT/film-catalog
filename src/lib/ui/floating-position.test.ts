import { describe, expect, it } from "vitest";
import {
  clampBoxInContainer,
  clampHorizontalCenter,
  pickCardinalPlacement,
  pickVerticalPlacement,
} from "@/lib/ui/floating-position";

const container = { left: 0, top: 0, right: 1000, bottom: 800 };

describe("floating-position", () => {
  describe("clampHorizontalCenter", () => {
    it("keeps centered x when it fits", () => {
      expect(clampHorizontalCenter(500, 200, container)).toBe(500);
    });

    it("clamps to the left edge", () => {
      expect(clampHorizontalCenter(20, 200, container, 12)).toBe(112);
    });

    it("clamps to the right edge", () => {
      expect(clampHorizontalCenter(980, 200, container, 12)).toBe(888);
    });
  });

  describe("pickVerticalPlacement", () => {
    it("prefers top when there is room above", () => {
      expect(
        pickVerticalPlacement(400, 440, 120, container, 8, 12),
      ).toBe("top");
    });

    it("falls back to bottom when above is too tight", () => {
      expect(
        pickVerticalPlacement(40, 80, 120, container, 8, 12),
      ).toBe("bottom");
    });

    it("picks the side with more space when neither fits fully", () => {
      expect(
        pickVerticalPlacement(390, 410, 500, container, 8, 12),
      ).toBe("top");
    });
  });

  describe("pickCardinalPlacement", () => {
    const anchor = {
      top: 40,
      bottom: 80,
      left: 100,
      right: 160,
      width: 60,
      height: 40,
      x: 100,
      y: 40,
      toJSON: () => ({}),
    } as DOMRect;

    it("prefers bottom when top does not fit", () => {
      const tooltip = {
        ...anchor,
        width: 120,
        height: 100,
      } as DOMRect;
      expect(pickCardinalPlacement(anchor, tooltip, container)).toBe("bottom");
    });

    it("falls back to right when vertical sides are blocked", () => {
      const tight = { left: 0, top: 0, right: 300, bottom: 120 };
      const tooltip = {
        ...anchor,
        width: 80,
        height: 90,
      } as DOMRect;
      expect(pickCardinalPlacement(anchor, tooltip, tight)).toBe("right");
    });
  });

  describe("clampBoxInContainer", () => {
    it("clamps left/top inside the container", () => {
      expect(
        clampBoxInContainer(-50, -20, 200, 100, container, 12),
      ).toEqual({ left: 12, top: 12 });
    });

    it("clamps right/bottom overflow", () => {
      expect(
        clampBoxInContainer(900, 750, 200, 100, container, 12),
      ).toEqual({ left: 788, top: 688 });
    });
  });
});
