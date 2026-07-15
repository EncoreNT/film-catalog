"use client";

import { Unplug } from "lucide-react";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";

interface ExternalStorageMarkProps {
  storageNames: string[];
  className?: string;
}

/** Compact catalog mark: at least one release is on an external volume. */
export function ExternalStorageMark({
  storageNames,
  className = "",
}: ExternalStorageMarkProps) {
  const label = "Внешний диск";
  const detail = storageNames.join(" · ");
  const ariaLabel = detail ? `${label}: ${detail}` : label;

  return (
    <HoverTooltip
      className={`inline-flex shrink-0 cursor-help ${className}`}
      content={
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-text">{label}</p>
          {detail ? (
            <p className="mt-0.5 font-mono-tech text-[0.6rem] leading-snug text-muted">
              {detail}
            </p>
          ) : null}
        </div>
      }
    >
      <span
        className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-accent/50 bg-accent/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-200 hover:border-accent/75 hover:bg-accent/[0.16]"
        aria-label={ariaLabel}
      >
        <Unplug
          className="h-3 w-3 text-accent-bright"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
    </HoverTooltip>
  );
}
