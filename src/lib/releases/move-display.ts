import type { ReleaseBuildStatus } from "@/generated/prisma/client";
import type { SerializedMove } from "@/lib/releases/move-serialize";
import { formatFileSizeGB } from "@/lib/shared/format";

export const MOVE_STATUS_META: Record<
  ReleaseBuildStatus,
  { label: string; badgeClass: string }
> = {
  QUEUED: {
    label: "В очереди",
    badgeClass: "border-neural/35 bg-neural/10 text-neural-bright",
  },
  RUNNING: {
    label: "Перемещение",
    badgeClass: "border-accent/35 bg-accent/10 text-accent",
  },
  SUCCEEDED: {
    label: "Готово",
    badgeClass: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
  },
  FAILED: {
    label: "Ошибка",
    badgeClass: "border-danger/35 bg-danger/10 text-danger",
  },
  CANCELLED: {
    label: "Отменено",
    badgeClass: "border-border-strong bg-bg-elevated text-muted",
  },
};

const TERMINAL: ReleaseBuildStatus[] = ["SUCCEEDED", "FAILED", "CANCELLED"];

export function isMoveTerminal(status: ReleaseBuildStatus): boolean {
  return TERMINAL.includes(status);
}

export function moveSpeedLabel(bytesPerSecond: number | null | undefined): string | null {
  if (bytesPerSecond == null || bytesPerSecond <= 0) return null;
  const mibPerSec = bytesPerSecond / (1024 * 1024);
  if (mibPerSec >= 100) return `${Math.round(mibPerSec)} МБ/с`;
  if (mibPerSec >= 10) return `${mibPerSec.toFixed(0)} МБ/с`;
  return `${mibPerSec.toFixed(1)} МБ/с`;
}

export function moveSizeHint(job: SerializedMove): string | null {
  return formatFileSizeGB(job.sourceFileSize);
}
