# Diagram elevation — inner elements should read as cards on a band

**Date:** 2026-05-12
**Branch:** `claude/investigate-themecss-lattice-rkKD0`
**Status:** design — no CSS edits yet, gathering direction before audit

## Why

After the `--diagram-*` rename, the band cycle is consistent across
Mermaid diagrams, but the *relationship* between an outer categorical
section and the inner items inside it is not. The first time you put
kanban and timeline side-by-side in the new tokens deck the difference
is visible:

- **Kanban tickets** are clearly distinct from their swim lane. Lane =
  pale band-N, ticket = `--bg-alt` neutral card. The eye reads
  "discrete card sitting on a colored ground."
- **Timeline events** are *not* distinct from their period band. Period
  header bar, task bar, and event card all paint with the same
  `--diagram-band-N` fill. The eye reads "one flat block of color."

User-reported symptom: "containers like the [timeline] hypothesis-board
slide have white backgrounds, [but] elements inside the kanban swim
lane have a grey background. We need to think about consistency."

The colour difference isn't a brand choice — it's an incomplete one.
The lift that kanban gets (line 6267–6273 of `lattice.css`, overriding
`.items .node .label-container` to `--bg-alt`) was never written for
timeline, journey, or any other diagram with the same outer→inner
relationship.

## What the SVG actually looks like

Mermaid timeline renderer
(`node_modules/mermaid/dist/chunks/mermaid.esm/timeline-definition-…mjs`)
emits, per period:

```
<g class="timeline-node section-N">              ← PERIOD HEADER
  <g><path class="node-bkg node-undefined"/></g>
  <g><text>Discover</text></g>
</g>
<g class="taskWrapper">                          ← TASK ROW
  <g class="timeline-node section-N">
    <g><path class="node-bkg node-undefined"/></g>
    <g><text>Q1</text></g>
  </g>
</g>
<g class="eventWrapper">                         ← EVENT ROW (n× per period)
  <g class="timeline-node section-N">
    <g><path class="node-bkg node-undefined"/></g>
    <g><text>Customer interviews</text></g>
  </g>
</g>
```

The wrapper classes (`taskWrapper`, `eventWrapper`) are unique and
already in the DOM — we can target them from CSS without runtime
intervention.

The band rule at `lattice.css:6220` (`section .section--1 path { fill:
var(--diagram-band-1) !important }`) matches all three `<path>` nodes
because all three sit under elements with class `section--1`. That's
why everything in a period collapses to one tint.

## The pattern catalogue (current state)

| Diagram type | Outer section | Inner element | Pattern today |
|---|---|---|---|
| **kanban**  | `.cluster.section-N rect` = `--diagram-band-N` | `.items .node .label-container` = `--bg-alt` | **card-on-band** ✓ |
| **timeline** | `.section-N path` (header) = `--diagram-band-N` | `.section-N path` (task/event) = also `--diagram-band-N` | **inherit-the-band** (unintentional) |
| **journey**  | `.journey-section rect` = `--diagram-band-1` | `.task-type-N rect` = `--diagram-band-(N+1)` | **tile-per-element** (cycle of 3) |
| **mindmap**  | — | `.mindmap-node[section-N]` = `--diagram-band-(N+1)` | **tile-per-element** |
| **treemap**  | — | `.leafNx rect.treemapLeaf` = `--diagram-band-N` | **tile-per-element** |
| **gitgraph** | — | per-commit fill from `cat-*` | **tile-per-element** |

Three patterns coexisting. None of them is wrong on its own, but the
choice between them is currently driven by which selectors were easiest
to find when the override was first written, not by a stated rule.

## Proposed rule

> **When a diagram has an outer categorical grouping that contains
> inner items, the band carries the category and the inner item is a
> neutral `--bg-alt` card.** (Card-on-band, kanban-style.)
>
> **When a diagram has no outer grouping — items themselves are the
> categorical signal — each item gets its own band tint.**
> (Tile-per-element, treemap/mindmap-style.)

In one sentence: *the band coloring stops at one level of nesting.*

### Why this rule is the right one for Lattice

- **Matches the brand contract.** The visual style doc says colour
  rides on `--accent` and `--spectrum`; neutrals stay quiet. Two
  band-N fills stacked on top of each other is colour piling on colour.
- **Preserves readability.** Card-on-band gives text on `--bg-alt`,
  which is the same surface every other Lattice layout uses for body
  copy — already AA-tested for every paired text token. Text on
  band-N is also AA but only with the paired `--diagram-band-text-N`,
  which the layout has to remember to set per band.
- **Already half-implemented.** Kanban + the
  `section.timeline-list .timeline-spine` (vertical timeline) both
  already follow it. The rule is a formalization, not an invention.
- **Doesn't touch the palette.** No new tokens, no theme work.

## Audit checklist

Sites to bring into compliance (in priority order):

1. **Mermaid timeline event/task cards.** Add:
   ```css
   section .taskWrapper .timeline-node[class*="section-"] path.node-bkg,
   section .eventWrapper .timeline-node[class*="section-"] path.node-bkg {
     fill: var(--bg-alt) !important;
   }
   ```
   Keep the period header (the bare `<g class="sectionNodeWrapper">`
   sibling, or detected via `:not(.taskWrapper):not(.eventWrapper)
   > .timeline-node`) on `--diagram-band-N`. Text inside event/task
   cards switches from `--diagram-band-text-N` to `--text-heading`
   (or `--text-body`).

2. **Mermaid journey tasks.** Today `task0/1/2` cycle through band-1/2/3
   while the section bar is also a band-N. Decide: do journey tasks
   *belong to* a section (then flatten them to `--bg-alt`), or are
   they the categorical signal themselves (then drop the section bar
   coloring and let the tasks carry the colour)? Recommend the former
   — journey tasks within one section are always the same task-type-N,
   so the cycle is redundant with the section.

3. **`section.timeline` (slide layout, not Mermaid).** Already
   compliant — the spine + accent dots are the figures, sub-elements
   are bare. Documented in the previous answer.

4. **`section.timeline-list` (vertical chart-frame).** Already
   compliant — spine + dots + status pills on `--bg-alt` rows.

5. **Document the rule** in `reference/theming.md` next to the band
   taxonomy. One paragraph + the proposed-rule blockquote above.

6. **Add to `reference/engineering/gotchas.md`.** Symptom: "Timeline events
   blend into the period band / appear the same colour as the section
   header." Cause: shared `section-N` class. Fix: wrapper-scoped
   override.

## Risks and open questions

- **Mermaid `data-look` shifts.** The timeline renderer also branches
  on `look: "neo"` and `theme.includes("redux")`. The selectors above
  assume default `classic` look. If a future deck uses
  `%%{init: { look: "neo" } }%%` we may need a second rule. Worth a
  comment in the override block, not worth pre-emptive work.

- **Cross-renderer parity.** The Mermaid SVG is identical across the
  emulator path (`lattice-emulator.js`), the marp-cli path
  (`marp.config.js`), and the VS Code preview (`lattice-runtime.js`)
  because all three use the same Mermaid build. So this is a pure CSS
  change — no triple-write.

- **Existing decks may shift visually.** The `examples/diagram-tokens.md`
  timeline slide and any timeline in `mermaid-gallery.md` will
  re-render. Per the workflow contract: rebuild and commit the PDFs
  in the same commit as the CSS change.

- **Open: is "card-on-band" right for mindmap?** Mindmap currently
  uses tile-per-element (each node a different band). A mindmap with
  ten leaves would become ten near-identical grey cards under the
  rule, losing the categorical signal. Recommend keeping mindmap on
  tile-per-element — it falls under the "items themselves are the
  categorical signal" branch of the rule.

## Out of scope

- Layout-level (non-Mermaid) board styles like `verdict-grid`,
  `matrix-2x2`, `decision`, `cards-wide`, `cards-stack`. These already
  follow a coherent L0/L1/L2 alternation (slide → `--bg-alt` card →
  `--bg` pill). Worth documenting at some point but separate from this
  note.
- Dark-mode handling. `--bg-alt` already uses `light-dark()` so the
  card-on-band rule automatically inverts. Verify in the visual review
  pass, no token work expected.

## What we want from review

1. Agreement on the rule as stated, or a counter-proposal.
2. Sign-off on the journey task question (#2 in audit checklist) —
   flatten tasks to `--bg-alt`, or keep the per-task cycle?
3. Sign-off on the wrapper-scoped override selector approach (vs e.g.
   a runtime DOM rewrite — not recommended, but worth naming).

---

## Post-implementation audit (2026-05-12, same day)

The shipped CSS produced regressions on timeline (slide 17 of
`mermaid-gallery.pdf`) and journey (slide 9). Page-by-page audit found:

- **Timeline events + tasks** became `--bg-alt` (#F2F5FA) cards on the
  white slide canvas (`--bg` = #FFFFFF). Virtually invisible — only
  the `--diagram-stroke` outline remained.
- **Journey tasks** lost their per-task band cycle (band-1/2/3) and
  flattened to `--bg-alt` — same near-invisible effect.

### What we got wrong

The rule as written ("band coloring stops at one level of nesting")
assumed every diagram with syntactic outer→inner nesting also has
visual outer→inner nesting (inner card sits ON TOP of a band-tinted
parent surface). That assumption holds only for kanban:

| Diagram | Visual structure | Card-on-band? |
|---|---|---|
| **kanban** | ticket sits *inside* a band-tinted lane rect | ✓ yes |
| **timeline** | period header is a small band-N rect at top; events stack *below* on slide canvas | ✗ no — events sit on white, not on a band |
| **journey** | section header is a band-N bar at top; tasks stack *below* on slide canvas | ✗ no — same issue |

Timeline and journey are **tile-stack** diagrams, not card-on-band. The
cards aren't lifted off a tinted surface — they're a vertical
sequence on the canvas.

### Why the user's original "looks white" complaint wasn't structural

The pre-change rendering had timeline events painted `--diagram-band-N`
matching their period. In indaco, band-1 = `#DCE9F5` (L≈92) — pale
enough that on the white `--bg` canvas it reads almost like white.
The user perceived this as "uncoloured." That perception was correct;
the diagnosis (structural) was wrong. The real issue is **band
tonality** — band-1 is too close to canvas in light mode for the card
to register against white at projector distance.

### The revert

- `lattice.css` reverted to the pre-change state for timeline + journey
  (kept the CARD-ON-BAND ELEVATION block as the kanban-only override).
- `reference/theming.md` scope narrowed: card-on-band documented as
  kanban-only, with the "tile-per-element" pattern listed for every
  other multi-band Mermaid diagram (including timeline and journey).
- `reference/engineering/gotchas.md` entry rewritten as a *trap* warning
  (don't try to apply the kanban rule to timeline/journey — it looks
  consistent in source but produces invisible cards in the SVG).

### Follow-up: band tonality (shipped in the same branch)

Adopted option (2) from the candidate list — uniform deepening of
all 12 band slots in both indaco and cuoio, dropping HSL lightness
from L≈90 to L≈83 (~8 percentage points). Rationale for going
straight to the whole-cycle move:

- The first per-slot test against `band-1` alone showed that one slot
  in isolation creates an awkward step where band-1 reads as
  "anchored" while band-2..12 still wash out. Treating the cycle as a
  unit preserves the tonal ladder.
- Contrast against the paired `band-text-N` (pinned to a fixed dark
  hex per palette) drops from ~14:1 to ~11:1 across the cycle — well
  above the AA 4.5:1 threshold. `contrast.test.js` still passes.
- Kanban tickets (`--bg-alt`, L=97 in indaco) gain ~14 lightness
  points of separation from their lane (now L=83), strengthening the
  card-on-band reading instead of compromising it.
- Treemap, mindmap, pie, journey all gain visible cycle
  differentiation; timeline events now read as colored against the
  white canvas.

Token changes:

- `themes/indaco.css` — all 12 `--diagram-band-N` values deepened
  while preserving hue.
- `themes/cuoio.css` — same treatment for the cream/parchment ladder.
- `reference/theming.md` — "Pale band, L≈90" updated to "Tinted band, L≈83";
  contrast claim updated from 13:1+ to 10:1+.

No layout CSS changes. The card-on-band rule scope (kanban-only)
established in the revert commit is unaffected.
