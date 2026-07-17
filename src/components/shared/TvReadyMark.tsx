"use client";

import { Tv } from "lucide-react";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { tvReadyMarkDetail, tvReadyMarkLabel } from "@/lib/media/tv-ready";

interface TvReadyMarkProps {
  className?: string;
}

/** Compact catalog mark: primary release is TV-compatible (MKV, H.264/HEVC, rus AC-3/E-AC-3/AAC). */
export function TvReadyMark({ className = "" }: TvReadyMarkProps) {
  const label = tvReadyMarkLabel();
  const detail = tvReadyMarkDetail();

  return (
    <HoverTooltip
      className={`inline-flex shrink-0 cursor-help ${className}`}
      content={
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-text">{label}</p>
          <p className="mt-0.5 font-mono-tech text-[0.6rem] leading-snug text-muted">
            {detail}
          </p>
        </div>
      }
    >
      <span
        className="inline-flex h-[1.125rem] w-[1.125rem] items-center justify-center rounded-full border border-cyan/50 bg-cyan/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-200 hover:border-cyan/75 hover:bg-cyan/[0.16]"
        aria-label={`${label}: ${detail}`}
      >
        <Tv className="h-3 w-3 text-cyan" strokeWidth={1.75} aria-hidden />
      </span>
    </HoverTooltip>
  );
}
