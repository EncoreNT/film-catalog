# ADR-0012: Scan hash prefix and move detection

- **Status:** Accepted
- **Date:** 2026-07-23

## Context

The scanner must skip unchanged files quickly and detect when a file moved to a new path without re-importing as a duplicate movie.

## Decision

1. **Fast skip:** same `filePath` + `fileSize` + `fileMtime` → skip probe.
2. **Content fingerprint:** when size/mtime change, hash first **16 MiB** (`computeFileHashPrefix` in `file-hash.ts`).
3. **Move detection:** same hash + same size, different path → update existing release path in place (priority: existing at path > moved by hash > new DRAFT).

Hash prefix is a performance trade-off: collision across files with identical first 16 MiB is possible but acceptable for a home catalog.

## Consequences

**Плюсы:** Fast rescans; moved files keep movie/release association.

**Минусы:** Not a full-file checksum; edge-case collision or tail-only changes won't match move heuristic.

**Follow-ups:** Unit tests for `scanner.ts` pure helpers when extracted from Prisma loop.
