"use client";

import Link from "next/link";
import type { SerializedBuild } from "@/lib/builds/build-serialize";

const STATUS_LABELS: Record<string, string> = {
  QUEUED: "В очереди",
  RUNNING: "Выполняется",
  SUCCEEDED: "Готово",
  FAILED: "Ошибка",
  CANCELLED: "Отменено",
};

export function BuildJobCard({ build }: { build: SerializedBuild }) {
  return (
    <Link
      href={`/builds/${build.id}`}
      className="surface-card focus-ring block rounded-[var(--radius)] p-4 transition-colors hover:border-accent/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono-tech text-[11px] text-faint">#{build.id}</p>
          <p className="font-medium text-text">{build.movie.title}</p>
        </div>
        <span className="font-mono-tech text-[11px] text-accent">
          {STATUS_LABELS[build.status] ?? build.status}
        </span>
      </div>
      <p className="mt-2 truncate text-sm text-muted">{build.outputPath}</p>
      {build.progressPercent != null && build.status === "RUNNING" ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${Math.round(build.progressPercent)}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
}
