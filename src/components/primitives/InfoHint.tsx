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
import {
  FLOATING_GAP,
  FLOATING_VIEWPORT_PAD,
  clampBoxInContainer,
  pickCardinalPlacement,
  resolveDialogPortalTarget,
  viewportRect,
} from "@/lib/ui/floating-position";

const emptySubscribe = () => () => {};
const getMounted = () => true;
const getServerSnapshot = () => false;

interface InfoHintProps {
  text: ReactNode;
  label?: string;
}

interface Coords {
  left: number;
  top: number;
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
      setPortalTarget(resolveDialogPortalTarget(triggerRef.current));
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

    const container =
      portalTarget && portalTarget !== document.body
        ? portalTarget.getBoundingClientRect()
        : viewportRect();

    const placement = pickCardinalPlacement(
      tRect,
      ttRect,
      container,
      FLOATING_GAP,
      FLOATING_VIEWPORT_PAD,
    );

    let left: number;
    let top: number;

    switch (placement) {
      case "top":
        left = tRect.left + tRect.width / 2 - ttRect.width / 2;
        top = tRect.top - FLOATING_GAP - ttRect.height;
        break;
      case "bottom":
        left = tRect.left + tRect.width / 2 - ttRect.width / 2;
        top = tRect.bottom + FLOATING_GAP;
        break;
      case "right":
        left = tRect.right + FLOATING_GAP;
        top = tRect.top + tRect.height / 2 - ttRect.height / 2;
        break;
      case "left":
        left = tRect.left - FLOATING_GAP - ttRect.width;
        top = tRect.top + tRect.height / 2 - ttRect.height / 2;
        break;
    }

    const clamped = clampBoxInContainer(
      left,
      top,
      ttRect.width,
      ttRect.height,
      container,
      FLOATING_VIEWPORT_PAD,
    );

    setCoords(clamped);
  }, [portalTarget]);

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
