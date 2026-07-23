"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clapperboard, LoaderCircle } from "lucide-react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import { TierCoverOverlay } from "@/components/shared/TierCoverOverlay";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { buildLaserTier } from "@/lib/builds/build-visual-tier";
import {
  BUILD_STATUS_META,
  buildOutputBasename,
  buildTimeCaption,
  queuedPosition,
} from "@/lib/builds/build-queue-display";
import {
  buildQueuedEtaLabel,
  buildRunningEtaLabel,
} from "@/lib/builds/build-eta";
import { catalogTierRibbon } from "@/lib/media/spec-tags";
import { TierChip } from "@/components/shared/TierChip";
import {
  tierCardGlow,
  tierChipTone,
  tierPosterGlow,
} from "@/lib/media/tier-presentation";
import type { BuildVisualTier } from "@/lib/builds/build-visual-tier";

function buildCardShellClass(
  visualTier: BuildVisualTier | null,
  isRunning: boolean,
): string {
  if (isRunning) {
    if (visualTier === "ruby") {
      return "border-crimson/40 bg-bg-elevated/40 hover:border-crimson/55";
    }
    if (visualTier === "gold") {
      return "border-accent/35 bg-bg-elevated/40 hover:border-accent/55";
    }
    return "border-border-strong/60 bg-bg-elevated/40 hover:border-border-strong";
  }
  if (visualTier === "ruby") {
    return "border-crimson/25 bg-bg-elevated/25 hover:border-crimson/40";
  }
  if (visualTier === "gold") {
    return "border-accent/25 bg-bg-elevated/25 hover:border-accent/40";
  }
  return "border-border bg-bg-elevated/25 hover:border-border-strong hover:bg-bg-elevated/35";
}

function buildRunningAccentLine(visualTier: BuildVisualTier | null): string {
  if (visualTier === "ruby") return "via-crimson/50";
  if (visualTier === "gold") return "via-accent/50";
  return "via-neural-bright/40";
}

function buildProgressTone(visualTier: BuildVisualTier | null): {
  label: string;
  bar: string;
} {
  if (visualTier === "ruby") {
    return {
      label: "text-crimson-bright",
      bar: "bg-gradient-to-r from-crimson/80 to-crimson-bright",
    };
  }
  if (visualTier === "gold") {
    return {
      label: "text-accent",
      bar: "bg-gradient-to-r from-accent/80 to-accent-bright",
    };
  }
  return {
    label: "text-neural-bright",
    bar: "bg-gradient-to-r from-neural/80 to-neural-bright",
  };
}

export function BuildJobCard({
  build,
  allItems,
  compact = false,
  onHover,
}: {
  build: SerializedBuild;
  allItems?: SerializedBuild[];
  compact?: boolean;
  onHover?: (build: SerializedBuild | null) => void;
}) {
  const meta = BUILD_STATUS_META[build.status];
  const coverUrl = movieCoverUrlFromMovie(build.movie);
  const basename = buildOutputBasename(build.outputPath);
  const timeCaption = buildTimeCaption(build);
  const queuePos =
    allItems && build.status === "QUEUED" ? queuedPosition(build, allItems) : null;
  const trackCount = build.tracks.length;
  const isRunning = build.status === "RUNNING";
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRunning, build.updatedAt, build.progressOutTimeMs, build.progressPercent]);

  const progress =
    build.progressPercent != null ? Math.round(build.progressPercent) : null;
  const etaLabel = isRunning
    ? buildRunningEtaLabel(build, now)
    : build.status === "QUEUED" && allItems
      ? buildQueuedEtaLabel(build, allItems, now)
      : null;
  const laserTier = buildLaserTier(build.visualTier);
  const tierRibbon = catalogTierRibbon(laserTier);
  const chipTone = tierChipTone(laserTier);
  const cardGlow = tierCardGlow(laserTier);
  const progressTone = buildProgressTone(build.visualTier);

  const posterSize = compact
    ? "h-[54px] w-9"
    : "h-[72px] w-12 sm:h-[84px] sm:w-14";

  return (
    <article
      className={`group group/card relative rounded-[var(--radius)] ${cardGlow} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-0.5`}
      onMouseEnter={() => onHover?.(build)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(build)}
      onBlur={() => onHover?.(null)}
    >
      <Link href={`/builds/${build.id}`} className="focus-ring block">
        <LaserCardFrame tier={laserTier} shape="landscape">
          <div
            className={`relative overflow-hidden rounded-[var(--radius)] border transition-colors duration-300 active:scale-[0.995] ${buildCardShellClass(build.visualTier, isRunning)} ${compact ? "p-3" : "p-4 sm:p-5"}`}
          >
            {isRunning && build.visualTier !== "ruby" && build.visualTier !== "gold" ? (
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent ${buildRunningAccentLine(build.visualTier)} to-transparent`}
              />
            ) : null}

            <div className={`flex gap-3 ${compact ? "gap-2.5" : "gap-4 sm:gap-5"}`}>
              <div
                className={`relative shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-border-strong bg-bg-deep/80 transition-shadow duration-500 ${tierPosterGlow(laserTier, "inset")} ${posterSize}`}
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
                  tier={laserTier}
                  showScrim={false}
                  holoRestOpacity="opacity-[0.1]"
                  holoHoverOpacity="group-hover/laser:opacity-35"
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
                        #{build.id}
                      </span>
                      <span className="px-1.5 text-faint" aria-hidden>
                        ·
                      </span>
                      {build.movie.title}
                    </p>
                    {tierRibbon ? (
                      <TierChip tone={chipTone}>{tierRibbon}</TierChip>
                    ) : null}
                  </div>

                  <span
                    className={`font-mono-tech inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${meta.badgeClass}`}
                  >
                    {isRunning ? (
                      <LoaderCircle className="h-3 w-3 animate-spin" strokeWidth={2} aria-hidden />
                    ) : (
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden />
                    )}
                    {meta.label}
                  </span>
                </div>

                <p className={`mt-1.5 truncate text-muted ${compact ? "text-xs" : "text-sm"}`}>
                  <span className="text-text/85">{basename}</span>
                  {trackCount > 0 ? (
                    <span className="text-faint">
                      {" "}
                      · {trackCount}{" "}
                      {trackCount === 1 ? "дорожка" : trackCount < 5 ? "дорожки" : "дорожек"}
                    </span>
                  ) : null}
                  {queuePos != null ? (
                    <span className="text-neural-bright/90"> · позиция {queuePos}</span>
                  ) : null}
                  {timeCaption ? <span className="text-faint"> · {timeCaption}</span> : null}
                  {etaLabel ? (
                    <span className="text-accent/85"> · {etaLabel}</span>
                  ) : null}
                </p>

                {build.status === "FAILED" && build.errorMessage ? (
                  <p className="mt-1.5 line-clamp-1 text-xs text-danger/90">{build.errorMessage}</p>
                ) : null}

                {isRunning && progress != null ? (
                  <div className={`space-y-1.5 ${compact ? "mt-2" : "mt-3"}`}>
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="truncate text-muted">
                        {build.progressMessage ?? "Сборка…"}
                      </span>
                      <span className={`shrink-0 tabular-nums ${progressTone.label}`}>
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-bg-deep/80 ring-1 ring-inset ring-border/60">
                      <div
                        className={`h-full rounded-full ${progressTone.bar} transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {!compact ? (
                <ChevronRight
                  className="mt-1 hidden h-4 w-4 shrink-0 text-faint transition-transform duration-300 group-hover/card:translate-x-0.5 group-hover/card:text-accent/80 sm:block"
                  strokeWidth={1.5}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        </LaserCardFrame>
      </Link>
    </article>
  );
}
