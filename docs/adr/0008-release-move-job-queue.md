# ADR-0008: Release move job queue

- **Status:** Accepted
- **Date:** 2026-07-22

## Context

Users manually drag MKV files to external drives in Windows, then edit the release record (path + external storage). Export (ADR-0007) copies TV-ready files without updating the catalog. A dedicated move workflow is needed: relocate the file, update `Release.filePath` and `externalStorageId`, delete the source.

## Decision

1. **`ReleaseMove` job queue** — same status/progress model as `ReleaseExport`; worker copies to target, verifies size, updates release metadata, unlinks source (best-effort warning if unlink fails).
2. **UI** — release menu item «Переместить на другой диск»; dialog with `StoragePicker`, folder picker, filename; progress strip under release tabs.
3. **Guards** — block when no `filePath`, active move/export on release, or active build referencing release as source.
4. **No TV-ready gate** — any release with a file path can be moved (unlike export).

## Consequences

**Плюсы:** replaces manual Win drag + edit; atomic catalog update after verified copy; reuses copy worker infrastructure.

**Минусы:** another job type in shared worker; cross-volume move is copy+delete (not instant rename); orphan `.part` on crash handled like export.

**Follow-up:** optional moves in global media-jobs dock; remember last move target per storage.
