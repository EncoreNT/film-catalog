"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import type { ReleasePartGroup } from "@/lib/movies/build-part-release-groups";
import { ReleaseTabStorageIcon, ReleaseCutMark } from "@/components/releases/ReleaseSpecRibbon";
import { ReleaseComparison } from "@/components/releases/ReleaseComparison";
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
      <strong>
        <ReleaseTabStorageIcon external={release.storageExternal} label={release.storageLabel} />
        {release.label}
        {release.versionLabel && <ReleaseCutMark label={release.versionLabel} />}
      </strong>
      <small>
        {release.fileSizeLabel ?? `Релиз #${release.id}`}
      </small>
      {active ? (
        <motion.span
          layoutId="release-tab-underline"
          className={`pointer-events-none absolute inset-x-3 top-0 h-[2px] rounded-full ${tierTab.underline} ${tierTab.glow}`}
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
  const releaseTabsRef = useRef<HTMLDivElement>(null);
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
  const setRuntimeReleaseId = useOptionalMovieRuntime()?.setActiveReleaseId;
  const showTabs = panelReleases.length > 1;

  const activeRelease =
    panelReleases.find((r) => r.id === activeId) ??
    panelReleases[0] ??
    releases.find((r) => r.id === activeId) ??
    releases[0] ??
    null;

  const selectedId = activeRelease?.id;
  useEffect(() => {
    const tabs = releaseTabsRef.current;
    const choice = tabs?.querySelector<HTMLElement>('[data-active="true"]');
    if (!tabs || !choice) return;
    const bounds = tabs.getBoundingClientRect();
    const item = choice.getBoundingClientRect();
    if (item.right > bounds.right) tabs.scrollLeft += item.right - bounds.right;
    else if (item.left < bounds.left) tabs.scrollLeft -= bounds.left - item.left;
  }, [selectedId]);

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
    if (activeRelease) setRuntimeReleaseId?.(activeRelease.id);
  }, [activeRelease, setRuntimeReleaseId]);

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
    <section className="movie-releases" data-tier={activeTier} aria-label="Релизы фильма">
      <SpotlightTier tier={activeTier} />
      <div className="movie-release-bar">
        <span className="movie-tab-backdrop" aria-hidden />
        {grouped ? (
          <div
            className="movie-parts scroll-subtle"
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
        <div className="movie-release-toolbar">
          <div ref={releaseTabsRef} className="movie-release-tabs scroll-subtle"
            role={showTabs ? "tablist" : undefined} aria-label={showTabs ? "Релизы" : undefined}>
            {panelReleases.map((release) => {
              const active = release.id === activeRelease.id;
              const tierTab = tierTabStyles(releaseToTabTier(release.tier));
              return (
                <div key={release.id} className="movie-release-choice" data-active={active} data-tier={release.tier ?? "standard"}>
                  {showTabs ? (
                    <button type="button" role="tab" id={`release-tab-${release.id}`}
                      aria-selected={active} aria-controls={`release-panel-${release.id}`}
                      aria-label={[release.label, release.versionLabel, release.fileSizeLabel ?? `Релиз #${release.id}`, release.storageLabel].filter(Boolean).join(", ")}
                      onClick={() => selectRelease(release.id)}
                      className={`movie-release-tab focus-ring ${active ? tierTab.text : tierTab.inactiveText}`}>
                      {releaseTabInner(release, active, tierTab)}
                    </button>
                  ) : (
                    <div className={`movie-release-tab ${tierTab.text}`}>{releaseTabInner(release, true, tierTab)}</div>
                  )}
                  {active && (
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
                  )}
                </div>
              );
            })}
          </div>
          <div className="movie-edition-controls">
            {showTabs && <ReleaseComparison releases={panelReleases} activeId={activeRelease.id} onSelect={selectRelease} />}
            <AddReleaseMenu movieSlug={movieSlug} sourceReleaseId={activeRelease.id} />
          </div>
        </div>
        {showMoveStrip && stripMoveJob ? (
          <ReleaseMoveProgressStrip
            job={stripMoveJob}
            etaLabel={moveJobState.etaLabel}
            loading={moveJobState.loading}
            onOpen={() => setMoveDialogOpen(true)}
            onCancel={() => moveJobState.cancelMove()}
          />
        ) : null}
        {showExportStrip && stripExportJob ? (
          <ReleaseExportProgressStrip
            job={stripExportJob}
            etaLabel={exportJobState.etaLabel}
            loading={exportJobState.loading}
            onOpen={() => setExportDialogOpen(true)}
            onCancel={() => exportJobState.cancelExport()}
          />
        ) : null}
        {moveSuccessMessage ? (
          <div
            className="release-transfer-result"
            role="status"
          >
            <p>
              {moveSuccessMessage}
            </p>
          </div>
        ) : null}
        {exportSuccessMessage ? (
          <div
            className="release-transfer-result"
            role="status"
          >
            <p>
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
        className="movie-release-workspace min-w-0"
      >
        <ReleasePanelContent release={activeRelease} />
      </div>
    </section>
  );
}
