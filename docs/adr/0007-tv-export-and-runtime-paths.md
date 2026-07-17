# ADR-0007: TV export and runtime paths

- **Status:** Accepted
- **Date:** 2026-07-17

## Context

The app runs on WSL while the browser often runs on Windows. Release files live at absolute WSL paths (`/mnt/d/...`), but users think in Windows drive letters (`D:\...`). The user wants to copy TV-ready releases to a shared folder, filter/catalog-badge such releases, suggest build output names, show free disk space, and optionally delete a release together with its file.

## Decision

1. **Runtime paths in DB, Windows display in UI** — extend `display-path.ts` with `resolveRuntimePath()`; paths entered or picked in the UI are stored as WSL/runtime paths; show Windows form via `displayFilePath()`.

2. **TV-ready predicate** — MKV + H.264/HEVC video + main Russian track (default among Russian tracks, else first Russian) with codec AC-3 / E-AC-3 / AAC. Used for export button visibility, catalog filter, and card badge.

3. **Export is copy-only via job queue** — `POST .../export` enqueues `ReleaseExport` job with user-chosen `targetDir`; worker copies file with progress. Does not create a new `Release`. On collision, dry-run returns a suffixed filename; user picks folder and confirms/edits name before enqueue. Same worker as builds (`scripts/release-build-worker.ts`), FIFO by `createdAt` across job types.

4. **Delete with file** — two-step UI; API `DELETE ?deleteFile=true` unlinks file then deletes DB row. Missing file is non-fatal with warning.

5. **Build UX** — `suggestBuildOutputPath()` prefills output path in the same directory as the video source release file; `GET /api/disk-space` uses `fs.statfs` on WSL mounts.

6. **Per-export folder picker** — no global save folder setting; export dialog uses `POST /api/pick-directory` (native OS folder dialog → Win path → WSL runtime path).

## Consequences

**Плюсы:** Single path layer; TV workflow without leaving browser; destination chosen per export, no global config.

**Минусы / trade-offs:** Catalog `tvReady` Prisma filter is an approximate superset of runtime predicate; export and builds share one worker (concurrency 1); `statfs` on `/mnt/*` may be slow; native folder picker requires GUI on the host (PowerShell/osascript/zenity).

**Follow-ups:** Optional `/exports` list page; spotlight tier for TV filter if desired.
