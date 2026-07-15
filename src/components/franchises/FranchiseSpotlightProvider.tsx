"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
import type { SpotlightTier as SpotlightTierValue } from "@/lib/media/tier-presentation";

const FranchiseSpotlightContext = createContext<{
  setHoverTier: (tier: SpotlightTierValue | null) => void;
} | null>(null);

export function useFranchiseSpotlightHover() {
  const ctx = useContext(FranchiseSpotlightContext);
  if (!ctx) {
    throw new Error("useFranchiseSpotlightHover must be used within FranchiseSpotlightProvider");
  }
  return ctx;
}

/** Baseline franchise spotlight with optional per-card hover override. */
export function FranchiseSpotlightProvider({
  baseline,
  children,
}: {
  baseline: SpotlightTierValue;
  children: ReactNode;
}) {
  const [hoverTier, setHoverTier] = useState<SpotlightTierValue | null>(null);

  return (
    <FranchiseSpotlightContext.Provider value={{ setHoverTier }}>
      <SpotlightTier tier={hoverTier ?? baseline} />
      {children}
    </FranchiseSpotlightContext.Provider>
  );
}
