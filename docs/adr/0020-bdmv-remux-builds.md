# ADR-0020: BDMV remux via ReleaseBuild

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

BDRemux folders are a `BDMV` tree (`PLAYLIST/*.mpls`, `STREAM/*.m2ts`). The
scanner would otherwise ingest each `.m2ts` as a separate draft. The user wants
to mux a playlist into an MKV with existing tools (`mkvmerge`, `ffprobe`) and
the durable build worker (ADR-0006), including choosing which tracks to copy.

A new job table would duplicate queue, progress, cancel, and `/builds` UI.
ffmpeg `-f bluray` needs libbluray. Picking the largest `.m2ts` breaks split
titles.

## Decision

Extend `ReleaseBuild` with `kind` (`recipe` | `bdmv`, default `recipe`) and
optional `moviePartId`. BDMV jobs store playlist/root as `ReleaseBuildSource`
rows (`bdmv-playlist`, `bdmv-root`) and selected tracks as `ReleaseBuildTrack`
with `sourceReleaseId` null, `sourceFilePath` pointing at the `.mpls`, and
`sourceStreamIndex` equal to the mkvmerge track id from `mkvmerge -J`.

Inspect uses a local `.mpls` parser for duration/clips plus `mkvmerge -J` on
the chosen playlist. Mux is stream copy:

```
mkvmerge -o out.mkv --no-date --gui-mode --video-tracks … --audio-tracks … PLAYLIST/NNNNN.mpls
```

Chapters stay. No transcode, sync, or mixing other MKVs on this page (that
remains `/builds/new` after a Release exists). At most one RUNNING BDMV job
worker-wide. The scanner skips `BDMV` / `STREAM` / `PLAYLIST` / related dirs.

## Consequences

**Плюсы:**

- Same worker, progress UI, cancel/retry as recipe builds
- HDR/DV preserved via mkvmerge copy
- Track picking without a second muxer

**Минусы / trade-offs:**

- Size estimate from STREAM clips is an upper bound after dropping tracks
- Transcode from a multi-clip playlist is out of scope here

**Follow-ups:** `src/lib/media/bdmv/*`, `src/lib/builds/bdmv-*.ts`, inspect and
enqueue API, `/movies/[slug]/releases/from-bdmv`, scanner skip dirs, rules.
