# ADR-0013: Remake groups without dedicated pages

- **Status:** Accepted
- **Date:** 2026-07-29

## Context

The catalog stores one `Movie` per cinematic work (title + year). Some works exist in multiple versions: remakes, reimaginings, reboots, adaptations (e.g. Danish "The Guilty" 2018 vs American remake 2021, or animated "The Lion King" vs photorealistic remake).

Existing grouping mechanisms do not fit:

- **Franchise + FranchiseSlot** models story chronology with ordered slots and future placeholders. Remakes are not sequential saga entries.
- **`matchKey`** (`title|year`) detects accidental duplicates for merge, not related works with different years.
- **`Release.version`** is an alternate cut within one movie (director's cut), not a separate film.

We need a lightweight way to link related movies with role semantics, visible on the movie page and catalog card, without full franchise-style list/detail/edit pages.

## Decision

Introduce **RemakeGroup** + **RemakeMember** with enum **RemakeRole** (`ORIGINAL`, `REMAKE`, `REIMAGINING`, `REBOOT`, `ADAPTATION`).

- Each member links one `Movie` to one group with a role. `movieId` is required (no placeholder slots).
- Groups have `name`, `slug`, optional `description`. No cover in v1 (no dedicated page to display it).
- **No** `/remakes` routes or list/detail pages. Groups appear only as a section on each member movie's detail page and as a role badge on catalog cards.
- Movie-side API mirrors franchises: attach/create group, change role, detach. Group-side API provides lite list for the edit picker.
- When the last member is removed, the group is auto-deleted. A single-member group is allowed (pending state; detail section hidden until co-members exist).
- Catalog loads remake badges via one batch query per page (`getCatalogRemakeBadges`) to avoid N+1.

## Consequences

**Плюсы:**

- Clear semantics separate from franchises and duplicate merge
- Minimal UI surface: section on movie page + badge on card + picker on edit
- Reuses established patterns (slug, include, attach API, zod validators)

**Минусы:**

- Another entity to maintain alongside franchises
- No group overview page (user navigates via linked movies only)
- Cover and group-level editing deferred to future if needed

**Follow-ups (optional):**

- Filter «есть связанные версии» in catalog
- Group cover if a dedicated page is added later
