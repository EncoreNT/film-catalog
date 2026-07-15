"use client";

import { useRef, type ReactNode } from "react";
import { useSpotlightTarget } from "@/components/layout/SpotlightAimProvider";

type SpotlightTargetSide = "left" | "right" | "both";

/**
 * Marks a DOM subtree as an aim point for the global corner spotlights.
 * Wrap poster columns, release panels, etc. — rigs rotate to center on it.
 */
export function SpotlightTarget({
  side,
  children,
  className,
}: {
  side: SpotlightTargetSide;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useSpotlightTarget(side, ref);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
