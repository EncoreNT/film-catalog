# ADR-0002: External storage only (null = local disk)

## Status

Accepted

## Context

Releases had a `storageId` FK to a `Storage` table with `LOCAL` and `EXTERNAL` types. The UI created a placeholder row «Локальный диск» for local files. That row had no real meaning (one fake entity for all local paths) and was inconsistent: scans without «внешний диск» left `storageId` null anyway.

## Decision

- Replace `Storage` + `StorageType` with **`ExternalStorage`** — only named external drives live in the DB.
- **`Release.externalStorageId`**: `null` = file on local disk; non-null = FK to `ExternalStorage`.
- Migration: copy `EXTERNAL` rows → `ExternalStorage`; set `externalStorageId = null` for releases on `LOCAL` storage; drop `Storage`.
- UI: `StoragePicker` unchanged in UX (local vs external toggle); local resolves to `null`, external picks/creates `ExternalStorage` via `/api/storages`.
- Scan page uses the same picker instead of free-text drive name.
- Display: local releases show label «Локальный диск» when `filePath` is set (no DB row).

## Consequences

**Плюсы:** no fake LOCAL rows; semantics match user mental model; one external-drive catalog reusable across scan/add/edit.

**Минусы:** breaking rename `storageId` → `externalStorageId` in API payloads; existing LOCAL links cleared (they carried no useful identity).

**Follow-up:** optional `ExternalStorage.path` for mount hints; filter catalog by external drive.
