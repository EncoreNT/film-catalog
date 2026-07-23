# ADR-0010: Unified media jobs worker

- **Status:** Accepted
- **Date:** 2026-07-23

## Context

The app runs three durable background job types: MKV builds (`ReleaseBuild`), TV export (`ReleaseExport`), and release move (`ReleaseMove`). Each has its own queue table and runner, but a single worker script claims jobs via `claim-next-media-job.ts`.

Export and move shared ~90% of display, progress, and copy-loop code in parallel files.

## Decision

1. **Shared lib domain** [`src/lib/media-jobs/`](../../src/lib/media-jobs/): `job-display`, `job-progress-message`, `part-path`, `file-exists`, `serialize-base`.
2. **Thin domain wrappers** in `releases/export-*` and `releases/move-*` re-export or delegate to `media-jobs`.
3. **Worker priority** (unchanged): build transcode lane → build remux lane → export → move, via `claim-next-media-job.ts`.

## Consequences

**Плюсы:** One formatter for speed labels, status badges, progress strings; atomic part-file path naming.

**Минусы:** Move runner still owns post-copy DB update and source unlink — export/move runners are not fully merged.

**Follow-ups:** Optional `job-runner-base.ts` if a third copy-only job type appears.
