# ADR-0005: Tier-driven ambient spotlight

- **Status:** Accepted
- **Date:** 2026-07-15

## Context

The `AmbientBackground` (mounted once in the root layout, `fixed` behind everything)
painted a single flat "projector beam": a tilted rectangle with a hard `linear-gradient`
and `blur(8px)`. Two problems:

1. It read as a **geometric rectangle**, not as light — no cone, no volume, no soft
   falloff.
2. The color was a fixed warm gold everywhere, even though the catalog already has a
   **release-tier vocabulary** (`releaseTier` → ruby / gold / null in
   `lib/media/release-tags.ts`). Entering a ruby film's page felt identical to a
   standard film's page, so the tier never reached the room.

The tier only changes on navigation (a page's tier is server-derived and fixed for that
page), never in-place on a mounted page.

## Decision

Replace the flat beam with a **volumetric projector cone** whose color is driven by the
current page's tier, via a `data-spotlight` attribute on `<html>`:

- `AmbientBackground` (`components/layout/AmbientBackground.tsx`) renders three layered
  shafts (diffuse body `.spotlight-cone`, hot core `.spotlight-core`, source flare
  `.spotlight-source`) carved into a cone silhouette by a radial `mask` — feathered
  edges, no hard rectangle. Colors come from `--spotlight-*` CSS tokens, so the whole
  cone + the glow hotspots + the fine grid tint recolor together.
- A tiny client component `SpotlightTier` (`components/layout/SpotlightTier.tsx`) sets
  `document.documentElement.dataset.spotlight` in `useEffect` and resets it to
  `"general"` on unmount. The root layout mounts a `tier="general"` baseline; tiered
  pages mount their own on top, so non-tiered pages fall back to the neutral glow.
- Tier → spotlight mapping:
  - Movie page (`app/movies/[slug]/page.tsx`): `movieSpotlightTier(movie.releases)` —
    best tier across releases (ruby > gold > standard).
  - Franchise page (`app/franchises/[slug]/page.tsx`): best tier among filled slots.
  - Everywhere else: `general`.
- Four palettes in `globals.css`, selected by `html[data-spotlight="…"]`:
  - `general` — cool coal moonlight (deliberately not a tier color, so idle pages read as
    the projection room, not a random gold/white).
  - `gold` — warm cinematic beam (the classic Кинозал gold).
  - `ruby` — saturated garnet/crimson (the `--crimson` family), tuned so the hot core
    stays a bright red rather than washing to pink over the cool coal base.
  - `standard` — crisp cool white/silver.
- The `--spotlight-*` tokens are registered with `@property` as `<color>` and transition
  on `:root` (700ms `--ease`), so tier changes crossfade smoothly where the browser
  supports it and snap where it does not. Both are acceptable because the tier only
  changes on navigation.

## Consequences

**Плюсы:** The spotlight finally reads as light (cone + volume + soft edges), and the
whole ambient recolors per tier — a ruby film's page is bathed in ruby, gold in gold,
standard in white, and idle pages stay in a distinct neutral coal. The mechanism is
cheap: the cone is static (no animation), only the drifting glow hotspots move, and the
tier switch is a single attribute change + CSS-var crossfade. The background stays
mounted in the root layout, so there is no remount flash between pages.

**Минусы / trade-offs:** `@property` transitions are not supported everywhere (older
Safari / Firefox < 128); there the color snaps, which is fine but not animated.
Chromium's `getComputedStyle` returns the base (un-transitioned) value for registered
custom properties under transition, so the resolved var can read as `general` even when
the paint is `ruby` — debugging must rely on the visual, not `getComputedStyle`. The
tier signal is a global DOM attribute set from a client effect, so any future page that
wants a tier must remember to render `<SpotlightTier/>` (non-tiered pages are the
`general` default by design).

**Follow-ups:** Documented in `.cursor/rules/04-nextjs-ui.mdc` (spotlight + tier
section). If a release-tab switch should recolor the spotlight live (without
navigation), the movie page would need to pass the active release's tier to
`SpotlightTier` as client state — out of scope for now.
