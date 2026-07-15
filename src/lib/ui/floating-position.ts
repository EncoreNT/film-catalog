export const FLOATING_GAP = 8;
export const FLOATING_VIEWPORT_PAD = 12;

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function viewportRect(): Rect {
  return {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
}

/** Portal into the nearest open dialog (top layer), else document.body. */
export function resolveDialogPortalTarget(anchor: Element | null): HTMLElement {
  const host = anchor?.closest("dialog");
  const dialog = host instanceof HTMLDialogElement && host.open ? host : null;
  return dialog ?? document.body;
}

export function clampHorizontalCenter(
  anchorCenterX: number,
  tooltipWidth: number,
  container: Rect,
  pad = FLOATING_VIEWPORT_PAD,
): number {
  const halfW = tooltipWidth / 2;
  const minX = container.left + pad + halfW;
  const maxX = container.right - pad - halfW;
  return Math.min(Math.max(anchorCenterX, minX), maxX);
}

export type VerticalPlacement = "top" | "bottom";

export function pickVerticalPlacement(
  anchorTop: number,
  anchorBottom: number,
  tooltipHeight: number,
  container: Rect,
  gap = FLOATING_GAP,
  pad = FLOATING_VIEWPORT_PAD,
): VerticalPlacement {
  const spaceAbove = anchorTop - container.top - pad;
  const spaceBelow = container.bottom - anchorBottom - pad;

  if (spaceAbove >= tooltipHeight + gap) return "top";
  if (spaceBelow >= tooltipHeight + gap) return "bottom";
  return spaceAbove >= spaceBelow ? "top" : "bottom";
}

export type CardinalPlacement = VerticalPlacement | "left" | "right";

export function pickCardinalPlacement(
  anchor: DOMRect,
  tooltip: DOMRect,
  container: Rect,
  gap = FLOATING_GAP,
  pad = FLOATING_VIEWPORT_PAD,
): CardinalPlacement {
  const fitsAbove =
    anchor.top - gap - tooltip.height > container.top + pad;
  const fitsBelow =
    anchor.bottom + gap + tooltip.height < container.bottom - pad;
  const fitsRight =
    anchor.right + gap + tooltip.width < container.right - pad;
  const fitsLeft = anchor.left - gap - tooltip.width > container.left + pad;

  if (!fitsAbove && fitsBelow) return "bottom";
  if (!fitsAbove && !fitsBelow && fitsRight) return "right";
  if (!fitsAbove && !fitsBelow && !fitsRight && fitsLeft) return "left";
  return "top";
}

export function clampBoxInContainer(
  left: number,
  top: number,
  width: number,
  height: number,
  container: Rect,
  pad = FLOATING_VIEWPORT_PAD,
): { left: number; top: number } {
  const minX = container.left + pad;
  const maxX = container.right - pad - width;
  const minY = container.top + pad;
  const maxY = container.bottom - pad - height;
  return {
    left: Math.min(Math.max(left, minX), maxX),
    top: Math.min(Math.max(top, minY), maxY),
  };
}
