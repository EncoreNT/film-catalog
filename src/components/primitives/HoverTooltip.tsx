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

type TooltipPlacement = "top" | "bottom";

interface HoverTooltipProps {
  children: ReactNode;
  content: ReactNode;
  disabled?: boolean;
  className?: string;
}

const GAP = 8;
const VIEWPORT_PADDING = 12;
/** Fallback height before the tooltip is measured in the DOM. */
const ESTIMATED_HEIGHT = 220;

export function HoverTooltip({
  children,
  content,
  disabled = false,
  className = "",
}: HoverTooltipProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [placement, setPlacement] = useState<TooltipPlacement>("top");
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [positioned, setPositioned] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const anchorRect = anchor.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const tooltipHeight = tooltipRect?.height ?? ESTIMATED_HEIGHT;
    const tooltipWidth = tooltipRect?.width ?? 320;

    const spaceAbove = anchorRect.top - VIEWPORT_PADDING;
    const spaceBelow =
      window.innerHeight - anchorRect.bottom - VIEWPORT_PADDING;

    let nextPlacement: TooltipPlacement = "top";
    if (spaceAbove >= tooltipHeight + GAP) {
      nextPlacement = "top";
    } else if (spaceBelow >= tooltipHeight + GAP) {
      nextPlacement = "bottom";
    } else {
      nextPlacement = spaceAbove >= spaceBelow ? "top" : "bottom";
    }

    const halfW = tooltipWidth / 2;
    const x = Math.max(
      VIEWPORT_PADDING + halfW,
      Math.min(window.innerWidth - VIEWPORT_PADDING - halfW, anchorRect.left + anchorRect.width / 2),
    );

    const y =
      nextPlacement === "top"
        ? anchorRect.top - GAP
        : anchorRect.bottom + GAP;

    setPlacement(nextPlacement);
    setCoords({ x, y });
    setPositioned(true);
  }, []);

  const show = useCallback(() => {
    if (disabled) return;
    setPositioned(false);
    setVisible(true);
  }, [disabled]);

  const hide = useCallback(() => {
    setVisible(false);
    setPositioned(false);
  }, []);

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
        onMouseLeave={hide}
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
              className={`pointer-events-none fixed z-[100] transition-opacity duration-100 ${
                positioned ? "opacity-100" : "opacity-0"
              }`}
              style={{
                left: coords.x,
                top: coords.y,
                transform,
              }}
            >
              {placement === "bottom" ? (
                <div
                  aria-hidden
                  className="mx-auto mb-[-1px] h-2 w-2 rotate-45 border-l border-t border-accent/25 bg-bg-elevated"
                />
              ) : null}
              <div className="surface-elevated overflow-hidden rounded-[var(--radius-sm)] border border-accent/25 shadow-[0_12px_40px_rgba(0,0,0,0.45),0_0_24px_var(--accent-glow)]">
                {content}
              </div>
              {placement === "top" ? (
                <div
                  aria-hidden
                  className="mx-auto mt-[-1px] h-2 w-2 rotate-45 border-b border-r border-accent/25 bg-bg-elevated"
                />
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
