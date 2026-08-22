# ADR-0017: HDR10+ as overlay flag

- **Status:** Accepted
- **Date:** 2026-08-21

## Context

`VideoTrack.hdr` stores a single format string (`HDR10`, `HDR10+`, `DV:P8`, …).
Dolby Vision Profile 8 is HDR10-compatible and often carries a second layer of
HDR10+ SEI (`SMPTE 2094-40`). The scanner used to stop at the DOVI configuration
record, so dual rips (e.g. Alita) were stored as DV 8.1 and never tagged HDR10+.

The catalog is used with a Samsung TV: OSD shows HDR10+ when that SEI is present,
and generic HDR for static HDR10 and for DV without the plus layer. Catalog
badges should answer the TV question; the file format still belongs on the
release detail.

## Decision

1. Keep `VideoTrack.hdr` as the bitstream format (DV profile, HDR10, HDR10+, HLG).
2. Add `VideoTrack.hasHdr10Plus` for ST 2094-40 / dual-layer presence. Do not
   overwrite DV with HDR10+.
3. Probe: DOVI side data still wins for `hdr`. HDR10+ is only ST 2094-40 SEI
   (frames, or rarely stream side data / `hdr10+` tags).
   `dv_bl_signal_compatibility_id` is BL compatibility (1 = HDR10, 6 = UHD
   Blu-ray HDR10), not HDR10+. Pure HDR10 with plus SEI is stored as
   `hdr = HDR10+`.
4. Catalog / franchise badges: `HDR10+` or `HDR`. Detail plaque: HDR10+ is the
   hero label when the flag is set; file format (DV 8.1 / HDR10) is the subtitle.
5. Existing files are not re-probed on scan skip (same size+mtime). A `/dev`
   tool re-probes HDR/DV releases and writes the flag.

## Consequences

**Плюсы:** Dual rips match what Samsung shows; DV profile is preserved for
builds and the detail page.

**Минусы / trade-offs:** Extra ffprobe of 1–2 frames for HDR files without a
stream-level plus signal; `/dev` is a manual backfill, not an automatic rescan.

**Follow-ups:** `/dev` HDR10+ rescan; catalog filter chip `HDR10+`; archive rail
counts `hasHdr10Plus`.
