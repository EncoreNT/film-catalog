"use client";

import { useMemo } from "react";
import { Film } from "lucide-react";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { releaseTabLabel } from "@/lib/media/spec-tags";
import { Select } from "@/components/primitives/Select";
import { SpecChip } from "@/components/builds/BuildAtoms";
import {
  sourceTierTone,
  trackSpecTags,
  TIER_TONE,
} from "@/lib/builds/build-display";

interface BuildVideoCardProps {
  /** Текущая видео-дорожка в рецепте или null, если видео ещё не выбрано. */
  track: {
    sourceReleaseId: number;
    sourceStreamIndex: number;
    label: string;
  } | null;
  releases: ReleaseWithTracks[];
  /** Сменить релиз-источник видео (подставит единственную видео-дорожку релиза). */
  onReleaseChange: (releaseId: number) => void;
}

export function BuildVideoCard({
  track,
  releases,
  onReleaseChange,
}: BuildVideoCardProps) {
  const videoReleases = useMemo(
    () => releases.filter((r) => r.videoTrack != null),
    [releases],
  );
  const release = useMemo(
    () =>
      releases.find((r) => r.id === track?.sourceReleaseId) ?? null,
    [releases, track?.sourceReleaseId],
  );
  const video = release?.videoTrack ?? null;
  const tone = release ? sourceTierTone(release) : "none";
  const toneCls = TIER_TONE[tone];
  const tags = video ? trackSpecTags(video, "video") : [];
  const showReleasePicker = videoReleases.length > 1;
  const showBody = showReleasePicker || tags.length > 0 || !video;

  return (
    <div
      className={`overflow-hidden rounded-[var(--radius)] border ${
        release ? toneCls.border : "border-border"
      } bg-bg-elevated/55`}
    >
      <div className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-accent/35 bg-accent/[0.08] text-accent"
          aria-hidden
        >
          <Film className="h-4 w-4" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-mono-tech text-[10px] uppercase tracking-[0.22em] text-muted">
            видео
          </p>
          <p className="truncate text-sm text-text">
            {release ? releaseTabLabel(release) : "Релиз не выбран"}
          </p>
        </div>
      </div>

      {showBody ? (
      <div className="space-y-3 border-t border-border/60 px-3.5 py-3 sm:px-4">
        {showReleasePicker ? (
          <Select
            label="Релиз-источник"
            value={track ? String(track.sourceReleaseId) : ""}
            onChange={(v) => onReleaseChange(Number(v))}
            options={videoReleases.map((r) => ({
              value: String(r.id),
              label: releaseTabLabel(r),
            }))}
            preserveOrder
          />
        ) : null}

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {tags.map((t, i) => (
              <SpecChip key={`${t.label}-${i}`} tag={t} active />
            ))}
          </div>
        ) : null}

        {!video ? (
          <p className="font-mono-tech text-[11px] leading-relaxed text-ember-bright">
            У выбранного релиза нет видео-дорожки — выберите другой релиз.
          </p>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
