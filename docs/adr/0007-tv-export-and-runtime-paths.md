# ADR-0007: TV export and runtime paths

- **Status:** Accepted
- **Date:** 2026-07-17

## Context

The app runs on WSL while the browser often runs on Windows. Release files live at absolute WSL paths (`/mnt/d/...`), but users think in Windows drive letters (`D:\...`). The user wants to copy TV-ready releases to a shared folder, filter/catalog-badge such releases, suggest build output names, show free disk space, and optionally delete a release together with its file.

## Decision

1. **Runtime paths in DB, Windows display in UI** — extend `display-path.ts` with `resolveRuntimePath()`; store `mediaSaveDir` in `Setting` as WSL/runtime path; show Windows form via `displayFilePath()`.

2. **TV-ready predicate** — MKV + H.264/HEVC video + main Russian track (default among Russian tracks, else first Russian) with codec AC-3 / E-AC-3 / AAC. Used for export button visibility, catalog filter, and card badge.

3. **Export is copy-only** — `POST .../export` copies file to `mediaSaveDir`; does not create a new `Release`. On collision, dry-run returns a suffixed filename; user confirms/edits name before copy.

4. **Delete with file** — two-step UI; API `DELETE ?deleteFile=true` unlinks file then deletes DB row. Missing file is non-fatal with warning.

5. **Build UX** — `suggestBuildOutputPath()` prefills output path from `mediaSaveDir`; `GET /api/disk-space` uses `fs.statfs` on WSL mounts.

## Consequences

**Плюсы:** Single path layer; TV workflow without leaving browser; reuse of one save folder for export and builds.

**Минусы / trade-offs:** Catalog `tvReady` Prisma filter is an approximate superset of runtime predicate; large file copy blocks HTTP request; `statfs` on `/mnt/*` may be slow.

**Follow-ups:** Optional progress for export; spotlight tier for TV filter if desired.
