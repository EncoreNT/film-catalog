"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { ReleaseTabStorageIcon } from "@/components/releases/ReleaseSpecRibbon";
import { ReleasePanelContent } from "@/components/releases/ReleasePanelContent";
import { ReleasePanelActions } from "@/components/releases/ReleasePanelActions";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
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
      {/* Tier tag on every tiered tab. It inherits the tab's currentColor, so
          it reads at full intensity on the active tab and faded on inactive
          ones — no separate muted styling needed. */}
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
  initialActiveReleaseId: number;
}

export function MovieReleasePanel({
  movieId,
  movieSlug,
  releases,
  initialActiveReleaseId,
}: MovieReleasePanelProps) {
  const pathname = usePathname();
  const [activeId, setActiveId] = useState(initialActiveReleaseId);
  const showTabs = releases.length > 1;

  const activeRelease =
    releases.find((r) => r.id === activeId) ?? releases[0] ?? null;

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
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("release");
      if (id) {
        const parsed = Number(id);
        if (releases.some((r) => r.id === parsed)) {
          setActiveId(parsed);
        }
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [releases]);

  if (!activeRelease) {
    return (
      <section className="surface-card p-5">
        <p className="text-sm text-muted">У фильма пока нет релизов.</p>
      </section>
    );
  }

  // Spotlight follows the ACTIVE release tab, live: switching tabs recolors the
  // whole ambient (cone + glow) via the <SpotlightTier/> signal. Untiered
  // releases read as "standard" (cool white).
  const activeTier = activeRelease.tier ?? "standard";

  return (
    <section className="surface-card overflow-hidden">
      <SpotlightTier tier={activeTier} />
      <div className="flex flex-col gap-0 overflow-visible border-b border-border bg-bg-elevated/50 sm:flex-row sm:items-stretch sm:justify-between">
        {showTabs ? (
          <div
            className="flex flex-wrap gap-0 px-1 pt-1"
            role="tablist"
            aria-label="Релизы"
          >
            {releases.map((release) => {
              const active = release.id === activeId;
              const tierTab = tierTabStyles(releaseToTabTier(release.tier));
              return (
                <button
                  key={release.id}
                  type="button"
                  role="tab"
                  id={`release-tab-${release.id}`}
                  aria-selected={active}
                  aria-controls={`release-panel-${release.id}`}
                  onClick={() => selectRelease(release.id)}
                  className={`focus-ring font-mono-tech relative inline-flex items-center gap-1.5 px-4 py-2.5 text-xs transition-colors ${
                    active ? tierTab.text : tierTab.inactiveText
                  }`}
                >
                  {releaseTabInner(release, active, tierTab)}
                </button>
              );
            })}
          </div>
        ) : (
          // Single release: render the same active-tab visual as the
          // multi-release case (tier color + tier tag + underline) so the
          // console header reads consistently whether there is one release
          // or several. Static, non-interactive — there is nothing to switch.
          <div className="flex flex-wrap gap-0 px-1 pt-1">
            {releases.map((release) => {
              const tierTab = tierTabStyles(releaseToTabTier(release.tier));
              return (
                <div
                  key={release.id}
                  className={`font-mono-tech relative inline-flex items-center gap-1.5 px-4 py-2.5 text-xs ${tierTab.text}`}
                >
                  {releaseTabInner(release, true, tierTab)}
                </div>
              );
            })}
          </div>
        )}
        <ReleasePanelActions
          movieId={movieId}
          movieSlug={movieSlug}
          activeRelease={activeRelease}
          releaseCount={releases.length}
        />
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
