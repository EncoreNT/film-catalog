import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { sortBuildsForQueue } from "@/lib/builds/build-queue-display";

export function queuedBuildIds(items: SerializedBuild[]): number[] {
  return sortBuildsForQueue(items)
    .filter((b) => b.status === "QUEUED")
    .map((b) => b.id);
}

export function reorderQueuedIds(
  currentIds: number[],
  buildId: number,
  targetIndex: number,
): number[] | null {
  const fromIndex = currentIds.indexOf(buildId);
  if (fromIndex < 0) return null;
  if (targetIndex < 0 || targetIndex >= currentIds.length) return null;
  if (fromIndex === targetIndex) return currentIds;

  const next = [...currentIds];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved!);
  return next;
}

export function moveQueuedBuild(
  currentIds: number[],
  buildId: number,
  direction: "up" | "down",
): number[] | null {
  const index = currentIds.indexOf(buildId);
  if (index < 0) return null;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  return reorderQueuedIds(currentIds, buildId, targetIndex);
}

export function applyQueuedOrderToItems(
  items: SerializedBuild[],
  orderedIds: number[],
): SerializedBuild[] {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  return items.map((item) =>
    item.status === "QUEUED" && orderMap.has(item.id)
      ? { ...item, queueOrder: orderMap.get(item.id)! }
      : item,
  );
}
