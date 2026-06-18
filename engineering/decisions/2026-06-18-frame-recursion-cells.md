---
status: proposed
summary: The Cell-holds-Frame recursion is declared in the schema but never executed; what a real `framed` frame would do, and the heading/label-carrier grammar it forces (subtitle moves to literal italic-after-title)
---

# Frame-in-cell recursion — what a real `framed` frame would do

**Status:** design, not built (`proposed`). Started from a plain question —
*does the `Cell --holds--> Frame` recursion in `design/concepts.md` §9 /
`design/forms.md` §3 actually exist in code?* — and followed it into the
authoring grammar a real implementation forces. The recursion is the engine's
load-bearing idea; it is also the one part of the Form model that is currently
**vocabulary only**.

Companion docs: `design/forms.md` (the model), `2026-06-15-form-implementation.md`
(what shipped), `2026-06-16-form-manifest-medium-independent-contract.md` (the
coupling rungs), `2026-06-16-retire-section-as-grid.md` (why the stage is flex,
not a fixed grid).

---

## 1. The finding — the recursion is declared, never executed

The `Cell holds a Tile *or* a Frame` edge is real as **vocabulary and schema**,
and nothing populates or runs it:

- The Cell schema reserves the kind — `accepts` includes `"frame"`
  (*"admits a nested Frame (the recursion)"*, `lib/forms/schema/cell.schema.json`),
  and three cells declare it: `stage`, `masthead`, `footer`.
- The Frame schema reserves a nesting kind — `"framed"` (*"docks in the main
  Cell, keeps the chrome Frame"*, `frame.schema.json`).
- **But no Frame is `kind: framed`.** All ten manifests are `root` (`standard`,
  `minimal`) or `sovereign` (the rest).
- **No Frame declares which Cell it nests into** — there is no `Frame.fits`.
  The root `standard` frame lists all nine cells as a **flat** `cells` array;
  masthead→lede/bay and footer→zones are encoded by region naming + CSS, not as
  a Frame held by a Cell.
- The integrity check for `accepts: "frame"` is the weakest possible — it only
  asserts *"≥1 Frame exists anywhere"* (`lib/forms/index.js`
  `checkIntegrity`), not that any frame docks in that cell.
- **The render path never reads it.** The only thing any render path consumes
  from the catalog is `frameToggleSkip()` — the `exemptFromChrome` id set
  (`lib/integrations/markdown-it/plugins.js`). This matches `forms.md` §11
  exactly: at the "light" coupling rung the manifest is **validated, not
  executed** — only `id` + `exemptFromChrome` are read at render time.

So the recursion is aspirational. Sovereign frames (`split-panel`, `title`, …)
re-carve the canvas via class-keyed CSS + an h2 rewrite — *not* via recursive
Cell→Frame placement; their manifests even model them as *producing*
`cells: ["stage"]`, not as a Frame *held by* the stage cell.

---

## 2. What a real `framed` frame would do

One job: **subdivide the content region into multiple independent components
while keeping the chrome.** Today the stage Cell `accepts: ["content", "frame",
"surface"]` but only `content` is executed, and a slide section carries exactly
**one** component. The hard limit today is *one content component per slide*; a
`framed` frame lifts it to *N components, composed, under the normal masthead and
footer*.

The defining axis is **keeps chrome vs. suppresses it** — the only reason the
kind exists:

| | `sovereign` (ships) | `framed` (the gap) |
|---|---|---|
| Scope | whole canvas | the **stage Cell** only |
| Chrome | **suppresses** masthead + footer | **keeps** all chrome |
| Content | one restyled body | **N independent components**, one per child Cell |
| Mechanism today | class-keyed CSS + h2 rewrite | would be the **first real Cell→Frame execution** |

What it unlocks: multi-pane content slides that keep their title and footer; each
pane a real, separately-authored component getting its own concrete px box (which
charts/Mermaid require, `forms.md` §6) and its own clip/gap (the §6 guarantee).
It is also where the OCP "compose anything" promise (§3-O) finally reaches the
*content* region, not just chrome.

Note this is the one place section-as-grid was *right*: `2026-06-16-retire-section-as-grid.md`
retired `section{display:grid}` for the **chrome bands** because they must be
content-height. Subdividing the stage into **peer content panes** is the opposite
case (equal peers, not content-height bands), so a framed frame lives exactly in
the spot that decision did not cover — it does not reopen it.

### The load-bearing constraint: the frame composes, the leaf stays a leaf

A pane holds a **leaf** component (one that fills one Cell and does not itself
subdivide). If you want side-by-side, you reach for the frame, not a
self-splitting component. This is what keeps the grammar from becoming "nested
splitters all the way down," and it retroactively explains why `split-panel` /
`compare-code` are *sovereign* — they are the old way to fake composition inside
one leaf; a framed `split` is the right way, and those could later be
re-expressed as framed compositions of two simple leaves.

---

## 3. The authoring grammar — and why it drags in the heading ladder

A framed slide needs to express *more than one component in one section* — and it
must stay valid Markdown (no `:::` directive that renders as literal text). The
heading ladder is the natural carrier, but it collides with existing semantics, so
it has to be reasoned, not assumed.

**Today's ladder:** h1/h2 = slide title (masthead-lede); h3 = an intra-component
label/column (`compare-code` left/right, `math.compare` columns, plus plain
sub-headings in ~11 components); h4 = essentially free (font-sizing only).

**The model:** *heading level = 2 + nesting depth.* h2 = slide title · h3 = a
pane (the nested composition) · h4+ = deeper recursion. "N h3s → N panes"
generalises an idiom authors already use (`math.compare`: "3 columns if three
h3s"). The role must be assigned **positionally** — a top-level h3 in a framed
frame is a pane; an h3 *inside a pane's component* stays that component's label —
which is only unambiguous if the engine parses the frame tree. That is the same
"semantic-aware" move as executing the manifest.

**The unavoidable fork** (everything else is downstream of this):

- **v1 — leaf-restriction.** Panes hold leaf components that do not author
  top-level h3 (chart, kpi, plain bullets). Cheap, ships, dodges the
  h3-inside-h3 outline inversion. The h3-using components are mostly the
  self-splitters a pane should not nest anyway. Enforced by a **warn-level lint**
  (catalog-and-warn first, block once settled — the same staged path as the
  `accepts`/`fits` guardrail, `forms.md` §7).
- **full — relativize headings.** The engine renumbers a mounted component's
  headings so its internal structure always sits below its pane title, regardless
  of absolute level. Correct and unrestricted, but it refactors the ~11
  components that hardcode `section > h3` selectors. This is the real "off the
  light rung" commitment and is **deferred**.

---

## 4. The label-carrier audit (the genuinely new artifact)

Pursuing panes exposed that the whole **eyebrow / subtitle / annotation /
key-insight** family is disambiguated by *position relative to the single
title* — which has exactly one degree of freedom and breaks the moment a slide
has more than one title (panes). The current map:

| Role | Carrier | Disambiguated by |
|---|---|---|
| Eyebrow (kicker) | inline-code-only `p` | placed **before** a heading/list |
| Subtitle | inline-code-only `p` | placed **after** a heading *(rendered italic by de-pilling the code — a carrier hack)* |
| Annotation (footnote) | italic-only `p` (`em:only-child`) | **trailing** (after a list/table) — 33 uses |
| Key-insight | blockquote | trailing panel |
| Below-note | trailing prose `p` after a list | trailing |

Two problems compound under nesting: eyebrow and subtitle **share** the
inline-code carrier (distinguished only by *before/after the same heading* — the
hardest adjacency to keep unambiguous when headings multiply; the CSS already
resolves the sandwich case by source order, `base.modifiers.css`), and the
subtitle carrier is dishonest (write `code`, render *italic*).

### Decision: subtitle moves to literal italic-after-title

Empirically verified for this note:

- **italic-after-heading is free** — no CSS rule matches `hN + p:has(> em)`, and
  **zero decks** write a `*…*`-only line right after a heading.
- italic the *carrier* is not free — it is the **annotation** carrier (33 uses),
  but only in **trailing** position.

So the move gives italic a second meaning split **top vs bottom** (subtitle at the
frame's top, annotation at its bottom) — and that is strictly better than the
status quo because it:

1. **Un-shares the worst pair** — eyebrow stays inline-code, subtitle becomes
   italic; they are now carrier-distinct, so the before/after-the-same-heading
   ambiguity that breaks first under panes simply disappears.
2. **Swaps an adjacent ambiguity for an opposite-ends one** — "first thing in a
   frame's title area" vs "last thing in a frame" are far easier for a structural
   parse to keep straight than two labels kissing one heading.
3. **Makes the carrier honest** — write italic, render italic; stop laundering
   emphasis through a code span.

One residual risk: italic reads as prose, so an italic line under a heading (an
epigraph, a pull-quote) has higher latent false-positive risk than a deliberate
backtick line. A framing italic line under a title basically *is* a subtitle, so
the collision is mostly benign — but it warrants a warn-lint, not zero cost.

This is a **better interim carrier, not an escape**: the robust end-state role is
still "the subtitle of the frame this line opens, by subtree," which the engine
must own to be unambiguous at depth.

---

## 5. Subtitle is a per-frame slot, recursively

Stop treating "subtitle" as slide-global. It is a property of a **frame's
title-Cell**: `{ title (heading), optional subtitle (the italic line right
after) }`. The slide's subtitle is the root frame's; a pane's is the nested
frame's. Define it once, recursively. v1 constraint: **subtitles exist only at
frame-title positions; leaves get none** — bounding the ambiguity to places the
engine can already see, consistent with the leaf-restriction.

---

## 6. What ships v1 vs. later, and the open decision

**v1 (smallest real recursion, end-to-end):**
- one `split` framed frame: stage → two equal content Cells, chrome retained;
- h3 = pane delimiter; subtitle = literal italic-after-title; eyebrow stays
  inline-code; the frame caption rides the existing subtitle construct;
- panes hold leaf (non-self-splitting) components only — a **warn-lint** enforces
  it; the engine reads `cells`/`accepts` for the stage subdivision (the first
  manifest *execution*, the "light → medium" coupling step).

**Deferred:** N-up (`grid`) framing; relativize-headings across the ~11
h3-hardcoding components; re-expressing the sovereign split family as framed
compositions.

**The one decision underneath it all:** leaf-restriction (cheap, panes stay
simple, ships now) vs. relativize-heading resolution (correct, recursive, but the
full off-the-light-rung commitment). v1 takes leaf-restriction and lets the
grammar prove itself before paying for the engine work. Making headings
semantic-aware and making the Form manifest execute are the **same** move — the
subtitle is just the cheapest place to see why it is required.
