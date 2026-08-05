"use client";

import { Clock } from "lucide-react";
import { ChipButton } from "@/components/builds/BuildAtoms";
import {
  computeFitTempoRatio,
  formatFitTempoSummary,
  normalizeAudioSyncMode,
  type BuildAudioSyncMode,
} from "@/lib/builds/build-audio-sync";
import type { BuildRecipeTrackState } from "@/lib/builds/build-recipe-state";
import type { ChannelTarget, TranscodeCodec } from "@/lib/builds/build-presets";
import {
  defaultChannelTarget,
  defaultTranscodeBitrate,
} from "@/lib/builds/build-presets";
import type { DurationMismatchInfo } from "@/lib/builds/build-duration-hint";
import {
  durationMismatchInlineLabel,
  durationMismatchTooltipLines,
  DURATION_MISMATCH_SEVERITY_TONE,
} from "@/lib/builds/build-duration-hint";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";

interface BuildAudioSyncControlsProps {
  track: BuildRecipeTrackState;
  durationMismatch: DurationMismatchInfo | null;
  sourceChannels: number | null | undefined;
  sourceChannelLayout: string | null | undefined;
  sourceBitrate: number | null | undefined;
  onChange: (patch: Partial<BuildRecipeTrackState>) => void;
}

export function BuildAudioSyncControls({
  track,
  durationMismatch,
  sourceChannels,
  sourceChannelLayout,
  sourceBitrate,
  onChange,
}: BuildAudioSyncControlsProps) {
  const syncMode = normalizeAudioSyncMode(track);

  const applySyncMode = (mode: BuildAudioSyncMode) => {
    if (mode === "none") {
      onChange({ audioSyncMode: "none", offsetMs: 0 });
      return;
    }
    if (mode === "shift") {
      onChange({
        audioSyncMode: "shift",
        offsetMs: track.offsetMs ?? 0,
      });
      return;
    }
    const codec: TranscodeCodec = track.transcodeCodec ?? "eac3";
    onChange({
      audioSyncMode: "fit",
      offsetMs: 0,
      audioMode: "transcode",
      transcodeCodec: codec,
      transcodeBitrate: track.transcodeBitrate ?? defaultTranscodeBitrate(codec, sourceBitrate),
      channelTarget:
        track.channelTarget ??
        defaultChannelTarget(sourceChannels, sourceChannelLayout),
      keepOriginal: track.keepOriginal ?? false,
    });
  };

  const bumpOffset = (delta: number) =>
    onChange({
      audioSyncMode: "shift",
      offsetMs: Math.max(-60_000, Math.min(60_000, (track.offsetMs ?? 0) + delta)),
    });

  const fitTempo =
    durationMismatch != null
      ? computeFitTempoRatio(
          durationMismatch.videoDurationSeconds,
          durationMismatch.audioDurationSeconds,
        )
      : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-faint">
          синхрон
        </span>
        <ChipButton
          selected={syncMode === "none"}
          onClick={() => applySyncMode("none")}
        >
          Как есть
        </ChipButton>
        <ChipButton
          selected={syncMode === "shift"}
          onClick={() => applySyncMode("shift")}
        >
          Сдвиг
        </ChipButton>
        <ChipButton
          selected={syncMode === "fit"}
          onClick={() => applySyncMode("fit")}
          disabled={fitTempo == null}
          title={fitTempo == null ? "Нет данных о длительности" : undefined}
        >
          Под видео
        </ChipButton>
      </div>

      {syncMode === "shift" ? (
        <div className="flex flex-wrap items-center gap-1 pl-0 sm:pl-[4.5rem]">
          <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-faint">
            мс
          </span>
          <button
            type="button"
            onClick={() => bumpOffset(-10)}
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted hover:text-text"
            aria-label="Минус 10 мс"
          >
            −
          </button>
          <input
            type="number"
            value={track.offsetMs ?? 0}
            onChange={(e) =>
              onChange({
                audioSyncMode: "shift",
                offsetMs: Number(e.target.value),
              })
            }
            className="focus-ring font-mono-tech h-8 w-20 rounded-[var(--radius-sm)] border border-border bg-bg-deep/60 px-2 text-center text-xs text-text"
            aria-label="Сдвиг в миллисекундах"
          />
          <button
            type="button"
            onClick={() => bumpOffset(10)}
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-border text-muted hover:text-text"
            aria-label="Плюс 10 мс"
          >
            +
          </button>
        </div>
      ) : null}

      {syncMode === "fit" && fitTempo != null ? (
        <p className="font-mono-tech pl-0 text-[11px] tracking-[0.02em] text-muted sm:pl-[4.5rem]">
          {formatFitTempoSummary(fitTempo)}
        </p>
      ) : null}

      {durationMismatch && syncMode !== "fit" ? (
        <div className="pl-0 sm:pl-[4.5rem]">
          <DurationMismatchBadge info={durationMismatch} />
        </div>
      ) : null}
    </div>
  );
}

function DurationMismatchBadge({ info }: { info: DurationMismatchInfo }) {
  const tooltip = durationMismatchTooltipLines(info);
  return (
    <HoverTooltip
      className={`font-mono-tech inline-flex cursor-help items-center gap-1 text-[10px] uppercase tracking-[0.14em] ${DURATION_MISMATCH_SEVERITY_TONE[info.severity]}`}
      content={
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-text">{tooltip.headline}</p>
          <p className="mt-0.5 font-mono-tech text-[0.6rem] leading-snug text-muted">
            {tooltip.detail}
          </p>
        </div>
      }
    >
      <span
        className="inline-flex items-center gap-1"
        aria-label={`${tooltip.headline}. ${tooltip.detail}`}
      >
        <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} aria-hidden />
        {durationMismatchInlineLabel(info)}
      </span>
    </HoverTooltip>
  );
}
