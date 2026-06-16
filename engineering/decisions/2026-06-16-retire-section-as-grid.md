# Retire section-as-grid — B (flex + in-flow bands) is the canonical end state

**Status:** decided 2026-06-16. **Rejects** the "A-later — section-as-grid"
north star that `design/forms.md` §10 and the implementation ADR
(`2026-06-15-form-implementation.md` §4/§8) carried as the principled end state to
migrate toward. Section-as-grid is **not deferred — it is retired on merit.** The
current model (**B**: flex `section` + in-flow content-height masthead + reserved
footer + the stage as the deterministic content region, **no wrapper element**) is
the canonical architecture, not a stepping stone. This note supersedes the
section-as-grid items in `2026-06-11-islands.md` §6 (Phase 4) / §8.8,
`2026-06-15-form-implementation.md` §4/§8, and the "A-later" framing in
`design/forms.md` §10.

---

## 1. The decision

Do **not** convert `section` to a named-area grid, and do **not** introduce the
`.cell-stage` wrapper element it required. Keep authoring/layout exactly as today:
component bodies stay **direct children of `section`**, so the ~373 `section.X > …`
direct-child selectors are correct **by design**, not a constraint being tolerated.

## 2. Why — section-as-grid loses more than it wins

### 2.1 Fixed tracks fight content-driven sizing (the masthead proved it)
A named-area grid sizes its rows with `grid-template-rows` — i.e. **fixed tracks**.
But the Form already *learned the opposite lesson and shipped the fix*: the masthead
Cell was deliberately changed **from** a fixed `--masthead-h` reserved box **to** an
**in-flow, content-height band**, precisely because the fixed height "left dead space
under short titles" and could not grow for a two-line title
(`2026-06-15-form-implementation.md` §3, the Stage/Masthead rows; `stage.css`
header). Section-as-grid would *re-impose the fixed track* and reintroduce the exact
failure already eliminated — clip the second title line or leave a gap under one.
Content-height, in-flow bands are strictly better for variable content; a grid track
is a regression.

### 2.2 It costs responsiveness
Lattice ships to desktop · tablet · mobile (CLAUDE.md § Website/responsive). Flex
flow + content-height bands reflow naturally across breakpoints; rigid grid areas
must be re-declared per breakpoint and resist variable content. Section-as-grid
trades a fluid model for a brittle one.

### 2.3 It costs feasibility for a marginal payoff
The migration is ~373 `section.X > …` selectors across every component, each gated by
light+dark pixel-parity — a large, high-risk sweep. The only wins over B were a
"principled" grid and a soft exact-edge clip (vs today's hard `overflow:hidden`). B
already delivers deterministic, bounded Cells. The risk/value ratio is upside-down.

## 3. What this changes

- **The 373-selector debt is dissolved, not paid.** There is no wrapper to insert,
  so `section.X > Y` staying a direct-child selector is the intended, permanent shape.
  Component authors keep assuming "flex child of `section`."
- **The stage's hard clip is canonical.** The "soft exact-edge fade needs the
  A-later stage wrapper" caveat (`stage.css`, `2026-06-15` §4/§8) is resolved by
  *removing the goal*: the section's `overflow:hidden` hard clip is the accepted,
  final behavior. (If a soft fade is ever wanted, it must come from a mechanism that
  does **not** reintroduce a fixed-track grid — e.g. a mask on the section — and is
  out of scope here.)
- **`@layer` activation** was only ever *paired* with section-as-grid as a
  convenience, not dependent on it; it remains independently optional (#283/#284),
  unaffected by this decision.

## 4. What stays true (B is the model)

The Form composition model is unchanged and complete: Frame · Cell · Tile, with the
root chrome Frame as a flex `section`, the masthead an in-flow band, the footer a
reserved token-contract band, and the stage the deterministic region between them.
Every Cell still "resolves to a deterministic px box" (`design/forms.md` §6) —
that contract was **always satisfied without a wrapper** (slide is fixed-size; each
chrome band takes a determinate slice; the remainder is the stage). The medium-
independent manifest contract (`2026-06-16-form-manifest-medium-independent-contract.md`)
and the narrative step model (`2026-06-16-narrative-step-model.md`) sit on top of B
and are likewise unaffected — neither needed section-as-grid.

## 5. Non-goals / scope

- Not changing any rendered output — this is a **decision + doc** change; the engine
  and CSS already are B. Pure docs/comments.
- Not touching `@layer` (independently deferred).
- Not precluding a *future* soft-clip if it's wrapper-free; just retiring the grid
  migration as the path to it.

## 6. Doc updates landing with this note

- `design/forms.md` §10 — reframe "A — section-as-grid (north star)" as **retired**,
  pointing here; B is the canonical end state.
- `2026-06-15-form-implementation.md` §4/§8 — mark the A-later north star retired.
- `2026-06-11-islands.md` §6 (Phase 4) / §8.8 — mark section-as-grid retired.
- `2026-06-16-form-manifest-medium-independent-contract.md` / `…-narrative-step-model.md`
  — their "section-as-grid (gated/orthogonal)" asides → "retired."
- `lib/forms/cell/stage/stage.css` — the "needs the A-later stage wrapper" comments
  → the hard clip is canonical; section-as-grid retired.
