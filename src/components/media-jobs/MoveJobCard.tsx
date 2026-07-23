"use client";

import { HardDrive } from "lucide-react";
import { MediaJobCard } from "@/components/media-jobs/MediaJobCard";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import type { SerializedMove } from "@/lib/releases/move-serialize";
import {
  MOVE_STATUS_META,
  moveSizeHint,
  moveSpeedLabel,
} from "@/lib/releases/move-display";

export function MoveJobCard({
  job,
  compact = false,
}: {
  job: SerializedMove;
  compact?: boolean;
}) {
  const meta = MOVE_STATUS_META[job.status];
  const coverUrl = movieCoverUrlFromMovie(job.movie);
  const isRunning = job.status === "RUNNING";
  const sizeHint = moveSizeHint(job);
  const speed = moveSpeedLabel(job.progressSpeed);

  return (
    <MediaJobCard
      href={`/movies/${job.movie.slug}?release=${job.releaseId}`}
      coverUrl={coverUrl}
      kindLabel="перенос"
      title={job.movie.title}
      titleBadge={
        job.externalStorage?.name ? (
          <span className="font-mono-tech shrink-0 rounded-full border border-neural/30 bg-bg-deep/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-neural-bright/90">
            {job.externalStorage.name}
          </span>
        ) : undefined
      }
      statusLabel={meta.label}
      statusBadgeClass={meta.badgeClass}
      statusIcon={HardDrive}
      isRunning={isRunning}
      subtitle={
        <>
          <span className="text-text/85">{job.targetFilename}</span>
          {sizeHint ? <span className="text-faint"> · {sizeHint}</span> : null}
        </>
      }
      progressPercent={job.progressPercent}
      progressMessage={job.progressMessage}
      progressSuffix={speed ?? undefined}
      defaultProgressMessage="Перемещение…"
      accent="neural"
      compact={compact}
    />
  );
}
