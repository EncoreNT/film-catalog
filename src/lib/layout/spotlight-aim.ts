export type SpotlightSide = "left" | "right";

/** Default conic peak bearing in CSS (matches globals.css initial values). */
export const SPOTLIGHT_LEFT_BEARING_BASE = 124;
export const SPOTLIGHT_RIGHT_BEARING_BASE = 238;

export interface ViewportSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Neutral aim when no page targets are registered — catalog / idle pages. */
export function defaultSpotlightTarget(viewport: ViewportSize): Point {
  return {
    x: viewport.width * 0.5,
    y: viewport.height * 0.38,
  };
}

function angleDeg(origin: Point, target: Point): number {
  return (Math.atan2(target.y - origin.y, target.x - origin.x) * 180) / Math.PI;
}

function spotlightOrigin(side: SpotlightSide, viewport: ViewportSize): Point {
  return side === "left"
    ? { x: 0, y: 0 }
    : { x: viewport.width, y: 0 };
}

/**
 * Rotation offset (deg) for a corner rig so its beam hits `target`.
 * Zero rotation = beam aimed at `restTarget` (matches static CSS baseline).
 */
export function computeSpotlightRotation(
  side: SpotlightSide,
  target: Point,
  viewport: ViewportSize,
  restTarget: Point = defaultSpotlightTarget(viewport),
): number {
  const origin = spotlightOrigin(side, viewport);
  return angleDeg(origin, target) - angleDeg(origin, restTarget);
}

export function elementCenter(element: HTMLElement): Point {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

/** Lit pool anchor on the stage floor — follows target horizontally. */
export function spotlightPoolPosition(
  target: Point,
  viewport: ViewportSize,
): { x: string; y: string } {
  const xPct = Math.min(92, Math.max(8, (target.x / viewport.width) * 100));
  const yPct = Math.min(
    18,
    Math.max(-12, (target.y / viewport.height) * 100 - 8),
  );
  return {
    x: `${xPct.toFixed(1)}%`,
    y: `${yPct.toFixed(1)}%`,
  };
}

export interface SpotlightAimAngles {
  leftBearing: number;
  rightBearing: number;
  leftPool: { x: string; y: string };
  rightPool: { x: string; y: string };
  focusPool: { x: string; y: string } | null;
}

export function focusPoolFromPoint(
  point: Point,
  viewport: ViewportSize,
): { x: string; y: string } {
  return {
    x: `${((point.x / viewport.width) * 100).toFixed(1)}%`,
    y: `${((point.y / viewport.height) * 100).toFixed(1)}%`,
  };
}

export function resolveFranchiseHoverAim(
  target: Point,
  viewport: ViewportSize,
): Pick<SpotlightAimAngles, "leftBearing" | "rightBearing" | "focusPool"> {
  const rest = defaultSpotlightTarget(viewport);
  const leftRotate = computeSpotlightRotation("left", target, viewport, rest);
  const rightRotate = computeSpotlightRotation("right", target, viewport, rest);

  return {
    leftBearing: SPOTLIGHT_LEFT_BEARING_BASE + leftRotate,
    rightBearing: SPOTLIGHT_RIGHT_BEARING_BASE + rightRotate,
    focusPool: focusPoolFromPoint(target, viewport),
  };
}

export function resolveSpotlightAim(
  viewport: ViewportSize,
  targets: {
    left: Point | null;
    right: Point | null;
    hover: Point | null;
  },
): SpotlightAimAngles {
  const rest = defaultSpotlightTarget(viewport);
  const leftTarget = targets.hover ?? targets.left ?? rest;
  const rightTarget = targets.hover ?? targets.right ?? rest;
  const leftRotate = computeSpotlightRotation("left", leftTarget, viewport, rest);
  const rightRotate = computeSpotlightRotation("right", rightTarget, viewport, rest);

  const focusPoint = targets.hover ?? null;

  return {
    leftBearing: SPOTLIGHT_LEFT_BEARING_BASE + leftRotate,
    rightBearing: SPOTLIGHT_RIGHT_BEARING_BASE + rightRotate,
    leftPool: spotlightPoolPosition(leftTarget, viewport),
    rightPool: spotlightPoolPosition(rightTarget, viewport),
    focusPool: focusPoint
      ? focusPoolFromPoint(focusPoint, viewport)
      : null,
  };
}
