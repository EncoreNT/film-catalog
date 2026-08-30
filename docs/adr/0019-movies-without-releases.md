# ADR-0019: Movies without releases

- **Status:** Accepted
- **Date:** 2026-08-28

## Context

ADR-0001 split Movie (work) from Release (file), but the catalog still treated a
movie as inseparable from at least one release:

- deleting the last release called `deleteMovie`
- `AddMovieForm` always posted a nested `release`, often with a null `filePath`,
  which created phantom rows
- empty movies had no first-class catalog state

The user needs a work-level card (title, year, cover, genres, rating, franchise)
that can exist before any file is attached, then add a ready MKV or assemble one
from a BDMV folder.

## Decision

A movie with zero `Release` rows is a valid state. Catalog lists hide it by
default (`releases: { some: {} }`). Query param `emptyReleases=true` shows only
those cards. Direct `/movies/[slug]` always works.

Deleting a release never deletes the movie. Phantom releases
(`filePath` null or blank) are purged by a data migration and must not be
created again. The movie row is the placeholder for «no file yet».

## Consequences

**Плюсы:**

- Work metadata survives last-file removal and BDMV remux workflows
- Catalog grid stays file-backed unless the user asks for empty cards

**Минусы / trade-offs:**

- Search does not surface empty movies unless the empty filter is on
- Quality facets ignore movies with no releases

**Follow-ups:** Prisma data migration `purge_phantom_releases`, catalog query
filter, create-form without nested release, UI empty-state, `.cursor/rules/`
updates.
