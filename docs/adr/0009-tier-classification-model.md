# ADR-0009: Tier classification model (ruby / gold / standard)

- **Status:** Accepted
- **Date:** 2026-07-23

## Context

Release quality tiers (ruby, gold, standard) drive catalog ribbons, franchise slot quality, archive metrics, build cards, and filter rails. Logic lived in `release-tags.ts` but was duplicated in `build-visual-tier.ts`, `catalog-spotlight.ts`, and `archive-quality-metrics.ts`.

ADR-0005 documents **how tiers are shown** (ambient spotlight). It does not define **how tiers are computed**.

## Decision

Centralize shared tier predicates in [`src/lib/media/tier-core.ts`](../../src/lib/media/tier-core.ts):

- **Per-release computation** remains in `releaseTier()` (`release-tags.ts`).
- **Catalog filter → spotlight** uses `resolveCatalogFilterSpotlightTier()` (any non-SDR HDR in URL, not only `HDR_ANY`).
- **Archive quality rail toggles** use `matchesCatalogGoldFilter` / `matchesCatalogRubyFilter` (exact `HDR_ANY` param).
- **Planned build tier** uses `inferTierFrom4kHdrAndAudioTracks()` (same rules as `releaseTier` on explicit track list).
- **Spotlight priority ladder** uses `maxSpotlightTier()` / `maxReleaseTier()`.

### Rules (unchanged from code)

- **Ruby** — 4K + any HDR + best Russian **dub** with spatial profile (Atmos / DTS:X MA) and ≥ 8 channels.
- **Gold** — 4K + any HDR + main/surround track with ≥ 6 channels (language not required for gold).
- **Standard** — everything else (`releaseTier` → `null`; franchise slots use explicit `"standard"`).

### Computation → spotlight mapping

| Release tier | Spotlight on movie page |
|---|---|
| ruby | ruby |
| gold | gold |
| null (standard) | **general** (coal, not white) |

Slot tier `"standard"` maps to white `standard` spotlight (franchise hover).

## Consequences

**Плюсы:** Single module for filter combos and priority ladders; less drift between build/catalog/archive.

**Минусы:** Two HDR semantics coexist (any HDR for spotlight vs exact `HDR_ANY` for gold rail) — documented here intentionally.

**Follow-ups:** Tests in `tier-core.test.ts`; update `.cursor/rules/05-domain-pipelines.mdc`.
