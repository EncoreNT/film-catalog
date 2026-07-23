"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Clapperboard, LoaderCircle } from "lucide-react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import { TierCoverOverlay } from "@/components/shared/TierCoverOverlay";
import type { ReleaseTier } from "@/lib/media/release-tags";

export type MediaJobAccent = "accent" | "neural";

const ACCENT: Record<
  MediaJobAccent,
  {
    runningGlow: string;
    runningBorder: string;
    runningLine: string;
    progressLabel: string;
    progressBar: string;
  }
> = {
  accent: {
    runningGlow: "glow-accent-8",
    runningBorder:
      "border-accent/35 bg-bg-elevated/40 hover:border-accent/55",
    runningLine: "via-accent/50",
    progressLabel: "text-accent",
    progressBar: "bg-gradient-to-r from-accent/80 to-accent-bright",
  },
  neural: {
    runningGlow: "glow-neural-8",
    runningBorder:
      "border-neural/35 bg-bg-elevated/40 hover:border-neural/55",
    runningLine: "via-neural/50",
    progressLabel: "text-neural",
    progressBar: "bg-gradient-to-r from-neural/80 to-neural-bright",
  },
};

interface MediaJobCardProps {
  href: string;
  coverUrl: string | null;
  kindLabel: string;
  title: string;
  /** Optional chip next to title (TV-ready, storage name, …). */
  titleBadge?: React.ReactNode;
  statusLabel: string;
  statusBadgeClass: string;
  statusIcon: LucideIcon;
  isRunning: boolean;
  subtitle: React.ReactNode;
  progressPercent?: number | null;
  progressMessage?: string | null;
  progressSuffix?: string;
  defaultProgressMessage?: string;
  accent?: MediaJobAccent;
  compact?: boolean;
  tier?: ReleaseTier | null;
}

export function MediaJobCard({
  href,
  coverUrl,
  kindLabel,
  title,
  titleBadge,
  statusLabel,
  statusBadgeClass,
  statusIcon: StatusIcon,
  isRunning,
  subtitle,
  progressPercent,
  progressMessage,
  progressSuffix,
  defaultProgressMessage = "Обработка…",
  accent = "accent",
  compact = false,
  tier = null,
}: MediaJobCardProps) {
  const a = ACCENT[accent];
  const progress =
    progressPercent != null ? Math.round(progressPercent) : null;

  const posterSize = compact
    ? "h-[54px] w-9"
    : "h-[72px] w-12 sm:h-[84px] sm:w-14";

  const idleBorder =
    "border-border bg-bg-elevated/25 hover:border-border-strong hover:bg-bg-elevated/35";

  return (
    <article
      className={`group/card relative rounded-[var(--radius)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-0.5 ${
        isRunning ? a.runningGlow : ""
      }`}
    >
      <Link href={href} className="focus-ring block">
        <LaserCardFrame tier={tier} shape="landscape">
          <div
            className={`relative overflow-hidden rounded-[var(--radius)] border transition-colors duration-300 active:scale-[0.995] ${
              isRunning ? a.runningBorder : idleBorder
            } ${compact ? "p-3" : "p-4 sm:p-5"}`}
          >
            {isRunning ? (
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent ${a.runningLine} to-transparent`}
              />
            ) : null}

            <div
              className={`flex gap-3 ${compact ? "gap-2.5" : "gap-4 sm:gap-5"}`}
            >
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
                    <Clapperboard
                      className="h-5 w-5"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </div>
                )}
                <TierCoverOverlay
                  tier={tier}
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
                        {kindLabel}
                      </span>
                      <span className="px-1.5 text-faint" aria-hidden>
                        ·
                      </span>
                      {title}
                    </p>
                    {titleBadge}
                  </div>

                  <span
                    className={`font-mono-tech inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusBadgeClass}`}
                  >
                    {isRunning ? (
                      <LoaderCircle
                        className="h-3 w-3 animate-spin"
                        strokeWidth={2}
                        aria-hidden
                      />
                    ) : (
                      <StatusIcon
                        className="h-3 w-3"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    )}
                    {statusLabel}
                  </span>
                </div>

                <p
                  className={`mt-1.5 truncate text-muted ${compact ? "text-xs" : "text-sm"}`}
                >
                  {subtitle}
                </p>

                {isRunning && progress != null ? (
                  <div className={`space-y-1.5 ${compact ? "mt-2" : "mt-3"}`}>
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className="truncate text-muted">
                        {progressMessage ?? defaultProgressMessage}
                        {progressSuffix ? ` · ${progressSuffix}` : ""}
                      </span>
                      <span
                        className={`shrink-0 tabular-nums ${a.progressLabel}`}
                      >
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-full bg-bg-deep/80 ring-1 ring-inset ring-border/60">
                      <div
                        className={`h-full rounded-full ${a.progressBar} transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
                        style={{
                          width: `${Math.min(100, Math.max(0, progress))}%`,
                        }}
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
