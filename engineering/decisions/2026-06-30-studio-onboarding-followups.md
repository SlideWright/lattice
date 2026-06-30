---
status: shipped
summary: Three follow-ups to the Studio newcomer onboarding (2026-06-30-studio-newcomer-onboarding.md), shipped together as one cohesive "onboarding polish" PR. (1) Essentials-by-default — a newcomer's topbar drops the advanced cluster (Library, Workspace settings, the Focus button, the Fabricate launcher item) until they engage, then it reveals on graduation. (2) The welcome deck is now offered to pre-existing users via a one-time, deletable migration that appends it to their deck index (append, not prepend, so it never hijacks the active deck). (3) The deck Inspector gets a gentle one-time pulse on the toolbar toggle after the Coach reveals (first edit) — discovery without the confusing auto-open-on-slide-click that the parent doc rejected.
---

# Studio onboarding follow-ups — essentials topbar, welcome-for-returning, Inspector nudge

*2026-06-30*

## Context

The newcomer onboarding (`2026-06-30-studio-newcomer-onboarding.md`) shipped the
core: a welcome starter deck, reduced-density first run (panels closed), a
one-time welcome cue, Coach-on-first-edit, and remembered graduation. It left
three explicit follow-ups. This change does all three — they're cohesive
("onboarding polish") and independent of each other, so one PR is appropriate
(not a stacked chain; HARD RULE #17 holds).

## What shipped

### 1. Essentials by default — trim the newcomer's topbar
The panels were already reduced for newcomers, but the ~12-control topbar wasn't.
A newcomer (`!onboarded`) now also gets a trimmed topbar: the **advanced cluster
is hidden** — Library, Workspace settings, the Focus button, and the Fabricate
item in the launcher dropdown. Kept: deck title, ⌘K, theme + light/dark, Present,
Share, the Architect/Inspector toggles, New/Import/Decks (in the launcher). The
cluster **reveals on graduation** (first edit / dismiss / panel open). The Coach
still opens Workspace on demand when an AI action needs a model, so hiding the
Workspace *button* never traps a newcomer who wants to connect.

### 2. Welcome deck for returning users — one-time migration
`loadIndex()` only seeded the welcome deck on a truly fresh visitor, so anyone
with a saved deck index from before it existed never saw it. `migrateWelcome()`
now **appends** the welcome builtin to such an index **once** (guarded by a
`lattice-studio-welcome-migrated` flag), then never again — so a user who deletes
it keeps it deleted. **Append, not prepend:** the active deck is `index[0]`, and
prepending would hijack a returning user's landing deck with the tour.

### 3. Inspector nudge — a gentle pulse, not an auto-open
The parent doc rejected auto-opening the Inspector on first slide-click (clicking
a slide → settings pop tests as confusing). Instead, when the Coach reveals (the
first genuine edit), the Inspector **toolbar toggle pulses once** (accent ring +
`animate-pulse`); it clears the moment the Inspector is opened. Discovery without
hijacking the canvas. Scoped to the newcomer's first-edit moment, so existing
users never see it.

## Why these shapes

- **Reveal, don't remove (again).** Same principle as the panel trim: nothing is
  unreachable (⌘K still reaches everything; the cluster returns on engagement),
  the topbar just doesn't shout on first load.
- **Migration is append + one-time + deletable** — the three properties that make
  "offer it to everyone" safe: it doesn't disturb the active deck, doesn't nag,
  and respects a delete.
- **A pulse beats an auto-open** — it teaches where the Inspector is without taking
  over what the user clicked, which is exactly the failure the parent doc named.

## Verification

- Docs vitest: the topbar trim + reveal-on-graduation and the migration are unit-
  tested (`StudioShell.test.tsx`, `studio-store.test.ts`); existing Fabricate /
  controls suites now seed a returning-user state to reach the advanced surfaces.
- The first-edit Inspector pulse can't be unit-tested (the jsdom editor is a
  `<textarea>` fallback that doesn't fire `onUserEdit`), so it was **verified in a
  real browser**: newcomer topbar trimmed → first edit → Coach reveals, cluster
  appears, Inspector toggle pulses; the migration appends welcome for a returning
  user.

## Non-goals / notes

- Still no separate "Lite" mode; this is reduced-density-by-default + progressive
  reveal on one Studio.
- The pulse is session-scoped to the newcomer's first edit — deliberately not a
  persisted "have you seen the Inspector" flag for all users (that would nag
  existing users).
