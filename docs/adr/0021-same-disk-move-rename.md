# ADR-0021: Same-disk move via rename

- **Status:** Accepted
- **Date:** 2026-08-30

## Context

ADR-0008 queued every release move as copy-to-`.part` + size check + unlink source. That is required across Windows volumes, but it also ran when the user only rearranged folders on the **same** local or external drive: extra space, extra time, and a UI labelled «Переместить на другой диск».

## Decision

1. **Same disk** = `isSameDestinationDisk(source, target)` via `destinationDiskKey` (same WSL/Windows drive letter, or both non-Windows on the `local` lane).
2. **Same disk** → `fs.rename` of the source onto the target (no `.part`, no second copy, no unlink). If rename throws `EXDEV`, fall back to the existing copy+delete path.
3. **Different disk** → unchanged copy+delete.
4. Same-disk jobs skip the free-space gate (`assertMoveTargetFits` / dialog shortfall). Destination-disk lanes (ADR-0018) still serialize the job.
5. UI: menu/dialog title «Переместить»; dialog defaults to the **current** storage (local or the same external disk), not the opposite one.

## Consequences

**Плюсы:** folder reshuffle on D: or an external disk is instant; cross-volume moves stay safe; user can still switch storage in the picker.

**Минусы / trade-offs:** a same-disk rename still waits if another copy/move already occupies that destination lane; crash between rename and catalog update leaves the file at the new path (same class of window as after a successful copy).

**Follow-ups:** none required. Extends ADR-0008; does not supersede the job queue.
