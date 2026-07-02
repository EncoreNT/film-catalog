# ADR-0001: Movie / Release split

## Status

Accepted

## Context

The catalog originally stored one video file as one `Movie` row. Duplicate qualities of the same film (e.g. 4K BDRemux + 1080p BDRip) appeared as separate catalog cards, linked only by a runtime heuristic (`title + year`) on the detail page.

Goals:

- One catalog card per film (work-level metadata)
- Multiple releases (file-level specs) per film
- Rating, genres, franchises, cover at the **Movie** level
- Manual merge confirmation when duplicates are detected (variant C)

## Decision

### Entities

- **Movie** — work-level: `slug`, `title`, `year`, `description`, `matchKey`, `status`, `coverPath`, `rating`, `watchedAt`, genres, franchise slots
- **Release** — file-level: `filePath`, `fileSize`, `fileMtime`, `fileHash`, `storageId`, `releaseType`, `version`, `durationSeconds`, tracks (video/audio/subtitles)

### Duplicate detection

- `matchKey = normalize(title) + "|" + (year ?? "")` stored on Movie
- Scanner always creates a new Movie+Release per file (does not auto-merge)
- Movies sharing a `matchKey` surface as merge candidates on the detail page and `/duplicates`

### Merge

- User picks canonical Movie; all releases from both are re-parented
- Genres and franchise slots are merged with dedup
- Cover transfers to canonical only if canonical has none
- Other Movie row is deleted

### Catalog card

- One card per Movie
- Badges from **primary release** (`pickPrimaryRelease`: resolution → HDR → premium audio → release type)
- Indicator `×N релизов` when N > 1

### Detail page

- Release tabs via `?release=<id>` switch video/audio/subtitles/file sections
- Rating/watched at Movie level, placed near the header

## Consequences

- Scanner creates separate DRAFT Movies for same-title files; user merges manually
- Sort by duration uses `createdAt` as proxy (SQLite/Prisma cannot order Movie by max release duration without denormalization)
- Cover files remain `covers/<movieId>.ext` at Movie level
- Franchise slots and metrics use primary release specs

## Migration

`20260702120000_movie_release_split`: each existing Movie → 1 Movie + 1 Release; tracks re-parented to `releaseId`; `matchKey` backfilled. Existing duplicates not auto-merged.
