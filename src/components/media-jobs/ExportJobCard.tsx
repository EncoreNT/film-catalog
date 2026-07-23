"use client";

import { HardDriveDownload } from "lucide-react";
import { MediaJobCard } from "@/components/media-jobs/MediaJobCard";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import type { SerializedExport } from "@/lib/releases/export-serialize";
import { EXPORT_STATUS_META, exportSizeHint } from "@/lib/releases/export-display";

export function ExportJobCard({
  job,
  compact = false,
}: {
  job: SerializedExport;
  compact?: boolean;
}) {
  const meta = EXPORT_STATUS_META[job.status];
  const coverUrl = movieCoverUrlFromMovie(job.movie);
  const isRunning = job.status === "RUNNING";
  const sizeHint = exportSizeHint(job);

  return (
    <MediaJobCard
      href={`/movies/${job.movie.slug}?release=${job.releaseId}`}
      coverUrl={coverUrl}
      kindLabel="копия"
      title={job.movie.title}
      titleBadge={
        <span className="font-mono-tech shrink-0 rounded-full border border-accent/30 bg-bg-deep/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-accent/90">
          TV-ready
        </span>
      }
      statusLabel={meta.label}
      statusBadgeClass={meta.badgeClass}
      statusIcon={HardDriveDownload}
      isRunning={isRunning}
      subtitle={
        <>
          <span className="text-text/85">{job.targetFilename}</span>
          {sizeHint ? <span className="text-faint"> · {sizeHint}</span> : null}
        </>
      }
      progressPercent={job.progressPercent}
      progressMessage={job.progressMessage}
      defaultProgressMessage="Копирование…"
      accent="accent"
      compact={compact}
    />
  );
}
