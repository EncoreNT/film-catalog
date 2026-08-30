"use client";

import { useMemo } from "react";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import {
  AC3_BITRATES,
  EAC3_BITRATES,
  channelTargetLabel,
  defaultChannelTarget,
  defaultTranscodeBitrate,
  idealTranscodeBitrate,
} from "@/lib/builds/build-presets";
import type { ChannelTarget, TranscodeCodec } from "@/lib/builds/build-presets";
import type {
  BuildRecipeTrackState,
} from "@/lib/builds/build-recipe-state";
import { normalizeAudioSyncMode } from "@/lib/builds/build-audio-sync";
import { resolveCatalogTrack } from "@/lib/builds/build-track-source";
import {
  BuildInlineHint,
  ChipButton,
  KindBadge,
  ReorderButton,
  SpecChip,
  TierDot,
  TrackCheckboxOption,
  TrackRadioOption,
} from "@/components/builds/BuildAtoms";
import { BuildAudioSyncControls } from "@/components/builds/BuildAudioSyncControls";
import {
  sourceTierTone,
  trackSpecTags,
  transcodeQualityHint,
  TIER_TONE,
} from "@/lib/builds/build-display";
import type { DurationMismatchInfo } from "@/lib/builds/build-duration-hint";

function resolveSourceTrack(
  releases: ReleaseWithTracks[],
  track: BuildRecipeTrackState,
):
  | ReleaseWithTracks["videoTrack"]
  | ReleaseWithTracks["audioTracks"][number]
  | ReleaseWithTracks["subtitleTracks"][number]
  | null {
  const release = releases.find((r) => r.id === track.sourceReleaseId);
  return resolveCatalogTrack(release, track.kind, track.sourceStreamIndex);
}

interface BuildReelTrackCardProps {
  track: BuildRecipeTrackState;
  releases: ReleaseWithTracks[];
  durationMismatch: DurationMismatchInfo | null;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (patch: Partial<BuildRecipeTrackState>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  copyOnly?: boolean;
  sourceCaption?: string;
}

export function BuildReelTrackCard({
  track,
  releases,
  durationMismatch,
  canMoveUp,
  canMoveDown,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  copyOnly = false,
  sourceCaption,
}: BuildReelTrackCardProps) {
  const sourceRelease = useMemo(
    () => releases.find((r) => r.id === track.sourceReleaseId) ?? releases[0],
    [releases, track.sourceReleaseId],
  );
  const sourceTrack = useMemo(
    () => resolveSourceTrack(releases, track),
    [releases, track],
  );
  const tone = sourceRelease ? sourceTierTone(sourceRelease) : "none";
  const toneCls = TIER_TONE[tone];

  const tags = trackSpecTags(sourceTrack, track.kind);

  const sourceAudio =
    track.kind === "audio" && sourceTrack && "codec" in sourceTrack
      ? (sourceTrack as {
          codec: string | null;
          channels: number | null;
          channelLayout: string | null;
          bitrate: number | null;
        })
      : null;
  const sourceCodec = sourceAudio?.codec ?? null;
  const sourceBitrate = sourceAudio?.bitrate ?? null;
  const sourceChannelLayout = sourceAudio?.channelLayout ?? null;
  const transcodeHint = transcodeQualityHint(sourceCodec, {
    syncMode: normalizeAudioSyncMode(track),
  });

  const transcodeCodec = track.transcodeCodec ?? "eac3";
  const bitrates = transcodeCodec === "ac3" ? AC3_BITRATES : EAC3_BITRATES;
  const currentBitrate =
    track.transcodeBitrate ?? defaultTranscodeBitrate(transcodeCodec, sourceBitrate);

  // Битрейты, дающие апскейл относительно источника — помечаем как недоступные.
  const isBitrateUpscale = (b: number): boolean =>
    sourceBitrate != null &&
    b > sourceBitrate &&
    b > idealTranscodeBitrate(transcodeCodec);

  const handleCodec = (codec: TranscodeCodec) => {
    onChange({
      transcodeCodec: codec,
      transcodeBitrate: defaultTranscodeBitrate(codec, sourceBitrate),
    });
  };

  const enableTranscode = () => {
    const codec: TranscodeCodec = "eac3";
    onChange({
      audioMode: "transcode",
      transcodeCodec: codec,
      transcodeBitrate: defaultTranscodeBitrate(codec, sourceBitrate),
      channelTarget: defaultChannelTarget(
        sourceAudio?.channels,
        sourceChannelLayout,
      ),
      keepOriginal: track.keepOriginal ?? false,
    });
  };

  const handleChannel = (target: ChannelTarget) => onChange({ channelTarget: target });

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius)] border ${toneCls.border} bg-bg-elevated/55`}
    >
      <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <KindBadge kind={track.kind} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {track.kind === "video" && !copyOnly ? (
                <p className="truncate text-sm text-text">{track.label}</p>
              ) : (
                <div className="space-y-1">
                  <label className="font-mono-tech block text-[10px] uppercase tracking-[0.18em] text-faint">
                    подпись в MKV
                  </label>
                  <input
                    type="text"
                    value={track.label}
                    onChange={(e) => onChange({ label: e.target.value })}
                    maxLength={200}
                    placeholder="Название дорожки в плеере"
                    className="focus-ring w-full rounded-[var(--radius-sm)] border border-border bg-bg-deep/60 px-2.5 py-1.5 text-sm text-text placeholder:text-faint"
                    aria-label="Подпись дорожки в MKV"
                  />
                </div>
              )}
              <p className="font-mono-tech mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted">
                <TierDot tone={tone} />
                <span className="truncate">
                  {sourceCaption ??
                    (sourceRelease ? releaseTabLabel(sourceRelease) : "источник удалён")}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <ReorderButton
                Icon={ArrowUp}
                label="Выше"
                onClick={onMoveUp}
                disabled={!canMoveUp}
              />
              <ReorderButton
                Icon={ArrowDown}
                label="Ниже"
                onClick={onMoveDown}
                disabled={!canMoveDown}
              />
              {track.kind !== "video" || copyOnly ? (
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label="Удалить дорожку"
                  className="focus-ring flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              ) : null}
            </div>
          </div>

          {tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((t, i) => (
                <SpecChip key={`${t.label}-${i}`} tag={t} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {track.kind === "audio" ? (
        <div className="space-y-3 border-t border-border/60 px-3 py-3 sm:px-4">
          {copyOnly ? null : (
          <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-faint">
              режим
            </span>
            <ChipButton
              selected={track.audioMode !== "transcode"}
              onClick={() => {
                const patch: Partial<BuildRecipeTrackState> = { audioMode: "copy" };
                if (track.audioSyncMode === "fit") {
                  patch.audioSyncMode = "none";
                }
                onChange(patch);
              }}
            >
              Копировать
            </ChipButton>
            <ChipButton
              selected={track.audioMode === "transcode"}
              onClick={enableTranscode}
            >
              Перекодировать
            </ChipButton>
          </div>

          <BuildAudioSyncControls
            track={track}
            durationMismatch={durationMismatch}
            sourceChannels={sourceAudio?.channels}
            sourceChannelLayout={sourceChannelLayout}
            sourceBitrate={sourceBitrate}
            onChange={onChange}
          />

          {track.audioMode === "transcode" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-faint">
                  кодек
                </span>
                <ChipButton
                  selected={track.transcodeCodec === "ac3"}
                  onClick={() => handleCodec("ac3")}
                >
                  AC-3
                </ChipButton>
                <ChipButton
                  selected={track.transcodeCodec === "eac3"}
                  onClick={() => handleCodec("eac3")}
                >
                  E-AC3
                </ChipButton>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-faint">
                  битрейт
                </span>
                {bitrates.map((b) => {
                  const upscale = isBitrateUpscale(b);
                  return (
                    <ChipButton
                      key={b}
                      selected={currentBitrate === b}
                      onClick={() => onChange({ transcodeBitrate: b })}
                      disabled={upscale}
                      title={upscale ? "Выше источника. Апскейл не имеет смысла." : undefined}
                    >
                      {b}
                    </ChipButton>
                  );
                })}
                <span className="font-mono-tech text-[10px] text-faint">kbps</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-faint">
                  каналы
                </span>
                <ChipButton
                  selected={track.channelTarget === "stereo"}
                  onClick={() => handleChannel("stereo")}
                >
                  {channelTargetLabel("stereo")}
                </ChipButton>
                <ChipButton
                  selected={track.channelTarget === "up_to_51"}
                  onClick={() => handleChannel("up_to_51")}
                  title={
                    sourceChannelLayout && !["2.0", "stereo", "mono"].includes(sourceChannelLayout)
                      ? "Surround до 5.1 — даунмикс из 7.1+"
                      : "Surround 5.1"
                  }
                >
                  {channelTargetLabel("up_to_51")}
                </ChipButton>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em] text-faint">
                  оригинал
                </span>
                <ChipButton
                  selected={!track.keepOriginal}
                  onClick={() => onChange({ keepOriginal: false })}
                >
                  заменить
                </ChipButton>
                <ChipButton
                  selected={track.keepOriginal ?? false}
                  onClick={() => onChange({ keepOriginal: true })}
                >
                  оставить
                </ChipButton>
              </div>
              {transcodeHint ? (
                <BuildInlineHint title={transcodeHint.title}>
                  {transcodeHint.detail}
                </BuildInlineHint>
              ) : null}
            </div>
          ) : null}

          </>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <TrackRadioOption
              checked={track.isDefault ?? false}
              onChange={(v) => onChange({ isDefault: v })}
              label="по умолчанию"
            />
          </div>
        </div>
      ) : null}

      {track.kind === "subtitle" ? (
        <div className="flex flex-wrap items-center gap-4 border-t border-border/60 px-3 py-2.5 sm:px-4">
          <TrackRadioOption
            checked={track.isDefault ?? false}
            onChange={(v) => onChange({ isDefault: v })}
            label="по умолчанию"
          />
          <TrackCheckboxOption
            checked={track.forced ?? false}
            onChange={(v) => onChange({ forced: v })}
            label="форсированные"
          />
        </div>
      ) : null}
    </div>
  );
}
