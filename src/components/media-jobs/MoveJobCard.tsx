"use client";

import Link from "next/link";
import { Clapperboard, HardDrive, LoaderCircle } from "lucide-react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import { TierCoverOverlay } from "@/components/shared/TierCoverOverlay";
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
  const progress =
    job.progressPercent != null ? Math.round(job.progressPercent) : null;
  const sizeHint = moveSizeHint(job);
  const speed = moveSpeedLabel(job.progressSpeed);

  const posterSize = compact
    ? "h-[54px] w-9"
    : "h-[72px] w-12 sm:h-[84px] sm:w-14";

  const href = `/movies/${job.movie.slug}?release=${job.releaseId}`;

  return (
    <article
      className={`group/card relative rounded-[var(--radius)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-0.5 ${
        isRunning ? "glow-neural-8" : ""
      }`}
    >
      <Link href={href} className="focus-ring block">
        <LaserCardFrame tier={null} shape="landscape">
          <div
            className={`relative overflow-hidden rounded-[var(--radius)] border transition-colors duration-300 active:scale-[0.995] ${
              isRunning
                ? "border-neural/35 bg-bg-elevated/40 hover:border-neural/55"
                : "border-border bg-bg-elevated/25 hover:border-border-strong hover:bg-bg-elevated/35"
            } ${compact ? "p-3" : "p-4 sm:p-5"}`}
          >
            {isRunning ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-neural/50 to-transparent"
              />
            ) : null}

            <div className={`flex gap-3 ${compact ? "gap-2.5" : "gap-4 sm:gap-5"}`}>
              <div
                className={`relative shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border-strong bg-bg-deep/80 ${posterSize}`}
              >
                {coverUrl ? (
                  <ApiCoverImage
                    src={coverUrl}
                    alt=""
                    width={56}
                    height={84}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover/laser:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-faint">
                    <Clapperboard className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                  </div>
                )}
                <TierCoverOverlay
                  tier={null}
                  showScrim={false}
                  holoRestOpacity="opacity-[0.08]"
                  holoHoverOpacity="group-hover/laser:opacity-25"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <p
                      className={`min-w-0 truncate font-medium text-text ${
                        compact ? "text-sm" : "text-base sm:text-[1.05rem]"
                      }`}
                    >
                      <span className="font-mono-tech text-[10px] font-normal uppercase tracking-[0.14em] text-faint">
                        перенос
                      </span>
                      <span className="px-1.5 text-faint" aria-hidden>
                        ·
                      </span>
                      {job.movie.title}
                    </p>
                    {job.externalStorage?.name ? (
                      <span className="font-mono-tech shrink-0 rounded-full border border-neural/30 bg-bg-deep/90 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-neural-bright/90">
                        {job.externalStorage.name}
                      </span>
                    ) : null}
                  </div>

                  <span
                    className={`font-mono-tech inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${meta.badgeClass}`}
                  >
                    {isRunning ? (
                      <LoaderCircle className="h-3 w-3 animate-spin" strokeWidth={2} aria-hidden />
                    ) : (
                      <HardDrive className="h-3 w-3" strokeWidth={1.75} aria-hidden />
                    )}
                    {meta.label}
                  </span>
                </div>

                <p className={`mt-1.5 truncate text-muted ${compact ? "text-xs" : "text-sm"}`}>
                  <span className="text-text/85">{job.targetFilename}</span>
                  {sizeHint ? <span className="text-faint"> · {sizeHint}</span> : null}
                </p>

                {isRunning && progress != null ? (
                  <div className={`space-y-1.5 ${compact ? "mt-2" : "mt-3"}`}>
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="truncate text-muted">
                        {job.progressMessage ?? "Перемещение…"}
                        {speed ? ` · ${speed}` : ""}
                      </span>
                      <span className="shrink-0 tabular-nums text-neural">{progress}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-bg-deep/80 ring-1 ring-inset ring-border/60">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-neural/80 to-neural-bright transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </LaserCardFrame>
      </Link>
    </article>
  );
}
