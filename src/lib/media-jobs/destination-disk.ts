import { wslDriveFromPath } from "@/lib/shared/wsl-drive-mount";

export type CopyJobCandidate = {
  kind: "export" | "move";
  id: number;
  targetPath: string;
  createdAt: Date;
};

/** Identity of the destination disk for copy/move serialization. */
export function destinationDiskKey(targetPath: string): string {
  const drive = wslDriveFromPath(targetPath);
  if (drive) return `wsl:${drive.letter}`;
  return "local";
}

/**
 * At most one copy/move job per destination disk. Older jobs win.
 * Occupied keys (already RUNNING) stay blocked; later jobs on free disks still start.
 */
export function selectClaimableCopyJobs(
  queued: CopyJobCandidate[],
  occupiedDisks: ReadonlySet<string>,
): CopyJobCandidate[] {
  const occupied = new Set(occupiedDisks);
  const selected: CopyJobCandidate[] = [];
  const ordered = [...queued].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id - b.id,
  );

  for (const job of ordered) {
    const key = destinationDiskKey(job.targetPath);
    if (occupied.has(key)) continue;
    occupied.add(key);
    selected.push(job);
  }

  return selected;
}
