"use client";

import { Tv } from "lucide-react";
import { CatalogMark } from "@/components/shared/CatalogMark";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { InfoHint } from "@/components/primitives/InfoHint";
import { tvReadyMarkDetail, tvReadyMarkLabel, tvCompatibleTrackHint } from "@/lib/media/tv-ready";

interface TvReadyMarkProps {
  className?: string;
}

/** Compact catalog mark: primary release is TV-compatible (MKV/MP4, H.264/HEVC, rus AC-3/E-AC-3/AAC). */
export function TvReadyMark({ className = "" }: TvReadyMarkProps) {
  return (
    <CatalogMark
      icon={Tv}
      label={tvReadyMarkLabel()}
      detail={tvReadyMarkDetail()}
      tone="cyan"
      className={className}
    />
  );
}

interface TvReadyReleaseNoticeProps {
  className?: string;
}

/** TV-ready readout for the release detail panel (compact instrument strip). */
export function TvReadyReleaseNotice({
  className = "",
}: TvReadyReleaseNoticeProps) {
  const label = tvReadyMarkLabel();
  const detail = tvReadyMarkDetail();

  return (
    <article
      className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-cyan/30 bg-cyan/[0.06] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${className}`}
      aria-label={`${label}. ${detail}`}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[calc(var(--radius-sm)-2px)] border border-cyan/35 bg-cyan/[0.12] text-cyan shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        aria-hidden
      >
        <Tv className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 leading-snug">
        <p className="font-mono text-xs font-medium text-text">
          <span>{label}</span>
          <span className="mx-1.5 hidden font-normal text-faint sm:inline" aria-hidden>
            ·
          </span>
          <span className="hidden font-normal text-muted sm:inline">{detail}</span>
        </p>
        <p className="font-mono-tech mt-0.5 text-[10px] text-muted sm:hidden">{detail}</p>
      </div>
      <InfoHint
        label="TV и USB"
        text={
          <>
            {detail}. Можно скинуть на USB через меню релиза (экспорт для телевизора).
          </>
        }
      />
    </article>
  );
}

export function TvCompatibleTrackBadge({ className = "" }: { className?: string }) {
  const hint = tvCompatibleTrackHint();

  return (
    <HoverTooltip
      className={`inline-flex shrink-0 cursor-help ${className}`}
      content={
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-text">Дорожка для телевизора</p>
          <p className="mt-0.5 font-mono-tech text-[0.6rem] leading-snug text-muted">
            {hint}
          </p>
        </div>
      }
    >
      <span
        className="font-mono-tech inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border border-cyan/45 bg-cyan/[0.1] px-1 text-[0.55rem] uppercase tracking-[0.08em] text-cyan"
        aria-label={`TV: ${hint}`}
      >
        TV
      </span>
    </HoverTooltip>
  );
}
