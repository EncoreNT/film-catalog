"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  FLOATING_GAP,
  FLOATING_VIEWPORT_PAD,
  clampHorizontalCenter,
  pickVerticalPlacement,
  viewportRect,
} from "@/lib/ui/floating-position";

type TooltipPlacement = "top" | "bottom";

interface HoverTooltipProps {
  children: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  className?: string;
  /**
   * When true, the tooltip stays open while hovered and its content can be
   * clicked (links, buttons). Adds a short hide delay so the pointer can
   * travel from the anchor into the tooltip without dismissing it.
   */
  interactive?: boolean;
}

/** Fallback height before the tooltip is measured in the DOM. */
const ESTIMATED_HEIGHT = 220;
/** Grace period before dismissing an interactive tooltip on anchor leave. */
const INTERACTIVE_HIDE_DELAY = 120;

export function HoverTooltip({
  children,
  content,
  disabled = false,
  className = "",
  interactive = false,
}: HoverTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [placement, setPlacement] = useState<TooltipPlacement>("top");
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    cancelHide();
    setVisible(false);
    setPositioned(false);
  }, [cancelHide]);

  const scheduleHide = useCallback(() => {
    if (!interactive) {
      hide();
      return;
    }
    cancelHide();
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      setPositioned(false);
    }, INTERACTIVE_HIDE_DELAY);
  }, [cancelHide, hide, interactive]);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipHeight = tooltipRect?.height ?? ESTIMATED_HEIGHT;
    const tooltipWidth = tooltipRect?.width ?? 320;
    const container = viewportRect();

    const nextPlacement = pickVerticalPlacement(
      anchorRect.top,
      anchorRect.bottom,
      tooltipHeight,
      container,
      FLOATING_GAP,
      FLOATING_VIEWPORT_PAD,
    );

    const x = clampHorizontalCenter(
      anchorRect.left + anchorRect.width / 2,
      tooltipWidth,
      container,
      FLOATING_VIEWPORT_PAD,
    );

    const y =
      nextPlacement === "top"
        ? anchorRect.top - FLOATING_GAP
        : anchorRect.bottom + FLOATING_GAP;

    setPlacement(nextPlacement);
    setCoords({ x, y });
    setPositioned(true);
  }, []);

  const show = useCallback(() => {
    if (disabled) return;
    cancelHide();
    setPositioned(false);
    setVisible(true);
  }, [cancelHide, disabled]);

  useEffect(() => {
    return () => cancelHide();
  }, [cancelHide]);

  useLayoutEffect(() => {
    if (!visible) return;
    updatePosition();
  }, [visible, content, updatePosition]);

  useEffect(() => {
    if (!visible) return;
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [visible, updatePosition]);

  const transform =
    placement === "top"
      ? "translate(-50%, -100%)"
      : "translate(-50%, 0)";

  return (
    <>
      <span
        ref={anchorRef}
        className={className}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {mounted && visible && !disabled
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              onMouseEnter={cancelHide}
              onMouseLeave={hide}
              className={`fixed z-[100] transition-opacity duration-150 ${
                interactive ? "pointer-events-auto" : "pointer-events-none"
              } ${positioned ? "opacity-100" : "opacity-0"}`}
              style={{
                left: coords.x,
                top: coords.y,
                transform,
              }}
            >
              <div className="relative overflow-hidden rounded-[var(--radius-sm)] border border-white/10 bg-bg-deep/80 shadow-[0_24px_70px_rgba(0,0,0,0.6),0_0_30px_rgba(232,176,90,0.08)] backdrop-blur-xl">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent"
                />
                {content}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
