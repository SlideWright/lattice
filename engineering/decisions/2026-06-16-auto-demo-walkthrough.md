---
status: shipped
summary: Replaces the wait-for-user "Try it" lesson with a self-driving "Demo" that types a slide, switches palette, and opens Export itself — non-destructive via snapshot/restore plus suspended autosave
last-updated: 2026-06-16
---

# Auto-demo walkthrough — "watch it build" on the Drawing Board

**Date:** 2026-06-16
**Status:** shipped (first cut: Drawing Board, one demo)

## The ask

We already have a strong intro — the driver.js **guided tour** (`guided-tour.js`
+ per-surface step decks). It is polished but **passive**: it spotlights a control
and *describes* it ("this is the Export button"). It never *does* anything.

The request: a **walkthrough that performs the real actions itself** — "I don't
want the user to do, I want the walkthrough to actually type when the editor is
highlighted. I want it to click buttons. This is an auto-demo that does real
things the user would do." Live in the visitor's browser, against the real
workspace — "no Playwright, no videos, this needs to be a live experience."

## The pivot (recorded honestly)

Three readings of "walkthrough" were on the table:

1. **Autoplay self-demo** — the app drives itself while the user watches. ← **chosen**
2. **Hands-on practice** — the user performs each action; the app coaches and *waits*.
3. **Recorded demos (Playwright)** — script the product, capture video/GIF.

The first cut built reading **#2** (a "Try it" lesson that waited for the user).
On review the user clarified the intent was reading **#1**: an **auto-demo** that
*itself* types, switches palette, and opens Export while the user watches. We
pivoted the engine from *detecting* the user's action to *performing* it. Reading
**#3** (headless RPA / video artifacts) stays out of scope — the demo runs live in
the real browser, no artifacts.

First surface: the **Drawing Board** — the richest authoring surface (editor,
theme control, export menu) and the one with the most stable automation hooks.

First cut: a **small reusable engine + one polished demo**, not a one-off and not
a multi-surface framework. The engine generalizes to future demos for nearly
free; we ship it proven against one real demo.

## Design model

A **demo** is a sequence of steps, each either:

- a **narration** beat — a centered/spotlit card that auto-advances after a read
  pause (same popover shape as a tour step); or
- an **act** step — spotlights a control, shows an "Auto" badge + caption, and the
  engine **performs the real action**, then dwells on the result and auto-advances.

The one new primitive is a per-step **`perform({ element, next, reduced })`** hook:
it drives a real control through the workspace's window bus and calls `next()` when
the action is done, returning a cleanup fn. Presence of `perform` is what makes a
step an "act" step. The engine adds autoplay timing (a read dwell for narration, a
post-action dwell for acts, and a per-step safety timeout so a stalled `perform`
never strands the demo).

### Reuse, don't reinvent

The engine (`guided-demo.js`) is built on the **same driver.js instance and the
same palette-blind popover skin** as the tour (`guided-tour.css`). Demo popovers
carry `popoverClass: 'lattice-tour lattice-demo'`, inheriting all tour styling;
`guided-demo.css` adds only the demo-specific pieces. Production gating and the
global on/off are reused verbatim (`toursAllowedHere()` + `tour-prefs`), so the
Drawing Board's one **"Guided tours"** setting silences both the tour and the demo.

## Three engineering decisions that matter

1. **Non-blocking overlay.** A tour *traps* interaction (you read, then click
   Next). The demo drives real controls — and the shadcn theme/export menus
   **portal outside** driver's spotlight cutout — so a trapping overlay would
   cover them. Demo mode turns the overlay's click-trapping **off**
   (`body.demo-running .driver-overlay { pointer-events: none }`) while keeping the
   spotlight's visual dimming. Keyboard control is disabled too, so the Escape we
   dispatch to close a menu never also tears down the demo.

2. **Drive through the existing window buses** — clean semantic control, not DOM
   scraping:
   - **Type:** drive `__dbEditor.setValue` with a growing slice for a live typing
     effect (each write re-renders the preview); reduced motion writes it in one
     shot. We must NOT touch `__dbEditor.onChange` — a single-subscriber slot owned
     by the render controller.
   - **Restyle:** click the real theme trigger (a visible button press), then apply
     a different palette via `__dbChrome.applyTheme(name)` (data-driven: the first
     palette that isn't the current), then Escape to dismiss.
   - **Ship:** click the real `#db-export` trigger to reveal the formats, then
     Escape. The demo shows the door; it does **not** force a file download.

3. **Snapshot + restore, and SUSPEND autosave — truly non-destructive.** The demo
   really types into and restyles the open deck, so it `snapshot()`s the deck
   source up front and `restore()`s it when the demo ends or is closed (the palette
   lives in the deck's front matter, so restoring the source restores the palette
   too). But restoring the *editor buffer* isn't enough on its own: typing flows
   through `onEdit → __dbStore.saveActive`, which persists to IndexedDB and
   **auto-titles the deck from its H1** — so a user who closed the tab mid-demo
   would be left with a renamed, overwritten deck that the buffer-restore never
   runs to undo. So the demo also **suspends autosave** for its whole duration
   (`__dbStore.setSuspended(true/false)`, mirroring the store's existing `loading`
   guard): nothing the demo does is ever written, retitled, or checkpointed, even
   on an abandoned run. The durable deck stays exactly as it was; restore only
   touches the live buffer. (The Architect re-scores the demo's slide live — a
   transient UI effect that self-corrects on restore and is never persisted.)

## The first demo (Drawing Board)

`drawing-board-demo.js` — the authoring loop, end to end, on autoplay:

1. **Intro** (narration) — "watch me build a deck."
2. **Writing a slide** (act) — types a heading + two bullets into the editor.
3. **Restyling it** (act) — opens the theme menu, switches palette.
4. **Rendered live** (narration) — the live preview.
5. **Shipping it** (act) — opens the Export menu.
6. **Close** (narration) — "write → restyle → render → ship"; deck restored.

## Files

- `docs/src/playground/guided-demo.js` — the reusable engine (`initGuidedDemo`).
- `docs/src/playground/drawing-board-demo.js` — the first demo + performers + snapshot/restore.
- `docs/src/styles/guided-demo.css` — non-blocking overlay, "Auto" badge, launcher
  tint, acting pulse.
- `docs/src/pages/drawing-board.astro` — init alongside the tour.

## Follow-ons (not in this cut)

- Demos on the Playground and Workbench (the engine already supports them).
- A richer `perform` vocabulary if needed (scroll-to, drawer-open, present/practice).
- An optional "actually export" finale (currently the export step opens the menu
  without forcing a download).
- The launcher is **opt-in** via the **Demo** button; we deliberately do **not**
  auto-start it — the tour already owns first-visit — and it is hidden on the
  cramped mobile topbar (tablet/desktop only).
