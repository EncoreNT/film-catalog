# ADR-0018: Per-destination-disk copy/move lanes

- **Status:** Accepted
- **Date:** 2026-08-22

## Context

Export and move jobs share one worker (`claimAvailableMediaJobs`). After copy-only jobs became unlimited, several copies to the **same** Windows drive ran in parallel and saturated that disk. The queue itself should stay unlimited (enqueue any number of jobs). Parallelism should follow the destination disk, not a global cap: dump to D: and move to F: at the same time is fine; two jobs to F: must wait on each other.

Builds keep their own lanes (transcode concurrency setting, unlimited remux) and are out of scope.

## Decision

1. **Destination identity** — `destinationDiskKey(targetPath)` in `lib/media-jobs/destination-disk.ts`. WSL/Windows paths (`/mnt/f/...`, `F:\...`) share a key per drive letter (`wsl:F`). Non-Windows destinations share one `local` lane.
2. **One RUNNING job per key** — export and move occupy the same lane. A running export to F: blocks a queued move to F: (any folder on that drive). Jobs to other keys still start.
3. **FIFO across types** — queued export+move are ordered by `createdAt` (then id). The oldest job on a free disk is claimed; later jobs on that disk stay `QUEUED`.
4. **Enqueue unchanged** — no limit on how many jobs can sit in the queue.

## Consequences

**Плюсы:** HDD/USB destinations are not hammered by parallel writers; different disks copy in parallel; export and move share the same physical constraint.

**Минусы / trade-offs:** `queueOrder` is still per-table (no shared reorder UI); claim uses `createdAt` for the mixed export/move FIFO. Non-Windows paths collapse to one `local` lane (conservative). Copy-only builds can still write in parallel with export/move to the same disk.

**Follow-ups:** none required.
