"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import {
  sourceTierTone,
  sourceTrackLabel,
  trackSpecTags,
  TIER_TONE,
  type TierTone,
} from "@/lib/builds/build-display";
import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";
import { SectionLabel, SpecChip, TierDot } from "@/components/builds/BuildAtoms";
import type { SpecTag } from "@/lib/builds/build-display";

interface SourceTrackOption {
  kind: BuildTrackKind;
  streamIndex: number;
  label: string;
}

function optionsForRelease(release: ReleaseWithTracks): SourceTrackOption[] {
  const options: SourceTrackOption[] = [];
  if (release.videoTrack) {
    options.push({
      kind: "video",
      streamIndex: release.videoTrack.streamIndex,
      label: sourceTrackLabel(release.videoTrack, "video"),
    });
  }
  for (const audio of release.audioTracks) {
    options.push({
      kind: "audio",
      streamIndex: audio.streamIndex,
      label: sourceTrackLabel(audio, "audio"),
    });
  }
  for (const sub of release.subtitleTracks) {
    options.push({
      kind: "subtitle",
      streamIndex: sub.streamIndex,
      label: sourceTrackLabel(sub, "subtitle"),
    });
  }
  return options;
}

export function buildSourceTrackOptions(release: ReleaseWithTracks) {
  return optionsForRelease(release);
}

/** Stable key for a source track identity. */
export function sourceTrackKey(
  releaseId: number,
  kind: BuildTrackKind,
  streamIndex: number,
): string {
  return `${releaseId}:${kind}:${streamIndex}`;
}

interface DeckProps {
  release: ReleaseWithTracks;
  tone: TierTone;
  inReel: Set<string>;
  activeVideoKey: string | null;
  onPick: (releaseId: number, kind: BuildTrackKind, streamIndex: number) => void;
}

function SourceDeck({ release, tone, inReel, activeVideoKey, onPick }: DeckProps) {
  const [open, setOpen] = useState(true);
  const toneCls = TIER_TONE[tone];

  const video = release.videoTrack;
  const audioTracks = release.audioTracks;
  const subTracks = release.subtitleTracks;

  const videoKey = video
    ? sourceTrackKey(release.id, "video", video.streamIndex)
    : null;
  const videoActive = videoKey ? activeVideoKey === videoKey : false;

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius)] border ${toneCls.border} bg-bg-elevated/50`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
        aria-expanded={open}
      >
        <TierDot tone={tone} />
        <span className="font-mono-tech min-w-0 flex-1 truncate text-[11px] uppercase tracking-[0.12em] text-text">
          {releaseTabLabel(release)}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-300 ease-out ${
            open ? "" : "-rotate-90"
          }`}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t border-border/60 px-3 py-3">
          {video ? (
            <TrackRow
              label={sourceTrackLabel(video, "video")}
              tags={trackSpecTags(video, "video")}
              inReel={videoActive}
              isVideo
              onPick={() => onPick(release.id, "video", video.streamIndex)}
            />
          ) : null}

          {audioTracks.length > 0 ? (
            <div className="space-y-1.5">
              <SectionLabel>аудио · {audioTracks.length}</SectionLabel>
              {audioTracks.map((a) => (
                <TrackRow
                  key={a.streamIndex}
                  label={sourceTrackLabel(a, "audio")}
                  tags={trackSpecTags(a, "audio")}
                  inReel={inReel.has(
                    sourceTrackKey(release.id, "audio", a.streamIndex),
                  )}
                  onPick={() => onPick(release.id, "audio", a.streamIndex)}
                />
              ))}
            </div>
          ) : null}

          {subTracks.length > 0 ? (
            <div className="space-y-1.5">
              <SectionLabel>субтитры · {subTracks.length}</SectionLabel>
              {subTracks.map((s) => (
                <TrackRow
                  key={s.streamIndex}
                  label={sourceTrackLabel(s, "subtitle")}
                  tags={trackSpecTags(s, "subtitle")}
                  inReel={inReel.has(
                    sourceTrackKey(release.id, "subtitle", s.streamIndex),
                  )}
                  onPick={() => onPick(release.id, "subtitle", s.streamIndex)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TrackRow({
  label,
  tags,
  inReel,
  isVideo,
  onPick,
}: {
  label: string;
  tags: SpecTag[];
  inReel: boolean;
  isVideo?: boolean;
  onPick: () => void;
}) {
  const canToggleOff = inReel && !isVideo;
  const title = isVideo
    ? inReel
      ? "Текущий источник видео"
      : "Использовать это видео"
    : inReel
      ? "Убрать из сборки"
      : "Добавить в сборку";

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={inReel}
      title={title}
      className={`focus-ring group flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] border px-2.5 py-2 text-left transition-all duration-200 ease-out ${
        inReel
          ? canToggleOff
            ? "border-accent/40 bg-accent/[0.08] hover:border-danger/40 hover:bg-danger/[0.06]"
            : "border-accent/40 bg-accent/[0.08]"
          : "border-border/60 bg-bg-deep/40 hover:border-border-strong hover:bg-bg-elevated/70"
      } cursor-pointer`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
          inReel
            ? canToggleOff
              ? "border-accent/50 bg-accent/[0.14] text-accent-bright group-hover:border-danger/50 group-hover:bg-danger/[0.12] group-hover:text-danger"
              : "border-accent/50 bg-accent/[0.14] text-accent-bright"
            : "border-border text-muted group-hover:text-text"
        }`}
        aria-hidden
      >
        {inReel ? (
          <Check
            className={`h-3 w-3 ${canToggleOff ? "group-hover:hidden" : ""}`}
            strokeWidth={2}
          />
        ) : null}
        {inReel && canToggleOff ? (
          <span className="hidden text-sm leading-none group-hover:inline">−</span>
        ) : null}
        {!inReel ? <Plus className="h-3 w-3" strokeWidth={1.5} /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-text">{label}</span>
        {tags.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {tags.map((t, i) => (
              <SpecChip key={`${t.label}-${i}`} tag={t} />
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export interface BuildSourceDecksProps {
  releases: ReleaseWithTracks[];
  /** Set of `${releaseId}:${kind}:${streamIndex}` keys already in the reel. */
  inReel: Set<string>;
  /** Key of the video currently in the reel, to mark active deck. */
  activeVideoKey: string | null;
  onPick: (releaseId: number, kind: BuildTrackKind, streamIndex: number) => void;
}

export function BuildSourceDecks({
  releases,
  inReel,
  activeVideoKey,
  onPick,
}: BuildSourceDecksProps) {
  const decks = useMemo(
    () =>
      releases.map((release) => ({
        release,
        tone: sourceTierTone(release),
      })),
    [releases],
  );

  return (
    <div className="space-y-3">
      {decks.map(({ release, tone }) => (
        <SourceDeck
          key={release.id}
          release={release}
          tone={tone}
          inReel={inReel}
          activeVideoKey={activeVideoKey}
          onPick={onPick}
        />
      ))}
    </div>
  );
}
