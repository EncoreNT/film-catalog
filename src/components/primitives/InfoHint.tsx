"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const emptySubscribe = () => () => {};
const getMounted = () => true;
const getServerSnapshot = () => false;

interface InfoHintProps {
  text: ReactNode;
  label?: string;
}

type Placement = "top" | "bottom" | "right" | "left";

interface Coords {
  left: number;
  top: number;
}

const TOOLTIP_GAP = 8;
const VIEWPORT_PAD = 8;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

function viewportRect(): Rect {
  return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
}

/**
 * Inline "?" affordance that reveals a small tooltip on hover or keyboard focus.
 *
 * The tooltip is rendered through a React portal. When the trigger lives inside
 * a native `<dialog>` opened via `showModal()` (Modal / ConfirmDialog), the
 * dialog is in the browser's top layer, which paints above EVERYTHING in the
 * normal DOM — including a portal attached to document.body. So the tooltip is
 * portalled into that dialog instead, putting it in the same top layer and
 * above the modal's own content. When there is no dialog (e.g. the catalog
 * page), it falls back to document.body.
 *
 * Positioning is JS-driven with auto-flip and edge-clamping against the
 * container's rect (dialog or viewport), so the tooltip is never clipped by an
 * `overflow` ancestor and never spills outside its container.
 */
export function InfoHint({ text, label }: InfoHintProps) {
  const ariaLabel = label ? `Подсказка: ${label}` : "Подсказка";
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Portals only render on the client; useSyncExternalStore returns false
  // during SSR and true on the client without a setState-in-effect.
  const mounted = useSyncExternalStore(emptySubscribe, getMounted, getServerSnapshot);

  const clearTimers = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const show = useCallback(() => {
    clearTimers();
    showTimer.current = setTimeout(() => {
      // Portal into the nearest open dialog so the tooltip shares its top
      // layer; otherwise fall back to the document body.
      const host = triggerRef.current?.closest("dialog");
      const dialog =
        host instanceof HTMLDialogElement && host.open ? host : null;
      setPortalTarget(dialog ?? document.body);
      setOpen(true);
    }, 80);
  }, [clearTimers]);

  const hide = useCallback(() => {
    clearTimers();
    hideTimer.current = setTimeout(() => setOpen(false), 60);
  }, [clearTimers]);

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const tRect = trigger.getBoundingClientRect();
    const ttRect = tooltip.getBoundingClientRect();

    // Clamp/flip against the dialog the tooltip was portalled into, or the
    // viewport when there is no dialog.
    const container =
      portalTarget && portalTarget !== document.body
        ? portalTarget.getBoundingClientRect()
        : viewportRect();

    const fitsAbove = tRect.top - TOOLTIP_GAP - ttRect.height > container.top + VIEWPORT_PAD;
    const fitsBelow =
      tRect.bottom + TOOLTIP_GAP + ttRect.height < container.bottom - VIEWPORT_PAD;
    const fitsRight =
      tRect.right + TOOLTIP_GAP + ttRect.width < container.right - VIEWPORT_PAD;
    const fitsLeft = tRect.left - TOOLTIP_GAP - ttRect.width > container.left + VIEWPORT_PAD;

    // Prefer above, then below, then right, then left.
    let placement: Placement = "top";
    if (!fitsAbove && fitsBelow) placement = "bottom";
    else if (!fitsAbove && !fitsBelow && fitsRight) placement = "right";
    else if (!fitsAbove && !fitsBelow && !fitsRight && fitsLeft) placement = "left";

    let left: number;
    let top: number;

    switch (placement) {
      case "top":
        left = tRect.left + tRect.width / 2 - ttRect.width / 2;
        top = tRect.top - TOOLTIP_GAP - ttRect.height;
        break;
      case "bottom":
        left = tRect.left + tRect.width / 2 - ttRect.width / 2;
        top = tRect.bottom + TOOLTIP_GAP;
        break;
      case "right":
        left = tRect.right + TOOLTIP_GAP;
        top = tRect.top + tRect.height / 2 - ttRect.height / 2;
        break;
      case "left":
        left = tRect.left - TOOLTIP_GAP - ttRect.width;
        top = tRect.top + tRect.height / 2 - ttRect.height / 2;
        break;
    }

    const minX = container.left + VIEWPORT_PAD;
    const maxX = container.right - VIEWPORT_PAD - ttRect.width;
    const minY = container.top + VIEWPORT_PAD;
    const maxY = container.bottom - VIEWPORT_PAD - ttRect.height;

    left = Math.min(Math.max(left, minX), maxX);
    top = Math.min(Math.max(top, minY), maxY);

    setCoords({ left, top });
  }, [portalTarget]);

  // (Re)measure whenever the tooltip becomes visible or the viewport/scroll
  // changes. useLayoutEffect so the tooltip is placed before paint.
  useLayoutEffect(() => {
    if (!open) return;
    position();
    const onScrollOrResize = () => position();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, position, text]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return (
    <span className="info-hint group relative inline-flex shrink-0 items-center">
      <button
        ref={triggerRef}
        type="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-describedby={open ? tooltipId : undefined}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="focus-ring flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-border-strong text-[0.6rem] leading-none text-muted transition-colors hover:border-accent/60 hover:text-accent"
      >
        ?
      </button>
      {mounted && open && portalTarget
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              id={tooltipId}
              className="surface-elevated pointer-events-none fixed z-[200] max-w-[22rem] px-3 py-2 text-left text-xs font-normal leading-snug text-text shadow-2xl transition-opacity duration-150"
              style={{
                left: coords ? `${coords.left}px` : "-9999px",
                top: coords ? `${coords.top}px` : "-9999px",
                opacity: coords ? 1 : 0,
                textTransform: "none",
                letterSpacing: "normal",
              }}
            >
              {text}
            </span>,
            portalTarget,
          )
        : null}
    </span>
  );
}
