# ADR-0026: External storage capacity and catalog usage

**Status:** Accepted
**Date:** 2026-11-08

## Context

The release editor needs to show how much of an external disk is occupied by registered film files. The disk may be offline, and its other contents are unknown. Capacity on the manufacturer's label uses decimal units, whereas existing file-size displays use powers of 1024.

## Decision

- Store optional `ExternalStorage.capacityBytes` as integer bytes, following the existing SQLite `Release.fileSize` convention. Validate positive safe integers at the API boundary. `null` means unknown, never zero capacity. No local-disk capacity entity is introduced.
- Settings accept decimal GB (`10^9`) and TB (`10^12`). A labelled 2 TB equals 2,000,000,000,000 bytes, approximately 1.82 TiB. Unit switching preserves the byte amount. The shared formatter's explicit `binary` mode labels GiB/TiB correctly without changing existing display modes.
- `lib/storages/storage-crud.ts` groups `Release.fileSize` by `externalStorageId` on each read. Include all movie statuses, count null sizes separately, exclude local files. Read disk metadata and totals in one transaction. No cached or persisted usage totals.
- The shared `StorageUsage` component renders in settings and the release editor only when an external disk is selected. Percentage is known file bytes divided by capacity bytes. The remainder is not described as free space. Unknown capacity has no percentage or fabricated bar. Overflow retains its actual percentage while the bar is capped at 100%.
- Usage reflects saved database state, not unsaved probe results. Refresh picker data on mount, window focus and successful release save. Settings update capacity via `PATCH /api/storages/[id]`.

## Consequences

No filesystem probe is necessary and offline disks remain usable. Other data and filesystem overhead cannot be inferred. Existing disks need their capacity set by the user; names are not parsed to guess a capacity. Unknown file sizes can understate catalog usage and are disclosed alongside the gauge.

## Reference

[Seagate storage capacity measurement standards](https://www.seagate.com/support/kb/storage-capacity-measurement-standards-194563en/).

## Validation

Prisma migration, byte conversion/validation tests, database aggregation tests (including draft/excluded/local releases, assignment changes and nullable capacity), and desktop/mobile browser checks.
