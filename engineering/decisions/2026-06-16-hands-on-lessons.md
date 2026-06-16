# Hands-on lessons — "learn by doing" on the Drawing Board

**Date:** 2026-06-16
**Status:** shipped (first cut: Drawing Board, one lesson)

## The ask

We already have a "fantastic intro capability" — the driver.js **guided tour**
(`guided-tour.js` + per-surface step decks). It is polished but **passive**: it
spotlights a control and *describes* it ("this is the Export button"). It never
*does* anything.

The request: a **walkthrough that trains people with actual actions** — scripted
usage of the product (click, type, switch theme, export, scroll), "sort of like
an RPA but free and popular and powerful."

## What we decided (and what we ruled out)

Three readings of "walkthrough" were on the table:

1. **Autoplay self-demo** — the app drives itself while the user watches.
2. **Hands-on practice** — the user performs each real action; the app coaches
   and *waits*. ← **chosen**
3. **Recorded demos (Playwright)** — script the product, capture video/GIF.

The user picked **hands-on practice**, explicitly **live in-browser only** — "no
Playwright, no videos, this needs to be a live experience." So the "RPA" tool
category (Playwright/Selenium) is **out of scope**: we don't drive a headless
browser or produce artifacts. The walkthrough runs in the visitor's real
browser, against the real workspace.

First surface: the **Drawing Board** — the richest authoring surface (editor,
theme control, export menu) and the one with the most stable automation hooks.

First cut: a **small reusable engine + one polished lesson**, not a one-off and
not a full multi-surface framework. The engine generalizes to future lessons
(and other surfaces) for nearly free; we ship it proven against one real lesson.

## Design model

A **lesson** is a sequence of steps, each either:

- a **read** beat — an explanatory card, advanced by the popover button (same
  shape as a tour step); or
- a **do** step — spotlights a control, shows an instruction + a "Your turn" cue,
  and **waits** for the user to perform the action before advancing.

The one new primitive is a per-step **`waitFor({ element, done })`** hook: it
registers a listener for the real action, calls `done()` once when the user
completes it, and returns a cleanup fn. Presence of `waitFor` is what makes a
step a "do" step. This is the whole "wait until they actually do it" mechanism.

### Reuse, don't reinvent

The engine (`guided-lesson.js`) is built on the **same driver.js instance and
the same palette-blind popover skin** as the tour (`guided-tour.css`). Lesson
popovers carry `popoverClass: 'lattice-tour lattice-lesson'`, inheriting all tour
styling; `guided-lesson.css` adds only the lesson-specific pieces. Production
gating and the global on/off are reused verbatim (`toursAllowedHere()` +
`tour-prefs`), so the Drawing Board's one **"Guided tours"** setting silences both
the tour and lessons.

## Two engineering decisions that matter

1. **Non-blocking overlay.** A tour *traps* interaction (you read, then click
   Next). A lesson is the opposite — the user must touch real controls, and the
   shadcn theme/export menus **portal outside** driver's spotlight cutout, so a
   normal trapping overlay would cover them. Lesson mode therefore turns the
   overlay's click-trapping **off** (`body.lesson-running .driver-overlay {
   pointer-events: none }`) while keeping the spotlight's visual dimming. The
   popover stays interactive. Keyboard control is disabled too, so pressing Enter
   while typing a slide never advances the lesson behind the user's back.

2. **Detect actions through the existing window buses — without disturbing them.**
   - **Typing:** `window.__dbEditor.onChange` is a **single-subscriber slot**
     already owned by the render controller; wiring it here would silence the live
     preview. So we **poll `getValue()`** and advance once the deck has grown.
   - **Theme switch:** the render controller echoes every deck-theme change as a
     `db-chrome-sync` window event — a clean semantic signal, far better than
     scraping the portalled menu.
   - **Export:** we wrap `window.__dbExport.run(kind)` to fire on any real export,
     restoring the original on cleanup. (Falls back to the trigger click if the
     bus isn't wired yet.)

## The first lesson (Drawing Board)

`drawing-board-lesson.js` — the authoring loop, end to end, non-destructive
(works with whatever deck is open; only ever *adds*):

1. **Write a slide** (do) — type a heading in the editor.
2. **Restyle it** (do) — switch the deck palette.
3. **Watch it render** (read) — the live preview.
4. **Ship it** (do) — run an export (Markdown — safe, instant).
5. Close: "write → restyle → render → ship."

## Files

- `docs/src/playground/guided-lesson.js` — the reusable engine (`initGuidedLesson`).
- `docs/src/playground/drawing-board-lesson.js` — the first lesson + action detectors.
- `docs/src/styles/guided-lesson.css` — non-blocking overlay, "Your turn" cue,
  launcher tint, waiting pulse.
- `docs/src/pages/drawing-board.astro` — init alongside the tour.

## Follow-ons (not in this cut)

- Lessons on the Playground and Workbench (the engine already supports them).
- A richer "do" vocabulary if needed (scroll-to, drawer-open, present/practice).
- Linking the lesson from the first-visit experience (currently opt-in via the
  **Try it** button; we deliberately do **not** auto-start it — the tour already
  owns first-visit).
