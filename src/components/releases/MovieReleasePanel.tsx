"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";
import { ReleaseTabStorageIcon } from "@/components/releases/ReleaseSpecRibbon";
import { ReleasePanelContent } from "@/components/releases/ReleasePanelContent";
import { ReleasePanelActions } from "@/components/releases/ReleasePanelActions";

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
      <section className="surface-card mt-8 p-5">
        <p className="text-sm text-muted">У фильма пока нет релизов.</p>
      </section>
    );
  }

  return (
    <section className="surface-card mt-8">
      <div className="flex flex-col gap-0 overflow-visible border-b border-border bg-bg-elevated/50 sm:flex-row sm:items-stretch sm:justify-between">
        {showTabs ? (
          <div
            className="flex flex-wrap gap-0 px-1 pt-1"
            role="tablist"
            aria-label="Релизы"
          >
            {releases.map((release) => {
              const active = release.id === activeId;
              return (
                <button
                  key={release.id}
                  type="button"
                  role="tab"
                  id={`release-tab-${release.id}`}
                  aria-selected={active}
                  aria-controls={`release-panel-${release.id}`}
                  onClick={() => selectRelease(release.id)}
                  className={`focus-ring font-mono-tech inline-flex items-center gap-1.5 rounded-t-[calc(var(--radius)-2px)] border px-4 py-2.5 text-xs transition-colors ${
                    active
                      ? "border-border border-b-transparent bg-bg-surface text-accent shadow-[inset_0_1px_0_var(--accent-glow)]"
                      : "border-transparent bg-transparent text-muted hover:text-text"
                  }`}
                >
                  <ReleaseTabStorageIcon
                    external={release.storageExternal}
                    label={release.storageLabel}
                  />
                  {release.label}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-5 py-3 text-faint sm:px-6">
            <ReleaseTabStorageIcon
              external={activeRelease.storageExternal}
              label={activeRelease.storageLabel}
            />
            <p className="font-mono-tech">релиз · {activeRelease.label}</p>
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
        className="p-5 sm:p-6"
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
