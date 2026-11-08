# ADR-0025: Shared transfer ETA across strip and dialog

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

ADR-0024 stabilizes the calculation, but mounting a separate estimator in each view
restarts its warmup whenever the transfer strip is replaced by the details dialog.
Minute-only rounding also conceals useful progress near completion.

## Decision

Retain the estimator, smoothing, freshness and completion rules from ADR-0024.
Own `useMediaJobEtaLabel` in the persistent `useReleaseMoveJob` and
`useReleaseExportJob` hooks. Pass the ready label to both the strip and its dialog.
Opening or closing details must not change the estimator's lifetime. Queue cards
remain independent observers; no global cache or additional polling is introduced.

Display hours, minutes and seconds rounded to ten seconds (minimum ten seconds).
This is presentation precision, not a promise of accuracy. Other callers keep the
formatter's existing default precision. Share the progress readout between strip
and dialog so percent, transferred bytes, speed and ETA stay grouped consistently.

## Consequences

**Benefits:** details open immediately with the same estimate; no warmup caused by
changing presentation, no worker restart or database changes.

**Trade-offs:** navigating away from the movie still resets its local estimator.
Fresh/stale transitions and new jobs still require warmup, intentionally. Independent
queue observers may differ during warmup. Copy ETA excludes final filesystem and
catalog work, which continues to use a phase label.
