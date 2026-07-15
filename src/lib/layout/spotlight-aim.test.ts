import { describe, expect, it } from "vitest";
import {
  computeSpotlightRotation,
  defaultSpotlightTarget,
  focusPoolFromPoint,
  resolveFranchiseHoverAim,
  resolveSpotlightAim,
  spotlightPoolPosition,
} from "@/lib/layout/spotlight-aim";

const viewport = { width: 1200, height: 800 };

describe("computeSpotlightRotation", () => {
  it("returns zero when target equals the rest aim point", () => {
    const rest = defaultSpotlightTarget(viewport);
    expect(computeSpotlightRotation("left", rest, viewport, rest)).toBe(0);
    expect(computeSpotlightRotation("right", rest, viewport, rest)).toBe(0);
  });

  it("rotates left rig toward a poster on the left", () => {
    const rest = defaultSpotlightTarget(viewport);
    const cover = { x: 220, y: 360 };
    const rotation = computeSpotlightRotation("left", cover, viewport, rest);
    expect(rotation).not.toBe(0);
    expect(Math.abs(rotation)).toBeGreaterThan(5);
  });

  it("rotates right rig toward a release panel on the right", () => {
    const rest = defaultSpotlightTarget(viewport);
    const panel = { x: 900, y: 420 };
    const rotation = computeSpotlightRotation("right", panel, viewport, rest);
    expect(rotation).not.toBe(0);
    expect(Math.abs(rotation)).toBeGreaterThan(5);
  });
});

describe("resolveSpotlightAim", () => {
  it("uses center rest when no targets are registered", () => {
    const aim = resolveSpotlightAim(viewport, {
      left: null,
      right: null,
      hover: null,
    });
    expect(aim.leftBearing).toBe(124);
    expect(aim.rightBearing).toBe(238);
    expect(aim.focusPool).toBeNull();
    expect(aim.leftPool.x).toBe("50.0%");
  });

  it("prefers hover target for both rigs and sets focus pool", () => {
    const hover = { x: 640, y: 520 };
    const aim = resolveSpotlightAim(viewport, {
      left: { x: 200, y: 300 },
      right: { x: 950, y: 400 },
      hover,
    });
    const hoverLeft = computeSpotlightRotation(
      "left",
      hover,
      viewport,
      defaultSpotlightTarget(viewport),
    );
    const hoverRight = computeSpotlightRotation(
      "right",
      hover,
      viewport,
      defaultSpotlightTarget(viewport),
    );
    expect(aim.leftBearing).toBeCloseTo(124 + hoverLeft, 5);
    expect(aim.rightBearing).toBeCloseTo(238 + hoverRight, 5);
    expect(aim.focusPool?.x).toBe("53.3%");
  });
});

describe("resolveFranchiseHoverAim", () => {
  it("steers both bearings toward a card without pool mask churn", () => {
    const card = { x: 400, y: 600 };
    const aim = resolveFranchiseHoverAim(card, viewport);
    const rest = defaultSpotlightTarget(viewport);
    expect(aim.leftBearing).toBeCloseTo(
      124 + computeSpotlightRotation("left", card, viewport, rest),
      5,
    );
    expect(aim.rightBearing).toBeCloseTo(
      238 + computeSpotlightRotation("right", card, viewport, rest),
      5,
    );
    expect(aim.focusPool).toEqual(focusPoolFromPoint(card, viewport));
  });
});

describe("focusPoolFromPoint", () => {
  it("maps viewport coords to percent strings", () => {
    expect(focusPoolFromPoint({ x: 600, y: 400 }, viewport)).toEqual({
      x: "50.0%",
      y: "50.0%",
    });
  });
});

describe("spotlightPoolPosition", () => {
  it("clamps pool x within safe margins", () => {
    expect(spotlightPoolPosition({ x: 0, y: 400 }, viewport).x).toBe("8.0%");
    expect(spotlightPoolPosition({ x: 1200, y: 400 }, viewport).x).toBe("92.0%");
  });
});
