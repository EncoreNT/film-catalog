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
  /** Ellipsis when the ribbon is longer than the card column. */
  truncate?: boolean;
  title?: string;
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
  truncate = false,
  title,
  className = "",
}: TierChipProps) {
  return (
    <span
      title={title}
      className={`font-mono-tech inline-flex items-center rounded-full border bg-bg-deep/90 font-semibold uppercase ${SIZE_CLASS[size]} ${tierChipClass(tone)} ${
        truncate
          ? "min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
          : "shrink-0"
      } ${className}`}
    >
      {children}
    </span>
  );
}
