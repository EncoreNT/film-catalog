# ADR-0011: Franchise slot full-replace sync

- **Status:** Accepted
- **Date:** 2026-07-23

## Context

Franchise slots (`FranchiseSlot`) define ordered positions in a series. The editor sends the full slot list on save. Partial PATCH updates would complicate reorder, insert, and clear operations.

## Decision

`syncFranchiseSlots` in [`franchise-slots.ts`](../../src/lib/franchises/franchise-slots.ts) performs **full replace**:

1. `deleteMany` all slots for the franchise.
2. `createMany` from the submitted ordered list.

Slot-to-movie binding uses separate API (`PATCH /api/movies/[id]/franchises/[franchiseId]`) and does not rewrite the whole slot table.

## Consequences

**Плюсы:** Simple server logic; editor state is always authoritative; no orphan slots.

**Минусы:** Loses slot row IDs on every save (IDs are not exposed in UI); concurrent edits last-write-wins.

**Follow-ups:** None unless slot-level metadata (notes, per-slot cover) requires stable IDs.
