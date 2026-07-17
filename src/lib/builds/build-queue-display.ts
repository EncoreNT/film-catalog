import type { SerializedBuild } from "@/lib/builds/build-serialize";

export type BuildStatus = SerializedBuild["status"];

export const BUILD_STATUS_LABELS: Record<BuildStatus, string> = {
  QUEUED: "В очереди",
  RUNNING: "Выполняется",
  SUCCEEDED: "Готово",
  FAILED: "Ошибка",
  CANCELLED: "Отменено",
};

export type BuildStatusTone = "accent" | "neural" | "danger" | "ember" | "muted";

export interface BuildStatusMeta {
  label: string;
  tone: BuildStatusTone;
  badgeClass: string;
  dotClass: string;
}

export const BUILD_STATUS_META: Record<BuildStatus, BuildStatusMeta> = {
  RUNNING: {
    label: BUILD_STATUS_LABELS.RUNNING,
    tone: "accent",
    badgeClass:
      "border-accent/45 bg-accent/[0.12] text-accent-bright ring-1 ring-inset ring-accent/25",
    dotClass: "bg-accent-bright shadow-[0_0_8px_var(--accent-glow)]",
  },
  QUEUED: {
    label: BUILD_STATUS_LABELS.QUEUED,
    tone: "neural",
    badgeClass:
      "border-neural/35 bg-neural/[0.08] text-neural-bright ring-1 ring-inset ring-neural/20",
    dotClass: "bg-neural-bright shadow-[0_0_6px_var(--neural-glow)]",
  },
  SUCCEEDED: {
    label: BUILD_STATUS_LABELS.SUCCEEDED,
    tone: "accent",
    badgeClass: "border-accent/30 bg-accent/[0.06] text-accent/85",
    dotClass: "bg-accent/70",
  },
  FAILED: {
    label: BUILD_STATUS_LABELS.FAILED,
    tone: "danger",
    badgeClass:
      "border-danger/40 bg-danger/[0.1] text-danger ring-1 ring-inset ring-danger/20",
    dotClass: "bg-danger shadow-[0_0_6px_rgba(248,113,113,0.45)]",
  },
  CANCELLED: {
    label: BUILD_STATUS_LABELS.CANCELLED,
    tone: "ember",
    badgeClass: "border-ember/35 bg-ember/[0.08] text-ember-bright",
    dotClass: "bg-ember-bright/80",
  },
};

/** Priority for queue list: active work first, then attention, then archive. */
const STATUS_RANK: Record<BuildStatus, number> = {
  RUNNING: 0,
  QUEUED: 1,
  FAILED: 2,
  SUCCEEDED: 3,
  CANCELLED: 4,
};

function timestampMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function queueSortKey(build: SerializedBuild): number {
  switch (build.status) {
    case "RUNNING":
      return timestampMs(build.startedAt) || timestampMs(build.updatedAt);
    case "QUEUED":
      return build.queueOrder;
    case "FAILED":
    case "SUCCEEDED":
    case "CANCELLED":
      return timestampMs(build.finishedAt) || timestampMs(build.updatedAt);
    default:
      return timestampMs(build.createdAt);
  }
}

/** Matches worker FIFO for queued jobs; surfaces live work at the top. */
export function compareBuildsForQueue(
  a: SerializedBuild,
  b: SerializedBuild,
): number {
  const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (rankDiff !== 0) return rankDiff;

  if (a.status === "QUEUED" && b.status === "QUEUED") {
    const orderDiff = a.queueOrder - b.queueOrder;
    if (orderDiff !== 0) return orderDiff;
    return a.id - b.id;
  }

  const aKey = queueSortKey(a);
  const bKey = queueSortKey(b);

  if (a.status === "RUNNING" || a.status === "QUEUED") {
    return aKey - bKey;
  }

  return bKey - aKey;
}

export function sortBuildsForQueue(items: SerializedBuild[]): SerializedBuild[] {
  return [...items].sort(compareBuildsForQueue);
}

export type BuildQueueFilter = "all" | "active" | "succeeded" | "failed" | "cancelled";

export function filterBuilds(
  items: SerializedBuild[],
  filter: BuildQueueFilter,
): SerializedBuild[] {
  switch (filter) {
    case "active":
      return items.filter((b) => b.status === "RUNNING" || b.status === "QUEUED");
    case "succeeded":
      return items.filter((b) => b.status === "SUCCEEDED");
    case "failed":
      return items.filter((b) => b.status === "FAILED");
    case "cancelled":
      return items.filter((b) => b.status === "CANCELLED");
    default:
      return items;
  }
}

export type BuildQueueSectionId = "running" | "queued" | "failed" | "archive";

export interface BuildQueueSection {
  id: BuildQueueSectionId;
  title: string;
  hint?: string;
  items: SerializedBuild[];
}

const SECTION_META: Record<
  BuildQueueSectionId,
  { title: string; hint?: string; statuses: BuildStatus[] }
> = {
  running: {
    title: "Сейчас выполняется",
    hint: "Worker обрабатывает эти сборки прямо сейчас",
    statuses: ["RUNNING"],
  },
  queued: {
    title: "Ожидают запуска",
    hint: "Перетащите или используйте стрелки — worker возьмёт верхнюю сборку следующей",
    statuses: ["QUEUED"],
  },
  failed: {
    title: "Требуют внимания",
    hint: "Можно открыть детали и повторить сборку",
    statuses: ["FAILED"],
  },
  archive: {
    title: "Завершённые",
    statuses: ["SUCCEEDED", "CANCELLED"],
  },
};

export function groupBuildsForDisplay(
  items: SerializedBuild[],
): BuildQueueSection[] {
  const sorted = sortBuildsForQueue(items);
  const sections: BuildQueueSection[] = [];

  for (const id of ["running", "queued", "failed", "archive"] as const) {
    const meta = SECTION_META[id];
    const sectionItems = sorted.filter((b) => meta.statuses.includes(b.status));
    if (sectionItems.length === 0) continue;
    sections.push({
      id,
      title: meta.title,
      hint: meta.hint,
      items: sectionItems,
    });
  }

  return sections;
}

/** Collapsible queue sections: archive hidden by default, active groups open. */
export function defaultBuildSectionOpen(id: BuildQueueSectionId): boolean {
  return id !== "archive";
}

export interface BuildQueueSummary {
  total: number;
  running: number;
  queued: number;
  active: number;
  succeeded: number;
  failed: number;
  cancelled: number;
}

export function summarizeBuildQueue(items: SerializedBuild[]): BuildQueueSummary {
  let running = 0;
  let queued = 0;
  let succeeded = 0;
  let failed = 0;
  let cancelled = 0;

  for (const item of items) {
    switch (item.status) {
      case "RUNNING":
        running += 1;
        break;
      case "QUEUED":
        queued += 1;
        break;
      case "SUCCEEDED":
        succeeded += 1;
        break;
      case "FAILED":
        failed += 1;
        break;
      case "CANCELLED":
        cancelled += 1;
        break;
    }
  }

  return {
    total: items.length,
    running,
    queued,
    active: running + queued,
    succeeded,
    failed,
    cancelled,
  };
}

export function buildOutputBasename(outputPath: string): string {
  const normalized = outputPath.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || outputPath;
}

export function formatBuildRelativeTime(
  iso: string | null | undefined,
  now = Date.now(),
): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;

  const diffSec = Math.max(0, Math.floor((now - ms) / 1000));
  if (diffSec < 45) return "только что";
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins} мин назад`;
  }
  if (diffSec < 86400) {
    const hours = Math.floor(diffSec / 3600);
    return `${hours} ч назад`;
  }
  const days = Math.floor(diffSec / 86400);
  if (days === 1) return "вчера";
  if (days < 30) return `${days} дн. назад`;
  return null;
}

export function buildTimeCaption(build: SerializedBuild, now = Date.now()): string {
  switch (build.status) {
    case "RUNNING": {
      const rel = formatBuildRelativeTime(build.startedAt ?? build.updatedAt, now);
      return rel ? `начата ${rel}` : "выполняется";
    }
    case "QUEUED": {
      const rel = formatBuildRelativeTime(build.createdAt, now);
      const lane = build.requiresTranscode ? "перекодирование" : "копирование";
      return rel ? `${lane} · добавлена ${rel}` : `${lane} · в очереди`;
    }
    case "FAILED":
    case "SUCCEEDED":
    case "CANCELLED": {
      const rel = formatBuildRelativeTime(build.finishedAt ?? build.updatedAt, now);
      return rel ?? "завершена";
    }
    default:
      return "";
  }
}

export function queuedPosition(
  build: SerializedBuild,
  allItems: SerializedBuild[],
): number | null {
  if (build.status !== "QUEUED") return null;
  const queued = sortBuildsForQueue(allItems).filter(
    (b) =>
      b.status === "QUEUED" &&
      b.requiresTranscode === build.requiresTranscode,
  );
  const index = queued.findIndex((b) => b.id === build.id);
  return index >= 0 ? index + 1 : null;
}
