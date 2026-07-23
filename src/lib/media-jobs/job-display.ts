import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import { formatFileSizeGB } from "@/lib/shared/format";

export type MediaJobKind = "export" | "move";

const TERMINAL: ReleaseBuildStatus[] = ["SUCCEEDED", "FAILED", "CANCELLED"];

const SHARED_STATUS_META: Record<
  ReleaseBuildStatus,
  { badgeClass: string; failedLabel: string; succeededLabel: string; queuedLabel: string }
> = {
  QUEUED: {
    queuedLabel: "В очереди",
    badgeClass: "border-neural/35 bg-neural/10 text-neural-bright",
    succeededLabel: "Готово",
    failedLabel: "Ошибка",
  },
  RUNNING: {
    queuedLabel: "В очереди",
    badgeClass: "border-accent/35 bg-accent/10 text-accent",
    succeededLabel: "Готово",
    failedLabel: "Ошибка",
  },
  SUCCEEDED: {
    queuedLabel: "В очереди",
    badgeClass: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
    succeededLabel: "Готово",
    failedLabel: "Ошибка",
  },
  FAILED: {
    queuedLabel: "В очереди",
    badgeClass: "border-danger/35 bg-danger/10 text-danger",
    succeededLabel: "Готово",
    failedLabel: "Ошибка",
  },
  CANCELLED: {
    queuedLabel: "В очереди",
    badgeClass: "border-border-strong bg-bg-elevated text-muted",
    succeededLabel: "Готово",
    failedLabel: "Ошибка",
  },
};

const RUNNING_LABEL: Record<MediaJobKind, string> = {
  export: "Копирование",
  move: "Перемещение",
};

export function buildMediaJobStatusMeta(kind: MediaJobKind): Record<
  ReleaseBuildStatus,
  { label: string; badgeClass: string }
> {
  return Object.fromEntries(
    (Object.keys(SHARED_STATUS_META) as ReleaseBuildStatus[]).map((status) => {
      const meta = SHARED_STATUS_META[status];
      let label = meta.queuedLabel;
      if (status === "RUNNING") label = RUNNING_LABEL[kind];
      if (status === "SUCCEEDED") label = meta.succeededLabel;
      if (status === "FAILED") label = meta.failedLabel;
      if (status === "CANCELLED") label = "Отменено";
      return [status, { label, badgeClass: meta.badgeClass }];
    }),
  ) as Record<ReleaseBuildStatus, { label: string; badgeClass: string }>;
}

export function isMediaJobTerminal(status: ReleaseBuildStatus): boolean {
  return TERMINAL.includes(status);
}

export function mediaJobSpeedLabel(
  bytesPerSecond: number | null | undefined,
): string | null {
  if (bytesPerSecond == null || bytesPerSecond <= 0) return null;
  const mibPerSec = bytesPerSecond / (1024 * 1024);
  if (mibPerSec >= 100) return `${Math.round(mibPerSec)} МБ/с`;
  if (mibPerSec >= 10) return `${mibPerSec.toFixed(0)} МБ/с`;
  return `${mibPerSec.toFixed(1)} МБ/с`;
}

export function mediaJobSizeHint(
  sourceFileSize: number | null | undefined,
): string | null {
  return formatFileSizeGB(sourceFileSize);
}
