"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import type { ReleasePartGroup } from "@/lib/movies/build-part-release-groups";
import { ReleaseTabStorageIcon, ReleaseCutMark } from "@/components/releases/ReleaseSpecRibbon";
import { ReleasePanelContent } from "@/components/releases/ReleasePanelContent";
import { ReleasePanelActions } from "@/components/releases/ReleasePanelActions";
import { AddReleaseMenu } from "@/components/releases/AddReleaseMenu";
import { ReleaseExportProgressStrip } from "@/components/releases/ReleaseExportProgressStrip";
import { ReleaseMoveProgressStrip } from "@/components/releases/ReleaseMoveProgressStrip";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
import { useReleaseExportJob } from "@/hooks/useReleaseExportJob";
import { useReleaseMoveJob } from "@/hooks/useReleaseMoveJob";
import { useOptionalMovieRuntime } from "@/components/movies/MovieRuntimeContext";
import {
  releaseToTabTier,
  tierTabStyles,
  type TierTabStyle,
} from "@/lib/media/tier-presentation";

function releaseTabInner(
  release: ReleaseDetailView,
  active: boolean,
  tierTab: TierTabStyle,
) {
  return (
    <>
      <ReleaseTabStorageIcon
        external={release.storageExternal}
        label={release.storageLabel}
      />
      <span>{release.label}</span>
      {release.versionLabel ? (
        <ReleaseCutMark label={release.versionLabel} />
      ) : null}
      {release.tier ? (
        <span className="font-mono-tech text-[10px] uppercase tracking-[0.18em]">
          {tierTab.tag}
        </span>
      ) : null}
      {active ? (
        <motion.span
          layoutId="release-tab-underline"
          className={`pointer-events-none absolute inset-x-3 bottom-0 h-[2px] rounded-full ${tierTab.underline} ${tierTab.glow}`}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        />
      ) : null}
    </>
  );
}

interface MovieReleasePanelProps {
  movieId: number;
  movieSlug: string;
  releases: ReleaseDetailView[];
  partGroups?: ReleasePartGroup[] | null;
  initialActiveReleaseId: number;
  primaryReleaseId: number | null;
}

export function MovieReleasePanel({
  movieId,
  movieSlug,
  releases,
  partGroups = null,
  initialActiveReleaseId,
  primaryReleaseId,
}: MovieReleasePanelProps) {
  const pathname = usePathname();
  const grouped =
    partGroups != null && partGroups.length > 1 ? partGroups : null;
  const initialPart =
    grouped?.find((group) =>
      group.releases.some((r) => r.id === initialActiveReleaseId),
    )?.partNumber ?? grouped?.[0]?.partNumber ?? null;
  const [activePartNumber, setActivePartNumber] = useState<number | null>(
    initialPart,
  );
  const panelReleases =
    grouped && activePartNumber != null
      ? (grouped.find((g) => g.partNumber === activePartNumber)?.releases ??
        releases)
      : releases;
  const [activeId, setActiveId] = useState(initialActiveReleaseId);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(
    null,
  );
  const [moveSuccessMessage, setMoveSuccessMessage] = useState<string | null>(
    null,
  );
  const movieRuntime = useOptionalMovieRuntime();
  const showTabs = panelReleases.length > 1;

  const activeRelease =
    panelReleases.find((r) => r.id === activeId) ??
    panelReleases[0] ??
    releases.find((r) => r.id === activeId) ??
    releases[0] ??
    null;

  const handleExportSucceeded = useCallback(
    (job: { targetPathDisplay: string }) => {
      setExportSuccessMessage(`Скопировано: ${job.targetPathDisplay}`);
      setExportDialogOpen(false);
    },
    [],
  );

  const exportJobState = useReleaseExportJob({
    movieId,
    releaseId: activeRelease?.id ?? 0,
    onSucceeded: handleExportSucceeded,
  });

  const handleMoveSucceeded = useCallback(
    (job: { targetPathDisplay: string; warningMessage?: string | null }) => {
      setMoveSuccessMessage(
        job.warningMessage
          ? `Перемещено: ${job.targetPathDisplay}. ${job.warningMessage}`
          : `Перемещено: ${job.targetPathDisplay}`,
      );
      setMoveDialogOpen(false);
    },
    [],
  );

  const moveJobState = useReleaseMoveJob({
    movieId,
    releaseId: activeRelease?.id ?? 0,
    onSucceeded: handleMoveSucceeded,
  });

  const syncUrl = useCallback(
    (id: number) => {
      const params = new URLSearchParams(window.location.search);
      params.set("release", String(id));
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname,
      );
    },
    [pathname],
  );

  const selectRelease = useCallback(
    (id: number) => {
      setActiveId(id);
      syncUrl(id);
    },
    [syncUrl],
  );

  useEffect(() => {
    if (activeId != null) movieRuntime?.setActiveReleaseId(activeId);
  }, [activeId, movieRuntime?.setActiveReleaseId]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("release");
      if (id) {
        const parsed = Number(id);
        if (releases.some((r) => r.id === parsed)) {
          setActiveId(parsed);
          const part = grouped?.find((group) =>
            group.releases.some((r) => r.id === parsed),
          );
          if (part) setActivePartNumber(part.partNumber);
        }
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [releases, grouped]);

  const selectPart = useCallback(
    (partNumber: number) => {
      setActivePartNumber(partNumber);
      const group = grouped?.find((g) => g.partNumber === partNumber);
      const first = group?.releases[0];
      if (first) {
        setActiveId(first.id);
        syncUrl(first.id);
      }
    },
    [grouped, syncUrl],
  );

  if (!activeRelease) {
    return (
      <section className="surface-release-panel p-5">
        <p className="text-sm text-muted">У фильма пока нет релизов.</p>
      </section>
    );
  }

  const activeTier = activeRelease.tier ?? "standard";
  const showExportStrip =
    exportJobState.exportActive &&
    !exportDialogOpen &&
    exportJobState.exportJob != null;
  const stripExportJob = exportJobState.exportJob;
  const showMoveStrip =
    moveJobState.moveActive &&
    !moveDialogOpen &&
    moveJobState.moveJob != null;
  const stripMoveJob = moveJobState.moveJob;

  return (
    <section className="surface-release-panel overflow-hidden">
      <SpotlightTier tier={activeTier} />
      <div className="flex flex-col gap-0 overflow-visible border-b border-border bg-bg-elevated/85">
        {grouped ? (
          <div
            className="flex flex-wrap gap-1 border-b border-border/60 px-2 py-2 sm:px-3"
            role="tablist"
            aria-label="Серии фильма"
          >
            {grouped.map((group) => {
              const active = group.partNumber === activePartNumber;
              const label =
                group.partNumber === 0
                  ? "Без серии"
                  : group.title?.trim()
                    ? `Серия ${group.partNumber}: ${group.title.trim()}`
                    : `Серия ${group.partNumber}`;
              return (
                <button
                  key={group.partNumber}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectPart(group.partNumber)}
                  className={`focus-ring font-mono-tech rounded-full px-3 py-1.5 text-[0.65rem] transition-colors ${
                    active
                      ? "bg-accent/15 text-accent-bright"
                      : "text-muted hover:text-text"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="flex flex-col gap-0 sm:flex-row sm:items-stretch sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-stretch px-1 pt-1">
            <div
              className="flex flex-wrap gap-0"
              role={showTabs ? "tablist" : undefined}
              aria-label={showTabs ? "Релизы" : undefined}
            >
              {panelReleases.map((release) => {
                const active = release.id === activeId;
                const tierTab = tierTabStyles(releaseToTabTier(release.tier));
                const className = `font-mono-tech relative inline-flex items-center gap-1.5 px-4 py-2.5 text-xs ${
                  showTabs && !active ? tierTab.inactiveText : tierTab.text
                }`;
                if (!showTabs) {
                  return (
                    <div key={release.id} className={className}>
                      {releaseTabInner(release, true, tierTab)}
                    </div>
                  );
                }
                return (
                  <button
                    key={release.id}
                    type="button"
                    role="tab"
                    id={`release-tab-${release.id}`}
                    aria-selected={active}
                    aria-controls={`release-panel-${release.id}`}
                    aria-label={
                      release.versionLabel
                        ? `${release.label}, ${release.versionLabel}`
                        : release.label
                    }
                    onClick={() => selectRelease(release.id)}
                    className={`focus-ring transition-colors ${className}`}
                  >
                    {releaseTabInner(release, active, tierTab)}
                  </button>
                );
              })}
            </div>
            <AddReleaseMenu
              movieSlug={movieSlug}
              sourceReleaseId={activeRelease.id}
            />
          </div>
          <ReleasePanelActions
            movieId={movieId}
            movieSlug={movieSlug}
            activeRelease={activeRelease}
            releaseCount={panelReleases.length}
            primaryReleaseId={primaryReleaseId}
            exportJobState={exportJobState}
            exportDialogOpen={exportDialogOpen}
            onExportDialogOpenChange={setExportDialogOpen}
            onExportSuccessMessageChange={setExportSuccessMessage}
            moveJobState={moveJobState}
            moveDialogOpen={moveDialogOpen}
            onMoveDialogOpenChange={setMoveDialogOpen}
          />
        </div>
        {showMoveStrip && stripMoveJob ? (
          <ReleaseMoveProgressStrip
            job={stripMoveJob}
            loading={moveJobState.loading}
            onOpen={() => setMoveDialogOpen(true)}
            onCancel={() => void moveJobState.cancelMove()}
          />
        ) : null}
        {showExportStrip && stripExportJob ? (
          <ReleaseExportProgressStrip
            job={stripExportJob}
            loading={exportJobState.loading}
            onOpen={() => setExportDialogOpen(true)}
            onCancel={() => void exportJobState.cancelExport()}
          />
        ) : null}
        {moveSuccessMessage ? (
          <div
            className="border-t border-neural/20 bg-neural/[0.06] px-3 py-2 sm:px-5"
            role="status"
          >
            <p className="truncate font-mono-tech text-xs text-neural">
              {moveSuccessMessage}
            </p>
          </div>
        ) : null}
        {exportSuccessMessage ? (
          <div
            className="border-t border-accent/20 bg-accent/[0.06] px-3 py-2 sm:px-5"
            role="status"
          >
            <p className="truncate font-mono-tech text-xs text-accent">
              {exportSuccessMessage}
            </p>
          </div>
        ) : null}
      </div>

      <div
        role="tabpanel"
        id={`release-panel-${activeRelease.id}`}
        aria-labelledby={
          showTabs ? `release-tab-${activeRelease.id}` : undefined
        }
        className="min-w-0 p-4 sm:p-5 2xl:p-5"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeRelease.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            <ReleasePanelContent release={activeRelease} />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
