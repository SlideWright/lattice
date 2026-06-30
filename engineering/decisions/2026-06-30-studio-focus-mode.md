---
status: in-progress
summary: The Studio shows ~35–40 affordances at once (a four-column Architect · Editor · Preview · Inspector grid plus topbar), so authors can get lost and power users want a way to quiet the chrome. "Simpler" turns out to be two needs — a transient "quiet the noise" posture (every capability stays, you just stop looking at it) versus a smaller default surface for newcomers — that pull in opposite directions, so we split them. This ships need #1: a transient Focus mode that collapses to Editor + Preview + slide nav with most of the topbar hidden, while the ⌘K palette stays live so every feature is one keystroke away. Opt-in per session (not sticky, not a default); toggle via a topbar button, ⌘., or the command palette, leave with Exit-focus / Esc / ⌘.. The newcomer-defaults problem is a separate later pass.
---

# Studio Focus mode — quiet the noise without taking power away

*2026-06-30*

## The worry

The Studio shows a lot at once. On desktop a first-time author lands on a
four-column grid — **Architect │ Editor │ Preview │ Inspector** — plus a topbar
carrying ~12 controls and a footer. That is roughly 35–40 simultaneous
affordances before they have typed a word. The concern raised: people get lost,
and even a power user sometimes wants to silence the chrome and just write.

## The trap: "simpler" is two different needs

The phrase "a simplified mode" hides two needs that pull in opposite directions:

1. **Quiet the noise (a posture).** A power user — or anyone mid-draft — wants to
   *temporarily* hide chrome and concentrate. Every capability stays; they just
   stop *looking* at it. Reversible, transient, like the existing **Present**
   mode. Nothing is removed.
2. **Don't overwhelm the newcomer (a surface).** A non-technical author opening
   Studio cold faces *choice* noise — too many doors, no obvious path. The fix
   there is a smaller *default* surface with progressive disclosure, not a
   togglable panel they have to find again.

Build them as one feature and you get a mode too bare for the newcomer (they
can't find what's hidden) and too clumsy for the expert (it nags them with
guidance they didn't ask for). So we split them. This doc is **need #1**; the
newcomer-defaults problem (#2) is a separate, later progressive-disclosure pass.

This split is consistent with where the product already leans —
`2026-05-10-tauri-exploration.md` ("minimalist by default, powerful for
experts — progressive disclosure") and the Architect's Drafting-vs-Freehand
posture (`2026-06-08-architect-modes.md`).

## Decision

Ship a transient **Focus mode** for need #1. Confirmed direction (one
`AskUserQuestion` round, 2026-06-30):

- **Scope:** one transient "quiet the noise" posture for everyone (power users
  + anyone mid-draft). The newcomer-defaults problem is tackled separately.
- **How minimal:** **Editor + Preview + slide nav.** The Architect and Inspector
  columns and most of the header are gone; the ⌘K command palette stays live so
  *everything* is still one keystroke away.
- **Activation:** transient toggle — a header button, `⌘.` to toggle, `Esc` to
  leave. It does not change any default; you opt in per session.

### The essentials (what survives in Focus)

- **Tier 0 — always present:** the Markdown editor, the live preview, slide
  navigation (prev/next + the thumbnail rail with add/duplicate/move/delete),
  and an obvious way back out (the "Exit focus" control + `Esc`).
- **Tier 1 — one keystroke away via ⌘K (kept live):** theme + light/dark,
  Present, Share/Export, Insert component, Reshape, Fabricate, deck switch.
- **Tier 2 — hidden in Focus, full mode only:** the Architect coach/chat column,
  the Inspector (size, page numbers, running header, lenses, history, voice),
  the full topbar control cluster.

The move that lets a power user enter Focus **without losing anything** is
keeping ⌘K alive — that is the difference between "calmer" and "crippled."

## Why this shape

- **Cheap and low-risk.** It reuses the existing transient-overlay instinct
  (Present) and the panel state already in `StudioShell`. Nothing is deleted;
  Focus only changes what renders.
- **Serves the stated instinct directly.** "Even a power user may want to enter
  this mode to quiet the noise and focus" — a reversible posture is exactly that.
- **Honest reversibility.** A visible "Exit focus" button + `Esc` + the ⌘K
  affordance mean a user can never get *trapped* in the calm view — the inverse
  of the get-lost worry.

## Scope / non-goals

- Desktop is where the noise lives, so the Focus toggle is offered on desktop.
  Tablet/mobile already collapse the side columns into sheets and run a single
  swappable pane, so they are effectively "focused" already.
- Focus applies to the **compose** view; entering **Fabricate** exits Focus
  (Fabricate is its own full-screen surface).
- **Not** a newcomer default and **not** sticky — opt-in, per session. A sticky
  preference or first-run default is deferred to the need-#2 pass.

## Mechanics

- `focus` state in `StudioShell`. When on (desktop, compose): the body renders a
  two-column `editor | preview` grid; the topbar is replaced by a slim header
  (deck title · ⌘K search · Exit focus).
- `⌘.` toggles; `Esc` exits. Radix popovers/sheets/dialogs handle `Esc` first
  (they stop propagation), so leaving Focus with `Esc` never fights an open
  menu.
- `Focus mode` is also a ⌘K command, so it's discoverable from the palette.

## Follow-ups (out of scope here)

- Need #2: newcomer "essentials by default" + progressive disclosure (onboarding,
  default density, how the rest is revealed). Its own design pass.
- Possible later: remember the last Focus choice (sticky) once we've watched how
  people use the transient version.
