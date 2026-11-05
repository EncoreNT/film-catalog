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
    <article className={`movie-tv-notice ${className}`} aria-label={`${label}. ${detail}`}>
      <Tv size={16} aria-hidden />
      <span>{label}</span>
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
