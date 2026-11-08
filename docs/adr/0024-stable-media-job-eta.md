# ADR-0024: Stable ETA for copy and move jobs

- **Status:** Superseded by ADR-0025
- **Date:** 2026-11-08

## Context

The worker reports throughput over a 12-second sliding window. Dividing the remaining
bytes directly by each reading amplifies bursts into ETA jumps. The UI also restarted
its countdown on every poll, including identical responses, and gave catalog updates
an arbitrary eight-second budget. Heartbeats update `updatedAt` without copying bytes.

## Decision

Keep the worker's current-throughput measurement and persistence unchanged. Compute
ETA through a shared, tested client-side estimator in `lib/media-jobs/job-eta.ts`,
used by strips, dialogs and queue cards through `useMediaJobEtaLabel`.

Smooth the transfer rate with a time-based exponential filter (20-second time constant).
Wait six seconds after the first observation and at least ten seconds since job start
before displaying a numeric estimate. React only to changes in progress, speed or the
byte-progress message; identical polls and heartbeat timestamps are not observations.
Reset on a different job/start timestamp, progress regression, or recovery after stale data.

Between samples, allow a bounded countdown. After 15 seconds without fresh measurements,
replace it with a recalibration label. Zero throughput does not fall back to the lifetime
average. Display minutes instead of seconds; completion/registration uses a phase label,
and same-disk renames have no throughput ETA. Cancellation has no forecast.

## Consequences

**Benefits:** less flicker, no countdown restarted by identical polls, no fictitious
completion budget, no worker restart or schema migration. Existing build ETA formatting
retains its default precision.

**Trade-offs:** estimates need a short warmup whenever a view mounts and react gradually
to sustained changes (about a minute to settle). Independently mounted views can differ
during warmup. The client can detect stale data only after observing it; it cannot
separate an I/O stall from a disconnected poll. The estimate covers copying, not the
unmeasured final flush, filesystem rename or catalog work.
