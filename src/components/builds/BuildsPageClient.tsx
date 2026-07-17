"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Layers3, LoaderCircle, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Chip } from "@/components/primitives/Chip";
import { EmptyState } from "@/components/primitives/EmptyState";
import { apiFetch } from "@/lib/api/client";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import {
  type BuildQueueFilter,
  filterBuilds,
  groupBuildsForDisplay,
  sortBuildsForQueue,
  summarizeBuildQueue,
} from "@/lib/builds/build-queue-display";
import { BuildJobCard } from "@/components/builds/BuildJobCard";
import { BuildQueueSectionBlock } from "@/components/builds/BuildQueueSectionBlock";
import { BuildQueuedList } from "@/components/builds/BuildQueuedList";
import { SpotlightTier } from "@/components/layout/SpotlightTier";

const FILTERS: { id: BuildQueueFilter; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "active", label: "Активные" },
  { id: "succeeded", label: "Готово" },
  { id: "failed", label: "Ошибки" },
  { id: "cancelled", label: "Отменено" },
];

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "accent" | "danger" | "neural";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent"
      : tone === "danger"
        ? "text-danger"
        : tone === "neural"
          ? "text-neural-bright"
          : "text-text";

  return (
    <div className="rounded-[var(--radius-sm)] border border-border/80 bg-bg-deep/40 px-3 py-2.5">
      <p className="font-mono-tech text-[10px] uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export function BuildsPageClient({
  initialItems,
  movieId,
}: {
  initialItems: SerializedBuild[];
  movieId?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState(() => sortBuildsForQueue(initialItems));
  const [filter, setFilter] = useState<BuildQueueFilter>("all");
  const [polling, setPolling] = useState(false);
  const [hoverBuildId, setHoverBuildId] = useState<number | null>(null);

  useEffect(() => {
    setItems(sortBuildsForQueue(initialItems));
  }, [initialItems]);

  useEffect(() => {
    const timer = setInterval(() => {
      const query = new URLSearchParams();
      if (movieId) query.set("movieId", String(movieId));
      query.set("limit", "50");
      setPolling(true);
      void apiFetch<{ items: SerializedBuild[] }>(
        `/api/builds?${query.toString()}`,
        undefined,
        "Ошибка загрузки",
      )
        .then((data) => setItems(sortBuildsForQueue(data.items)))
        .catch(() => undefined)
        .finally(() => setPolling(false));
    }, 5000);
    return () => clearInterval(timer);
  }, [movieId]);

  const summary = useMemo(() => summarizeBuildQueue(items), [items]);
  const filtered = useMemo(
    () => sortBuildsForQueue(filterBuilds(items, filter)),
    [items, filter],
  );
  const sections = useMemo(
    () => (filter === "all" ? groupBuildsForDisplay(items) : []),
    [items, filter],
  );
  const hoverSpotlight = useMemo(() => {
    if (hoverBuildId == null) return null;
    return items.find((b) => b.id === hoverBuildId)?.spotlightTier ?? null;
  }, [hoverBuildId, items]);

  const filterCounts: Record<BuildQueueFilter, number> = {
    all: summary.total,
    active: summary.active,
    succeeded: summary.succeeded,
    failed: summary.failed,
    cancelled: summary.cancelled,
  };

  if (items.length === 0) {
    return (
      <EmptyState
        glowVariant="accent"
        icon={<Layers3 className="h-9 w-9" strokeWidth={1.5} />}
        eyebrow="очередь пуста"
        title={<>Сборок пока нет</>}
        description="Когда соберёте пользовательский MKV из карточки фильма, задача появится здесь с прогрессом и результатом."
        action={
          <Link
            href="/"
            className="focus-ring inline-flex min-h-11 items-center rounded-full border border-border-strong bg-bg-elevated/50 px-5 py-2.5 text-sm font-medium text-text transition-colors hover:border-accent/35 hover:text-accent"
          >
            Перейти в каталог
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <SpotlightTier tier={hoverSpotlight ?? "general"} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        <SummaryStat label="активные" value={summary.active} tone="accent" />
        <SummaryStat label="в очереди" value={summary.queued} tone="neural" />
        <SummaryStat label="готово" value={summary.succeeded} />
        <SummaryStat label="ошибки" value={summary.failed} tone="danger" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ id, label }) => (
            <Chip
              key={id}
              size="sm"
              active={filter === id}
              count={filterCounts[id]}
              onClick={() => setFilter(id)}
            >
              {label}
            </Chip>
          ))}
        </div>

        <p className="flex items-center gap-2 text-xs text-faint">
          {polling ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-accent/70" aria-hidden />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-accent/50" aria-hidden />
          )}
          <span>обновление каждые 5 с</span>
        </p>
      </div>

      {movieId ? (
        <p className="rounded-[var(--radius-sm)] border border-border/70 bg-bg-elevated/20 px-3 py-2 text-sm text-muted">
          Показаны сборки одного фильма.{" "}
          <Link href="/builds" className="text-accent hover:underline">
            Вся очередь
          </Link>
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-[var(--radius)] border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
          В этой группе пока ничего нет.
        </p>
      ) : filter === "all" ? (
        <div className="space-y-4">
          {sections.map((section, sectionIndex) => (
            <BuildQueueSectionBlock
              key={section.id}
              id={section.id}
              title={section.title}
              hint={section.hint}
              count={section.items.length}
            >
              {section.id === "queued" && !movieId ? (
                <BuildQueuedList
                  builds={section.items}
                  allItems={items}
                  onItemsChange={setItems}
                  onHover={(next) => setHoverBuildId(next?.id ?? null)}
                />
              ) : (
                <ul className="space-y-2">
                  {section.items.map((build, index) => (
                    <motion.li
                      key={build.id}
                      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.35,
                        delay: reduceMotion ? 0 : sectionIndex * 0.04 + index * 0.03,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <BuildJobCard
                        build={build}
                        allItems={items}
                        onHover={(next) => setHoverBuildId(next?.id ?? null)}
                      />
                    </motion.li>
                  ))}
                </ul>
              )}
            </BuildQueueSectionBlock>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((build, index) => (
            <motion.li
              key={build.id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: reduceMotion ? 0 : index * 0.03,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <BuildJobCard
                build={build}
                allItems={items}
                onHover={(next) => setHoverBuildId(next?.id ?? null)}
              />
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
