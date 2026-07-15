"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
import { useSpotlightHoverTarget } from "@/components/layout/SpotlightAimProvider";
import type { SpotlightTier as SpotlightTierValue } from "@/lib/media/tier-presentation";

const FranchiseSpotlightContext = createContext<{
  setHoverTier: (tier: SpotlightTierValue | null) => void;
  setHoverElement: (element: HTMLElement | null) => void;
} | null>(null);

export function useFranchiseSpotlightHover() {
  const ctx = useContext(FranchiseSpotlightContext);
  if (!ctx) {
    throw new Error("useFranchiseSpotlightHover must be used within FranchiseSpotlightProvider");
  }
  return ctx;
}

/** Baseline franchise tier + lightweight card hover (instant bearing, no mask churn). */
export function FranchiseSpotlightProvider({
  baseline,
  children,
}: {
  baseline: SpotlightTierValue;
  children: ReactNode;
}) {
  const setHoverTarget = useSpotlightHoverTarget();
  const [hoverTier, setHoverTier] = useState<SpotlightTierValue | null>(null);

  const setHoverElement = useCallback(
    (element: HTMLElement | null) => {
      setHoverTarget(element, "lite");
    },
    [setHoverTarget],
  );

  useEffect(() => () => setHoverTarget(null), [setHoverTarget]);

  return (
    <FranchiseSpotlightContext.Provider
      value={{ setHoverTier, setHoverElement }}
    >
      <SpotlightTier tier={hoverTier ?? baseline} />
      {children}
    </FranchiseSpotlightContext.Provider>
  );
}
