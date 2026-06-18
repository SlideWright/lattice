---
status: in-progress
summary: Make components adaptive to the box they occupy (not the deck's named size) via box-local @container queries over four structural families — Wide · Square · Tall · Strip. Pilot landed for 5 components; full-catalog sweep remains.
version: 1
supersedes: none
builds-on: 2026-05-10-multi-resolution-strategy.md, 2026-06-16-social-mobile-portrait-sizes.md, 2026-06-16-orientation-in-the-form-model.md, 2026-06-16-retire-section-as-grid.md
---

# Component adaptive sizing

A component today assumes **the selected size is the size it renders at**. It is
fixed; size is an afterthought. This note designs the move from *deck-global,
build-time* size handling to *box-local, render-time* adaptivity — a component
that reflows to **whatever box it actually occupies**, whether that is a full
slide, half of a `split`, a grid quadrant, a landscape projector, or a 9:19.5
phone canvas.

> Status: **pilot landed (5 components).** The mechanism is built and rendered
> through the real engine for `kpi`, `list`, `matrix-2x2`, `cards-grid`, and
> `split-compare`; landscape output is byte-identical. Implementation notes and
> the deltas from this design are in §11. The full-catalog sweep (§8.4) is the
> remaining work.

---

## 1. What already exists (so we extend, not reinvent)

Lattice already ships **two** size mechanisms, solving two *different* problems.
Naming them precisely is what makes the remaining gap legible.

1. **Resolution** — HD ↔ 4K, *same shape*. Solved cleanly
   (`2026-05-10-multi-resolution-strategy.md`). Every `--fs-*`/`--sp-*` token is a
   `cqi` unit measured against `section { container-type: size }`. `4.6875cqi` is
   60 px at HD and 180 px at 4K. Proportions hold with zero rules. **This is
   genuinely adaptive and done.**

2. **Orientation** — landscape ↔ square ↔ portrait. Solved *coarsely*
   (`2026-06-16-social-mobile-portrait-sizes.md`,
   `2026-06-16-orientation-in-the-form-model.md`). The engine classifies the
   `size:` front-matter into **three buckets** by aspect (`>1.05` landscape ·
   `0.95–1.05` square · `<0.95` portrait), stamps a deck-wide `data-orientation`
   on every `<section>`, folds a single `--canvas-scale` magnitude multiplier into
   the tokens, and runs per-component CSS keyed on `[data-orientation=…]` to
   collapse grids, stack split rails, and reorient Mermaid. An `orientation`
   manifest field + `lint:deck` declares which layouts survive portrait.

So "components are not adaptive" is already *false for resolution* and *partly
false for orientation*. What it points at — correctly — is what neither
mechanism touches.

---

## 2. The reframe — "size" is the wrong noun; three things are tangled in it

The single diagnostic fact: **Lattice uses container _units_ (`cqi`) everywhere
and container _queries_ (`@container (…)`) nowhere — zero of them.** Adaptation is
a *deck-global, build-time stamp*, never a *box-local response*. Three
consequences follow:

- **A component cannot adapt to its own box.** Place a component in *half* of a
  `split` Frame. The deck still says `data-orientation: landscape`; `cqi` still
  measures the whole *section*, not the half-width Cell. The component renders as
  if it owned the full slide. It is adaptive to the *deck's* shape, never to *its
  own* available room. **This is the truest sense of "not adaptive."**
- **Structure is a 3-step function but content need is a continuum.** "portrait"
  lumps 4:5 (room for two columns) with 9:19.5 (wants one tall stream) into
  *identical* reflow; 16:9 and 4:3 are both "landscape" → identical layout.
- **The signal is the _named size_, not a measured property.** Register a `21:9`
  or a foldable tomorrow and every component is blind to it until someone writes
  new rules.

**Separate the two kinds of change, because they want different mechanisms:**

| Kind of change | Mechanism | Granularity |
|---|---|---|
| **Scale** — type/spacing grows or shrinks | `cqi` / `clamp` — *already done* | **Continuous.** No buckets. |
| **Structure** — 2-col → 1-col, rail stacks, reorder, drop | `@container` query | **Bucketed** — a small set of *families*. A reflow is inherently a step. |

The answer to "adaptive for each size, or a group?" is therefore **neither a
per-size variant nor a hand-listed group**: a component adapts to **measured
properties of the box it occupies** (aspect class + available inline-size), and
named sizes map onto those many-to-one, automatically. *Continuous for scale,
bucketed-by-measured-family for structure.*

---

## 3. The four structural families

Structure is bucketed into **four** families, split where real composition
changes — keyed on the **aspect ratio of the container** (the Cell if nested,
else the slide), with inline-size as the secondary continuous input. Splitting
the *extremes* (portrait → Tall vs Strip) is higher-value than splitting
landscape, because (a) Tall and Strip genuinely want different structure while
16:9-vs-4:3 is mostly a *scale* difference inline-size already handles, and (b)
the Tall/Strip families get heavy use from **nested narrow Cells on landscape
decks**, not just from portrait decks.

| Family | Container aspect (≈) | Composition intent | Canonical sizes / cases |
|---|---|---|---|
| **Wide** | ≳ 1.05 | horizontal — side-by-side, multi-column, wide tables | 16:9, 4:3, ultrawide; full-slide landscape |
| **Square** | 0.9–1.05 | balanced — 2×2 grids, 2-up | 1:1 social; a quadrant Cell |
| **Tall** | 0.5–0.9 | vertical-leaning — 1–2 columns, paired rows, rail on top | 4:5, 9:16; half of a `split` |
| **Strip** | < 0.5 | single-column stream — one unit per band, biggest type | 9:19.5 mobile; a narrow nested Cell |

Boundaries are starting values, tuned in visual review. Scale stays continuous
across all four (the `--canvas-scale` ramp, per §5).

---

## 4. The architecture — box-local `@container`, composed with Frame/Cell

The move is **(B) box-local**, chosen over pushing the deck-wide stamp because
only box-local makes the *component* (not the deck) adaptive and is the only
thing that works when a component is nested in a Cell.

1. **Name the containers.** `section` is already `container-type: size`; give it
   `container-name: slide`. Every Cell that bounds content (the
   `masthead`/`stage`/`footer` bands, and each `split`/`grid` Cell) gets
   `container-type: size; container-name: cell`.
2. **Express the four families as a shared breakpoint set.** Because Lattice
   *builds* its CSS, a small codegen helper expands a `@family tall { … }` author
   shorthand into the right `@container cell (aspect-ratio …)` block, so the four
   thresholds live in **one** place (HARD RULE #7 spirit — don't duplicate the
   ladder per component). Raw `@container` is the fallback where codegen is
   overkill.
3. **The component carries its own reflow across the four families**, querying its
   **nearest named container** — its Cell if nested, else the slide. A component
   in a half-width `split` Cell now sees a *Tall* box and reflows to it, on a
   landscape deck. **This is the capability that is impossible today.**
4. **Retire `data-orientation` into a fallback**, not a primary signal — kept only
   where a query is genuinely awkward (or for any renderer that lacks size
   queries; none in our pipeline — §7).

**Composition with the Form model is clean and does _not_ revive
`section-as-grid`** (`2026-06-16-retire-section-as-grid.md`):

- The **Frame** governs *cell arrangement* and reflows per family against the
  **slide** container (a `split` is side-by-side in Wide, stacked in Tall).
- The **component** governs *its internal content* and reflows per family against
  its **cell** container.
- Both consume the *same* four-family ladder. The seam the existing ADRs drew —
  Frame owns cell arrangement, component CSS owns content layout — is preserved
  exactly; container queries just give each side a *local* signal instead of a
  deck-global one.

---

## 5. Degradation ladder — what "adapt" actually does

Per component, walking from widest to narrowest box:

- **Wide → Square:** keep multi-region, rebalance (4-col → 2×2; wide table keeps
  columns).
- **Square → Tall:** collapse to 1–2 columns; pair rows; a side rail moves above
  its panel.
- **Tall → Strip:** single-column stream, one unit per band, **demote or drop
  tertiary content**, biggest type. This is where *re-rank / drop* enters (fewer
  KPIs, truncated secondary lines) — not just reflow.

So the ladder is **reflow** (Wide→Tall) then **re-rank/drop** (Tall→Strip).
**Re-compose** (swap to a different Frame) is reserved for the handful of
load-bearing horizontal layouts that cannot survive narrowing — the eight
`orientation: ["landscape"]` layouts from the portrait audit (`gantt`, `journey`,
`kanban`, `roadmap`, `state-chart`, `compare-code`, `image`, `redline`). They
either declare themselves Wide/Square-only (lint steers authors away) or earn a
bespoke Strip variant later.

---

## 6. The manifest contract

Generalize the existing `orientation: ["landscape","portrait"]` field into a
**`families` support array** (`["wide","square","tall","strip"]`), surfaced into
`dist/docs/components.json`. It stays a *declared, audited fact* (the manifest
describes, the CSS makes it true — per
`2026-06-16-orientation-in-the-form-model.md`), populated by a real-render
audit and enforced both ways by `lint:deck`: a Strip/mobile deck warns when it
uses a Wide-only layout. The eight landscape-only layouts become
`["wide","square"]`. `orientation` can remain a derived alias during transition.

---

## 7. Viability — proven, not assumed

The whole direction rests on `@container` **size + aspect-ratio** queries firing
in the **PDF export Chromium**, which carries a known engine-quirk history (HARD
RULE #12: `:has()` is silently broken in the *retired Marp-preview* Chromium).
Verified empirically through the owned pipeline (Puppeteer-bundled **Chrome 131**;
container size queries shipped in Chromium 105):

```
tall box  (aspect < 1) → rgb(0,128,0)  green   ✅ query fired
wide box  (aspect > 1) → rgb(255,0,0)  red     ✅ query correctly did NOT fire
PASS — @container aspect queries fire (incl. the nested case)
```

#12 does **not** apply: that landmine was the retired Marp-preview engine; the
owned render path (HARD RULE #1) is Puppeteer 131. **(B) is viable.** The
derisking test belongs in the integration tier before the sweep lands.

---

## 8. Scope & sequencing

1. **Derisk (done):** confirm `@container` size/aspect queries render in export +
   runtime preview (§7). Add a permanent integration guard.
2. **Foundation:** name containers (`slide` + `cell`); land the four-family
   breakpoint ladder + the `@family` codegen helper; keep `data-orientation` as a
   fallback. No visual change yet.
3. **Pilot:** convert 2–3 highest-value layouts — `split`, `kpi`, a grid
   (`matrix-2x2`) — to box-local four-family reflow. The acceptance test is the
   **nested case**: a component in a half-width `split` Cell reflows to *Tall* on
   a *landscape* deck. Ship `examples/adaptive-*.md` + committed PDFs.
4. **Sweep:** roll across the catalog via parallel maker-checker reviewers
   (`engineering/visual-review.md`), each viewing whole slides at multiple box
   shapes; populate the `families` manifest field from real renders.
5. **Retire** the `data-orientation` stamp where container queries fully cover it;
   leave it only as documented fallback.

---

## 9. Non-goals

- **Not** reviving `section-as-grid` — bands stay in-flow, content-height.
- **Not** making the manifest *generate* layout (Medium/Heavy coupling stays
  deferred behind a second renderer, per
  `2026-06-16-form-manifest-medium-independent-contract.md`).
- **Not** per-named-size variants — components never branch on `hd`/`story`/
  `mobile`; they branch on the *measured family* of their box.
- **Not** touching scale — type/spacing stays continuous on `cqi`/`--canvas-scale`.

---

## 10. Open tuning (defaults assumed, settled in visual review)

- Exact aspect thresholds between the four families.
- Whether `--canvas-scale` should also become per-family box-local (compute the
  ramp inside each `@container` block) or stay a deck-wide value.
- Whether `data-orientation` is retired fully or kept permanently as a coarse
  fallback for the chrome bands.
- Family names (`Wide · Square · Tall · Strip`) vs alternatives.

---

## 11. Implementation notes (pilot, 2026-06-18)

What building the pilot taught us — deltas from the design above, kept so the
sweep doesn't relearn them.

### What container queries can and can't do (the load-bearing constraint)

A `@container` rule **cannot style its own container element** — only
descendants. So a component's reflow splits in two:

- **Descendant structure** (a metric grid `> ol`, a card grid `> ul`, the option
  cells) — reflows via `@container lattice (aspect-ratio …)`. This is the box-local
  win and it composes with nesting.
- **The section element's *own* layout** (e.g. `split-compare`'s
  `flex-direction`) — a `@container lattice` rule on the section would be querying
  the very box it's trying to restyle, and silently no-ops. For a **full-slide**
  layout this is fine: the deck orientation *is* the component's box, so the
  section-element stack stays on the `data-orientation` stamp. It is not a
  fallback — it's the correct signal for that one case. `split-compare` keeps its
  rail/options stack on `data-orientation` and uses `@container` only for the
  nested option-cell columns.

This means the deck-wide stamp is **not** fully retired even for migrated
components: it remains the signal for section-element layout. Box-local
`@container` owns everything that is a descendant.

### Specificity: the old `[data-orientation]` reflows were (0,2,2)

`section.kpi[data-orientation="portrait"] > ol` is (0,2,2) — high enough to beat
per-variant grid rules (`section.kpi.spotlight > ol`) and hardened base rules
(`section.cards-grid:not(:has(.cards-grid-inner)) > ul`, also (0,2,2)). A naïve
`@container { section.kpi > ol }` is only (0,1,2) and **loses**. The pilot
restores the weight with a **doubled class** (`section.kpi.kpi > ol`,
`section.cards-grid.cards-grid > ul`, `section.list.list …`, `section.matrix-2x2.matrix-2x2 …`)
— the role the attribute played. `matrix-2x2` happens to have no competing
(0,2,2) rule, but is doubled too for consistency and future-proofing. **Sweep
rule: replace a `[data-orientation]` reflow at the same specificity it had.**

### The nested-cell reflow is blocked on a non-`cqi` scale anchor (staged)

This is the sharp finding, and it's why the genuinely-nested case is **not yet
shipped in a real component**. To let a component reflow to its *cell's* aspect,
the cell must be a `container-type: size` query container. But the moment a cell
becomes a size container, **every `cqi`-based token inside it re-bases to the
cell** — `cqi` is resolved at the *use site*, so a half-width cell halves the
type. The pilot first tried to anchor scale by setting `--_sec-1cqi: 1cqi` on a
non-container ancestor (`.options`); that **does not work** — `cqi` *inside a
custom property* is still substituted lazily at the use site, so it resolves
against the cell anyway (measured: option bullets dropped to ~5px on a landscape
slide). A maker-checker caught it before commit.

The only correct fix is a **non-`cqi`** `--_sec-1cqi` (a concrete px = slide-width
/ 100) stamped on `section` so it *inherits* into any nested cell and pins scale
to the slide. The runtime already does this live; the engine export path does
**not**, and adding it there is byte-affecting (it surfaced latent under-sizing on
`title`/anchor slides when trialled globally) — i.e. an **export change requiring
sign-off**. So:

- **Shipped now:** box-local reflow of *descendants* of the section (every pilot
  component) — no nested container, no re-basing. This is the bulk of the value.
- **Staged behind sign-off:** the engine `--_sec-1cqi` px stamp, after which a
  Cell can become a `lattice` container and a component will reflow to *its cell*
  with type still slide-anchored. The foundation (shared `lattice` container name)
  is in place; only the scale anchor is missing.

**Sweep rule:** do **not** make a Cell a `container-type: size` until the engine
stamps a px `--_sec-1cqi`. Until then, a component reflows against the *section*
(which is a `lattice` container) — correct for full-slide use, future-proof for
nesting.

### Manifest field: `adapt.families`, not `families`

`families` is already taken — it names opt-in **modifier groups** (e.g.
`state-markers`), validated against a vocabulary in `lib/components/index.js`. The
box-family support list is therefore nested as **`adapt.families`**, alongside the
declared intent (`priority` / `droppable` / `keepTogether` / per-family
`capacity`). The legacy `orientation` field still derives families for unmigrated
components (`lib/adaptive/families.js` `ORIENTATION_TO_FAMILIES`).

### What the demo shows

`examples/adaptive-sizing.md` at `size: story` (9:16) shows the five components
reflowing to a tall frame purely from box-local queries on the section: `kpi`
linearises and (further down) sheds pills, `matrix-2x2`/`cards-grid` collapse to
one column, `list` de-balloons, `split-compare` stacks its rail above
single-column options. No slide selects a size. The *nested* inversion (deck tall,
cell wide, content tracks the cell) is demonstrated standalone but not yet in a
shipping component — see the staged anchor above.

### Single source + drift guard

The four thresholds live once in `lib/adaptive/families.js` (CSS `@container`
can't read `var()`, so the numbers are literal in each component's CSS);
`test/unit/adaptive/families.test.js` scans every component stylesheet and fails
if a `@container lattice (aspect-ratio …)` uses a non-canonical boundary.
