# ADR-0004: Cinematic Tech design system

- **Status:** Accepted
- **Date:** 2026-07-14

## Context

The UI evolved organically from a plain dark admin look into a distinct
"Cinematic Tech" (internally *neurox-tier*) visual language: a cool-coal
projection-room console with machined double-bezel cards, instrument-style
spec plaques, laser/holo/sheen flourishes, an ambient projector-beam layer,
and a Ruby/Gold release-tier system that carries the "how premium is this
release" signal separately from resolution.

By 2026-07 the language was already implemented across the catalog, movie
detail console, release plaques, and release editor, but it was **not
documented as a system**:

- `.cursor/rules/04-nextjs-ui.mdc` was stale — it referenced Inter (the UI
  font is Manrope), `--radius: 14px` (it is 16px), and "warm coal" (the base
  is cool coal), and omitted neural-violet, cyan, crimson, ember, the tier
  system, plaques, the machined card, motion, and reduced-motion policy.
- Tokens, effect classes, and tier logic lived only in `globals.css` and
  `lib/media/release-tags.ts`; a new contributor (human or AI) had to
  reverse-engineer the system from CSS.
- There was no statement of *why* this look was chosen or the rules for
  extending it, so future changes risked drifting away from it (e.g. using
  crimson for non-tier decoration, adding constant shimmer to working forms,
  or hardcoding hex in components).

Goal: fixate the current colors, surfaces, effects, tier system, motion, and
component language as the project's design system with a single source of
truth, so it stays consistent and self-documenting.

## Decision

Adopt the **Cinematic Tech / neurox-tier** design system as the project's
visual language, documented in `docs/design-system.md` with
`src/app/globals.css` as the token source of truth.

### Palette

Cool-coal base (`--bg-deep #0b0a0f` … `--bg-elevated #1a1822`, glass
`--bg-surface rgba(170,162,210,0.13)`) — slightly cool so the tech glow reads
against it. Accents by role, not by mood:

- **Gold** (`--accent #e8b05a`) — primary, projector beam, active states, 4K.
- **Neural violet** (`--neural #8b5cf6`) — AI/tech secondary.
- **Cyan** (`--cyan #38bdf8`) — laser/scan highlight.
- **Crimson** (`--crimson #c43d5a`, slightly desaturated) — **Ruby tier only**,
  never danger/decoration.
- **Ember** (`--ember #c87038`) — warm counter-balance in ambient/laser gradients.
- **Danger** (`--f87171`) / **Success** (`--5eead4`) — status only.

All colors are CSS variables in `:root`, exposed to Tailwind via `@theme
inline`. Hardcoded `#hex`/`rgba()` lives only inside `globals.css` for
composite effects.

### Surfaces

- `surface-card` (glass) / `surface-elevated` (solid) / `surface-glass`
  (premium) — base surfaces.
- **Double-bezel "machined card"** is the card language: outer translucent
  tray + inner machined core (`spec-plaque-core`). Two intensities: full
  cinematic for spec plaques (`gradient-border-cinematic` + holo + lens +
  staggered entrance), calm static for working forms (`MachinedCard` +
  `gradient-hairline`, no `overflow-hidden` so `Select` dropdowns escape).
- `poster-frame` — double-bezel poster tray with gold→neural top-edge glow.

### Tier system

`ReleaseTier = "ruby" | "gold" | null` (`lib/media/release-tags.ts`,
`releaseTier()`). Ruby = 4K + any HDR + Atmos ≥ 7.1 on the best Russian dub
track; Gold = 4K + any HDR + surround ≥ 5.1 on the main track. Ruby > Gold.
Tier is **separate from resolution**: it colors the release tab (text,
sliding underline, tag, glow — faded on inactive tabs) and the card framing
(`glow-card-ruby/gold`, `tier-laser-top-ruby/gold`, `holo-ruby/gold`,
`gradient-border-ruby`). Resolution gets its own accent scale on the plaque
(4K full gold + halo, 1080p muted gold, 720p/SD neutral).

### Effects & motion

A flourish layer (`gradient-border-cinematic`, `gradient-hairline`,
`sheen-layer`, `holo-foil/-gold/-ruby`, `lens-flare`, `projector-beam`,
`laser-trace`/`-cyan`, `LaserCardFrame`) plus explicit glow-shadow classes
(`glow-accent-*`, `glow-neural-*`, `glow-crimson-*`, `glow-card-*`, etc.) —
defined as classes because Tailwind v4 in this project unreliably generates
arbitrary `box-shadow` with `var()`/`rgba()`/`#hex`. Motion uses `--ease`
(`cubic-bezier(0.16,1,0.3,1)`) and `motion/react` for sliding tab underlines.
A global `@media (prefers-reduced-motion: reduce)` block neutralizes every
effect to a calm static state.

### Component language

Reuse-first: `components/primitives/` is the inventory (Button, Field, Select,
Modal, MachinedCard, LaserCardFrame, PageHeader, …). Section headers use the
`PageHeader`/`CardSectionHeader` pattern (mono-tech gold eyebrow + display
title). Forms use `MachinedCard` + `CardSectionHeader` + `FormActionBar`, not
flat `surface-card` sections.

### Documentation

- `docs/design-system.md` — the detailed guide (this ADR's operational
  counterpart).
- `.cursor/rules/04-nextjs-ui.mdc` — corrected concise AI spec pointing to the
  guide and this ADR.

## Consequences

**Плюсы:**

- One source of truth for the visual language; new contributors (and AI)
  implement in-style without reverse-engineering CSS.
- Tier system is explicit and decoupled from resolution, so "premium" reads
  at a glance and stays meaningful as codecs evolve.
- Reduced-motion policy is centralized — accessibility stays consistent as
  effects are added.
- Reuse-first component language reduces duplication (Button/Modal/card
  shells) and keeps forms from drifting to a generic admin look.

**Минусы / trade-offs:**

- Effect classes are bespoke (not Tailwind utilities) — adding a new glow
  size means editing `globals.css`, not writing a utility. Accepted: keeps
  glow values curated and consistent.
- The full-cinematic treatment (animated borders, holo, lens) is reserved for
  plaques/hero; using it on working forms would be noisy. Discipline required
  to pick the calm variant (`gradient-hairline`, `MachinedCard`) for forms.
- Crimson is locked to Ruby tier — any new "urgent/red" need must use
  `--danger`, not crimson.

**Follow-ups:**

- Keep `docs/design-system.md` and `04-nextjs-ui.mdc` in sync with
  `globals.css` when tokens/classes change (treat the guide like code: update
  in the same change).
- If the tier criteria change (new audio format, HDR variant), update
  `releaseTier()` and the guide's §6.1 together; consider a new ADR if the
  tier *meaning* changes.
- Audit `components/` periodically for duplicated card/button/modal shells and
  fold them back into primitives.
