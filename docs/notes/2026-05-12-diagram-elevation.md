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

5. **Document the rule** in `docs/theming.md` next to the band
   taxonomy. One paragraph + the proposed-rule blockquote above.

6. **Add to `docs/references/gotchas.md`.** Symptom: "Timeline events
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
