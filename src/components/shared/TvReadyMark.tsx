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

interface TvReadyReleaseNoticeProps {
  className?: string;
}

/** Expanded TV-ready readout for the release detail panel. */
export function TvReadyReleaseNotice({
  className = "",
}: TvReadyReleaseNoticeProps) {
  const label = tvReadyMarkLabel();
  const detail = tvReadyMarkDetail();

  return (
    <article
      className={`relative overflow-hidden rounded-[var(--radius)] border border-cyan/25 bg-gradient-to-br from-cyan/[0.09] via-bg-elevated/80 to-bg-elevated/75 p-4 sm:p-5 ${className}`}
      aria-label={`${label}. ${detail}`}
    >
      <div
        className="laser-scan-line pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent"
        aria-hidden
      />
      <div className="flex items-start gap-3.5 sm:items-center sm:gap-4">
        <div className="rounded-[calc(var(--radius-sm)+2px)] bg-cyan/[0.06] p-px ring-1 ring-cyan/20">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] border border-cyan/35 bg-cyan/[0.14] text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <Tv className="h-[18px] w-[18px] text-cyan" strokeWidth={1.75} aria-hidden />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-medium leading-snug text-text">
            {label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{detail}</p>
          <p className="font-mono-tech mt-2 text-[11px] leading-snug text-faint">
            Можно скинуть на USB через меню релиза
          </p>
        </div>
      </div>
    </article>
  );
}
