---
status: in-progress
summary: A non-technical newcomer opening the Studio faces ~35–40 affordances cold and, worse, a deck they didn't author and don't know how to change. This ships the newcomer half of the "simplified Studio" work (the other half, the transient Focus posture for power users, is 2026-06-30-studio-focus-mode.md / PR #622). The newcomer default is a crafted intro-to-Lattice starter deck — brief, one distinct component per slide, a genuine 10/10 boardroom deck that teaches the system by being read — plus a reduced-density shell (side panels start closed, a one-time welcome cue) and contextual reveal (the AI Coach opens on the first edit), with a persisted `onboarded` flag so it's strictly one-time. Two latent Studio bugs were fixed on the path: the desktop grid collapsed the editor to 0px whenever the Architect was closed (column count didn't match rendered children), and inline validation used a stale hardcoded 11-name list instead of the real 53-component catalog it was already handed (so valid components were false-flagged).
---

# Studio newcomer onboarding — a starter deck that is the pitch

*2026-06-30*

## The problem

"People can get lost in the Studio." A non-technical newcomer lands on a
four-column desktop grid (Architect · Editor · Preview · Inspector) plus a
~12-control topbar — ~35–40 affordances before they type a word. The deeper
blocker isn't even the chrome: it's that they open into a deck they didn't write
and don't know how to change.

"Simpler" turned out to be two different needs (see
`2026-06-30-studio-focus-mode.md`): a transient *posture* for someone who knows
the Studio and wants to quiet it (Focus mode, PR #622), versus a smaller, guided
*default surface* for the newcomer. This doc is the second — they pull in
opposite directions, so they ship separately.

## What a newcomer needs (decided with the user, 2026-06-30)

Three first-step options were weighed — conversation-first AI, a template
gallery, and a pre-loaded starter deck:

- **Conversation-first is out as the opening move** — no model is connected by
  default, and the honesty contract forbids faking it, so the least-equipped user
  hits a dead end.
- **A gallery is a forced choice** — it makes a nervous newcomer decide before
  they understand anything.
- **The winning move is a crafted starter deck** — but only if it's genuinely
  valuable: brief, a different killer layout per slide, demonstrating the key
  components, a 10/10 boardroom deck in its own right. The newcomer learns Lattice
  *by reading a beautiful deck about Lattice*, then edits it or starts fresh. That
  earns the deck's place and kills the "whose generic deck is this?" problem.

So the newcomer default is:

1. **The intro deck** (`welcome`, `DECKS[0]`) — 7 slides, self-demonstrating:
   `title` (cover) → `big-number` (the thesis: *0 boxes to drag*) → `stats`
   (proof: 53 components · 14 themes · 4 formats · 1 source file) → `cards-grid`
   (the four moves) → `split-compare` (why it's different) → `list-steps timeline`
   (how it flows) → `closing` (the on-ramp: *edit any slide, or start a new deck*).
   Seven distinct components across six buckets. It scores a clean **10.0/10
   board-ready** in the Coach. (`list-steps`, not a mermaid `diagram`, for the flow
   slide — the Studio preview runs `mermaid={false}`, so a diagram would render
   empty.)
2. **Reduced-density shell** — a newcomer starts with the side panels **closed**
   (editor + preview + the deck lead, not 35 controls) and a single dismissible
   **welcome banner** pointing at where the Coach and deck settings live. Discovery
   over hiding: the full topbar stays so nothing is unreachable.
3. **Contextual reveal + remember** — the first real **edit** opens the Architect
   (the coach appears exactly when they start writing). A persisted `onboarded`
   flag (in `StudioSettings`) flips true the moment they engage — dismiss the
   welcome, edit, or open a panel — so the whole first-run treatment is **one-time**.
   Pre-existing users are detected via `hasPriorStudioUse()` (a saved deck index or
   any edited source) and treated as already-onboarded, so the welcome never shows
   to someone who's been here before.

## Why this shape

- **The deck does the teaching.** A model deck is worth more than a tour: it shows
  the boardroom bar, demonstrates the component vocabulary, and is immediately
  editable. The closing slide *is* the call to action.
- **Reduced density, not a separate "Lite" app.** A fork doubles maintenance and
  drops a cliff on the user exactly as they gain confidence. One Studio they grow
  into — consistent with the codebase's "minimalist by default, powerful for
  experts" stance (`2026-05-10-tauri-exploration.md`).
- **Reveal beats hide.** Everything stays reachable (full topbar, ⌘K); the panels
  just don't shout on first load. Honest and reversible — the opposite of the
  get-lost worry.

## Bugs fixed on the path (HARD RULE #18)

Both were latent, both sat directly on this change's path, both are strictly
improvements:

- **Editor collapsed to 0px when the Architect was closed.** The desktop grid
  declared four column tracks with a fixed `0px` first track, but the Architect
  `<aside>` only renders when open — so with it closed the grid had three children
  and four tracks, dropping the editor into the `0px` track. Masked because the
  Architect always defaulted open; the newcomer default (closed) exposed it. Fix:
  build `gridTemplateColumns` to match the rendered children (omit the Architect
  track when closed). This also fixes the bug for anyone who manually closes the
  Architect.
- **Inline validation used a stale 11-name list.** `KNOWN` hardcoded 11 of the 53
  components, so valid components (`split-compare`, `list-steps`, and ~40 others)
  were false-flagged as "unknown" on a perfectly good deck — including the welcome
  deck. The Studio already receives the full catalog (`components` prop, from
  `dist/docs/components.json`); the known set now derives from it, with `KNOWN` kept
  only as an offline fallback.

## Scope / non-goals

- Desktop is where the density problem lives; tablet/mobile already collapse the
  panels into sheets / a single pane, so the reduced-density default is most
  visible there but the welcome + graduation work everywhere.
- The intro deck is a **Studio built-in** (the first-run default), not an engine
  `examples/` demo deck.
- Not sticky beyond graduation, not a separate mode. The transient Focus posture
  is the companion feature (PR #622).

## Follow-ups

- The Inspector currently surfaces via the welcome banner + topbar rather than
  auto-popping on first slide-click (auto-opening settings when you click a slide
  tests poorly). Revisit if usage shows the Inspector is under-discovered.
- Consider offering the welcome deck in the deck switcher for returning users too
  (today it seeds only for fresh visitors).
