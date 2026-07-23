import type { ReactNode } from "react";
import {
  tierChipClass,
  type TierChipTone,
} from "@/lib/media/tier-presentation";

interface TierChipProps {
  tone: TierChipTone;
  children: ReactNode;
  /** `xs` — catalog card chips; `sm` — build queue / detail. */
  size?: "xs" | "sm";
  className?: string;
}

const SIZE_CLASS = {
  xs: "px-2 py-[3px] text-[0.55rem] tracking-[0.14em]",
  sm: "px-2 py-0.5 text-[10px] tracking-[0.12em]",
} as const;

/** Compact mono-tech tier ribbon chip (ruby / gold / default). */
export function TierChip({
  tone,
  children,
  size = "sm",
  className = "",
}: TierChipProps) {
  return (
    <span
      className={`font-mono-tech inline-flex shrink-0 items-center rounded-full border bg-bg-deep/90 font-semibold uppercase ${SIZE_CLASS[size]} ${tierChipClass(tone)} ${className}`}
    >
      {children}
    </span>
  );
}
