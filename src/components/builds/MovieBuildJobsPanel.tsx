"use client";

import Link from "next/link";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { sortBuildsForQueue } from "@/lib/builds/build-queue-display";
import { BuildJobCard } from "@/components/builds/BuildJobCard";

export function MovieBuildJobsPanel({
  movieSlug,
  builds,
}: {
  movieSlug: string;
  builds: SerializedBuild[];
}) {
  if (builds.length === 0) return null;

  const sorted = sortBuildsForQueue(builds);

  return (
    <div className="surface-card rounded-[var(--radius)] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono-tech text-[11px] uppercase text-faint">сборки</p>
        <Link href={`/builds?movieId=${builds[0]?.movieId}`} className="text-xs text-accent">
          Все
        </Link>
      </div>
      <div className="space-y-2">
        {sorted.slice(0, 3).map((build) => (
          <BuildJobCard key={build.id} build={build} allItems={sorted} compact />
        ))}
      </div>
      <Link
        href={`/movies/${movieSlug}/builds/new`}
        className="mt-3 inline-block text-sm text-accent hover:underline"
      >
        Собрать новый релиз
      </Link>
    </div>
  );
}
