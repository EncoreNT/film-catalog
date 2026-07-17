"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { BuildJobCard } from "@/components/builds/BuildJobCard";
import { apiFetch } from "@/lib/api/client";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import {
  applyQueuedOrderToItems,
  moveQueuedBuild,
  reorderQueuedIds,
} from "@/lib/builds/build-queue-reorder";
import { sortBuildsForQueue } from "@/lib/builds/build-queue-display";

interface BuildQueuedListProps {
  builds: SerializedBuild[];
  allItems: SerializedBuild[];
  onItemsChange: (items: SerializedBuild[]) => void;
  onHover: (build: SerializedBuild | null) => void;
}

export function BuildQueuedList({
  builds,
  allItems,
  onItemsChange,
  onHover,
}: BuildQueuedListProps) {
  const reduceMotion = useReducedMotion();
  const [dragBuildId, setDragBuildId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const orderedIds = builds.map((b) => b.id);

  const persistOrder = async (nextIds: number[]) => {
    const previous = allItems;
    onItemsChange(sortBuildsForQueue(applyQueuedOrderToItems(allItems, nextIds)));
    setSaving(true);
    try {
      const data = await apiFetch<{ items: SerializedBuild[] }>(
        "/api/builds/reorder",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: nextIds }),
        },
        "Не удалось изменить порядок",
      );
      const byId = new Map(data.items.map((item) => [item.id, item]));
      onItemsChange(
        sortBuildsForQueue(previous.map((item) => byId.get(item.id) ?? item)),
      );
    } catch {
      onItemsChange(previous);
    } finally {
      setSaving(false);
    }
  };

  const applyMove = (buildId: number, direction: "up" | "down") => {
    const nextIds = moveQueuedBuild(orderedIds, buildId, direction);
    if (!nextIds) return;
    void persistOrder(nextIds);
  };

  const applyDrop = (buildId: number, targetIndex: number) => {
    const nextIds = reorderQueuedIds(orderedIds, buildId, targetIndex);
    if (!nextIds) return;
    void persistOrder(nextIds);
  };

  return (
    <ul className="space-y-2" aria-busy={saving}>
      {builds.map((build, index) => {
        const canMoveUp = index > 0;
        const canMoveDown = index < builds.length - 1;
        const isDragging = dragBuildId === build.id;

        return (
          <motion.li
            key={build.id}
            layout={reduceMotion ? false : "position"}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: isDragging ? 0.55 : 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`flex gap-2 ${isDragging ? "z-20" : ""}`}
            onDragOver={(event) => {
              if (dragBuildId == null || dragBuildId === build.id) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (dragBuildId == null) return;
              applyDrop(dragBuildId, index);
              setDragBuildId(null);
            }}
          >
            <div className="flex shrink-0 flex-col items-center justify-center gap-1 pt-1">
              <button
                type="button"
                aria-label={`Поднять сборку #${build.id}`}
                disabled={!canMoveUp || saving}
                onClick={() => applyMove(build.id, "up")}
                className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border/70 bg-bg-deep/50 text-muted transition-colors enabled:hover:border-neural/35 enabled:hover:text-neural-bright disabled:opacity-30"
              >
                <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </button>

              <button
                type="button"
                draggable={!saving}
                aria-label={`Перетащить сборку #${build.id}`}
                onDragStart={(event) => {
                  setDragBuildId(build.id);
                  event.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragBuildId(null)}
                className="focus-ring inline-flex h-8 w-7 cursor-grab items-center justify-center rounded-[var(--radius-sm)] border border-border/70 bg-bg-deep/50 text-muted transition-colors hover:border-neural/35 hover:text-neural-bright active:cursor-grabbing"
              >
                <GripVertical className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </button>

              <button
                type="button"
                aria-label={`Опустить сборку #${build.id}`}
                disabled={!canMoveDown || saving}
                onClick={() => applyMove(build.id, "down")}
                className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] border border-border/70 bg-bg-deep/50 text-muted transition-colors enabled:hover:border-neural/35 enabled:hover:text-neural-bright disabled:opacity-30"
              >
                <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <BuildJobCard
                build={build}
                allItems={allItems}
                onHover={onHover}
              />
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
