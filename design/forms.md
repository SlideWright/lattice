# Form — how a slide is composed

**Status:** vocabulary ratified 2026-06-14. Supersedes the *Islands* working
name and the `berth` / `island` / `island-group` terms in
`engineering/decisions/2026-06-11-islands.md`. The **model** below is canonical;
the **rename** of the in-tree identifiers (`isl-*` tokens, `.m-bay` classes, the
`islands:` toggle, the `island`/`berth` symbols) is staged — see §10. Where this
doc names current code, it flags the old identifier so it stays honest during the
transition.

This is the canonical doc for the composition axis. Read it before working on
slide-level layout, chrome, the masthead/footer bands, the resolution contract,
or the Form/Frame catalog. It is the slide-scale companion to the component model
in `design/design-system.md` (§4, *The forms*).

---

## 1. The reframe

Today a Lattice slide is **content with chrome bolted on**. `section` is a flex
column; the eyebrow and title *flow* as the first content children; header,
footer, pagination, and logo are absolutely positioned at repeated magic-number
insets; marks and tints are pseudo-elements. There is **no slide-level
coordinate system** — every chrome element re-derives its own position, and
"where does the title sit" is an accident of flow. That absence is not cosmetic:
it is the direct cause of the chrome-over-content collisions catalogued in
`engineering/decisions/2026-06-13-islands-sketch-density-collisions.md`.

**Form** is the fix, and it is not a new concept — it is the **composition axis
Lattice already ships** (`design/design-system.md`: Function · **Form** ·
Substance), finally given a complete, recursive model instead of a frozen
twelve-value enum. Form answers one question: *how is this slide composed?* The
answer is a tree of three things:

> **A Frame divides a box into Cells; each Cell holds a Tile — or another
> Frame.** The slide's root is a Frame.

That single sentence is the whole system. Everything else is detail.

The name is exact, not decorative: in letterpress a *forme* is the type locked
into a *frame* so every pull prints in identical, fixed position. A Lattice Form
is the same idea — a composition locked to a coordinate frame so it renders
deterministically at any resolution.

---

## 2. The four nouns

| Noun | Is | Role | Replaces (old) |
|------|----|----|----|
| **Form** | the composition **system / axis** | the umbrella — "how is this composed?" | the *Islands* feature name |
| **Frame** | a **slicer** — carves a box into sub-boxes | structure; the root *and* every nested division | `island group` / `group` / informal "frame" |
| **Cell** | a **typed slot** — an empty, sized, positioned box | the seam between a slicer and what fills it | `berth` |
| **Tile** | a **filler** — leaf content sized to fill one Cell | the terminal content | `island` |

There are really only **two kinds of object**: **slicers** (Frames) make boxes;
**fillers** (Tiles) fill boxes. A **Cell** is the connective tissue — the slot a
Frame produces and a Tile occupies. A Frame can be the **root** (it carves the
whole slide) or **nested** (it carves one Cell of a parent Frame); they are the
same type at different scales.

### Reconciling with the component model's vocabulary

`design/design-system.md` §2.5 sets a vocabulary law: **one system word and one
human word per concept, no third synonym.** This doc deliberately *promotes* one
of those words, and that change must land in §2.5 in the **same rename sweep** so
the two canonical docs never contradict. The promotion:

- **`Form`** moves from "the layout *axis* of a component" to "the composition
  *system*" (axis included). It is still one word, still owned here; its scope
  widens to the whole slide. **This doc (`design/forms.md`) owns the Form
  vocabulary** going forward; `design-system.md` owns how a *component* selects a
  Form.
- The twelve values (`split`, `panel`, `grid`, …) are a Form's **Frame types**.
  "Frame" is the new system word for *a Form value acting as a slicer* — it is
  **not** a third synonym for "Form"; it names the slicer object, where "Form"
  names the system. Their human word stays **Layout** (per §2.5).

Until that §2.5 edit lands, treat this section as the authority and §2.5 as
pending. A reader should never have to ask "is a `split` a Form or a Frame?" — it
is a **Frame type** *of* the Form system.

---

## 3. The model is the Composite pattern

For an engineering reader, Form is the **Composite** pattern with one extra type
(the Cell) standing in for the parent/child edge.

```ts
// Anything that can occupy a Cell and paint into a concrete box.
interface Occupant {
  render(box: Box): void;     // paint WITHIN the box — clip, never bleed
}

interface Tile  extends Occupant {        // leaf — knows a source, not a position
  populate(source: Source): Content;
}
interface Frame extends Occupant {         // composite — subdivides and delegates
  subdivide(box: Box): Cell[];
}

class Cell {                  // the typed slot ("socket")
  geometry: Region;           // resolution-blind; resolves to px at render
  accepts: Kind[];            // type constraint on its Occupant
  capacity; fill; gap; clip;
}
```

A **Cell holds a Tile or a Frame**, and the client treats both uniformly — that
uniform treatment *is* the recursion. The pattern earns each of the SOLID
letters, and each answers a question this design was interrogated against:

- **S — Single Responsibility → why we need three nouns.** Each has exactly one
  axis of change. A **Cell** changes when the *layout/geometry* changes (a
  designer moves a slot). A **Tile** changes when a *data source* changes (a new
  `meta:` format, a new state variant). A **Frame** changes when a *composition
  pattern* is added (a new layout). Merge any two and you fuse two reasons to
  change — that is the rigorous answer to "do we really need all three": they are
  three independent axes of change, not three words for taste.
- **O — Open/Closed → the "compose anything" goal.** Add a Tile or a Frame by
  declaring a new manifest; a Cell `accepts` Tiles *by kind*, never by name, so
  it admits Tiles that did not exist when it was authored. (Today, adding a slide
  Tile means editing three render kernels — an OCP *violation*. A manifest the
  engine reads restores it. See §11.)
- **L — Liskov → why recursion is sound, and why the current bug is a bug.** A
  Frame must be substitutable wherever a Cell expects an Occupant: a Cell holding
  a Frame behaves like one holding a Tile (both resolve to a box and render
  within it). The contract every Occupant honors is *render inside your box —
  clip, do not bleed*. The open chrome-over-content defect is precisely an LSP
  violation: a Tile rendering outside its box.
- **I — Interface Segregation.** A leaf Tile implements only `Occupant` +
  `populate`; it is never forced to implement `subdivide`. A Frame implements
  both faces — it `render`s into its parent's Cell *and* `subdivide`s into child
  Cells. That dual role is the Composite.
- **D — Dependency Inversion → why the designer/author split works.** A Frame
  declares a Cell that `accepts: [chrome]`; a Tile declares it `fits` that Cell.
  Both depend on the **Cell abstraction**, neither on the other's concrete. That
  inverted dependency is exactly what lets a *designer* author Frames against
  slot-types while *authors* supply concrete Tiles.

One honest caveat: these are **declarative manifests + CSS**, not runtime
objects. The manifests are an **AST**; `render`/`subdivide` are realized by the
engine's transform kernels + CSS grid; the three render paths are **three
interpreters of that one AST** — which is what HARD RULE 1 ("three render paths
must agree") demands. The Composite pattern only pays off if there is a single
shared tree to interpret. That tree is the manifest (§11); hand-coding it in the
kernels is writing the pattern three times and praying they stay in sync.

---

## 4. Form is the same grammar as components, one level up

Components are **not** a parallel system. A component *is* this grammar at the
content scale:

| Form grammar (slide scale) | A component (content scale) |
|---|---|
| a **Frame** carves a box | a component's `form:` value (split, panel, grid…) carves its box |
| a **Cell** — a typed slot | a component's **slot** (`heading: h1`, `rows: …`) — *a typed slot* |
| a **Tile** — sourced leaf content | the author's **markdown** filling each slot |

Three exact correspondences: a component's **`form:` value is a Frame type** (the
twelve forms in `design/design-system.md` §4 *are* the Frame catalog — that doc
already describes `grid` as "N **cells**…" and `panel` as "two **zones**"); a
component's **slots are Cells**; and a component **renders into the slide's main
Cell** (the `content` Tile, where the component DOM lands). In OOP terms it is
**composition, not inheritance**:

> **A component *selects a Frame and binds Substance into it.*** Its `form:` axis
> picks which Frame carves the box; its Substance (prose / structure / series /
> graph) and Function fill and classify the Cells that Frame produces. A component
> is therefore a Frame *plus* a substance-binding *plus* a function — it *has a*
> Frame, it is not merely *a* Frame. The slide's main Cell is simply
> `accepts: [a component]`.

So Form does not duplicate components — it is the **generalization that contains
them**, and it names the half of the slide components never modeled: the chrome
(kicker, title, meta, logo, status, footer, progress, pagination) and the
coordinate frame holding it.

---

## 5. Properties — the manifest, derived

Each noun's property-set is the manifest schema. A **Frame** and a **Cell** are
authored by a *designer*; a **Tile** binds a *source*.

> **Proposed.** This is the model the manifest *will* encode; the `lib/forms/`
> manifest of §11 is **not yet built**. The authoritative, field-level schema
> (and its on-disk layout) is owned by the engineering ADR, not this doc — see
> §11. What follows is the *shape*, so the vocabulary is concrete.

### Frame — the slicer
- **`id` / `form`** — its name and the Form value it realizes (`split`, `panel`,
  `grid`, …).
- **`kind`** — `root` (carves the slide) · `framed` (docks in the main Cell,
  keeps the chrome Frame) · `sovereign` (claims the whole canvas and
  **suppresses** chrome Cells — this is why a `split-panel` reads as "distinct
  from everything else": it *replaces* the frame).
- **`subGrid`** — the internal grid template + ratios.
- **`cells`** — the Cells it produces (each a full Cell definition — the
  recursion).
- **`suppresses`** — chrome Cells a sovereign Frame hides.

### Cell — the typed slot
- **`id` / `region`** — name and band position (masthead · stage · footer ·
  left/centre/right).
- **`geometry`** — `position` + `size` in **relative units** (resolves to px at
  render — see §6), `shape` (rectangular today).
- **`z`** — z-plane (0 canvas → 1 atmosphere → 2 content → 3 chrome → 4
  annotation).
- **`accepts`** — which Tile/Frame kinds may dock (the containment contract — §7).
- **`capacity`** — `one` or `stack`.
- **`fill`** — how an *underfilling* occupant distributes: `start` · `center` ·
  `end` · `optical-center` · `anchor`. The difference between "grid of correct
  boxes" and "board deck."
- **`gap` / `clip`** — guaranteed gap to neighbours; `overflow: hidden` (cut at
  the Cell, never bled).

### Tile — the filler
- **`id` / `kind`** — name and family: `surface` (canvas, rule, atmosphere) ·
  `chrome` (kicker, title, meta, logo, status, footer, progress, pagination) ·
  `content` (the component) · `review` (annotation).
- **`fits`** — which Cell(s) it may dock in (the dual of the Cell's `accepts`).
- **`z`** — its z-plane.
- **`population`** — *where its content comes from*: front-matter (`meta:`,
  `logo:`), authoring grammar (`` `eyebrow` ``, `## h2`), state variants, the
  component DOM, or derived (divider sections → progress, paginate → pagination).
  **This binding is what makes a Tile a Tile** — a Cell is an empty box; a Tile
  knows what to put in it and where that comes from.
- **`visibility`** — `hideToken` (`no-kicker`, `no-footer`, `silent`, …),
  `default`, and any `condition`.
- **`status`** — `shipped` · `partial` · `new` (the registry's "Today" column in
  the superseded ADR).

---

## 6. Cells are resolution-blind boxes (the non-negotiable contract)

A Cell is **not** defined in pixels. Its geometry is **relative** (container-query
units — % of the slide), so one Cell definition resolves to a concrete HD-sized
px box at HD and a concrete 4K-sized px box at 4K, from the same definition.
There is no "HD Cell" and "4K Cell" — there is one Cell, resolved at a chosen
resolution. Resolution is a **render-time parameter** (the `size:` directive),
never authored into the Cell.

> **Every Cell resolves to a deterministic px box appropriate to the active
> resolution, independent of its content.**

This is the entire point. A chart or a Mermaid graph needs a parent with
**concrete pixel dimensions** or it collapses or overflows. The old flex column
made the content box *content-driven* (height = whatever the content is) — the
wrong order of causality. A Cell, being a grid track of a fixed-size slide,
**computes to px before its content lays out**, at any resolution. It is the same
philosophy as the rest of Lattice: layouts are *palette-blind* (themes supply
colour); Cells are *resolution-blind* (the `size:` directive supplies the pixels).

### The gap + clip guarantee — Cells never touch or bleed

The dual of "every Cell is a concrete box" is a **guarantee**, not a default:
**every Cell keeps a defined gap to its neighbours, and overflow is clipped, not
bled.**

- **Defined gaps.** Each Cell carries a guaranteed gap to the next (masthead↔body
  hairline, body↔footer safe-area, stacked Cells on a gap token). **No two Cells
  share an edge.**
- **Clip, don't bleed.** `overflow: hidden` is the rule. A too-long title or meta
  line is **cut at its Cell**, never spilled across a neighbour.

**Which noun owns which behaviour** (so it lives in exactly one place, not three):

- **Clip is a Cell behaviour.** Each Cell cuts its own content at its own edge
  (`clip` is a field on the Cell). A **Tile** needs no clip of its own: it renders
  *inside* a Cell, so the Cell's clip already protects it — giving Tiles their own
  would duplicate the Cell's job.
- **The overflow warning is a slide / root-Frame signal**, not a Cell one — an
  authoring aid that the whole composition overflows (a z4 review-plane cue),
  drawn once per slide as a red ring **plus a labelled "OVERFLOWS" tab** (text,
  so it doesn't rely on colour alone — WCAG 1.4.1). It is **preview-only**: the
  loud signal appears where the author is fixing (VS Code / Drawing Board /
  playground), and is **never burned into an exported deck** — a delivered slide
  should not overflow, and a red box in front of a board is worse than the
  subtle clipping. On **export** the content simply clips and the export **warns
  the author with the exact pages** to fix.
- **No content "fade" at the cut.** A gradient-to-background scrim was considered
  and rejected: it is a *scrollable-web* idiom ("more below — scroll"), which is
  false on a fixed-page slide; it hides authored content, reads as a render
  artifact on a boardroom PDF, and alpha gradients export as transparency-group
  layers some PDF viewers mis-render (see `engineering/gotchas.md`). The honest
  pair for a fixed page is **clip** (prevents bleed) + **ring** (fix-it signal).

So clip attaches to the Cell; the ring attaches to the slide; Tiles inherit their
box guarantee from the Cell they fill.

This is the contract the open chrome-over-content defect
(`engineering/decisions/2026-06-13-islands-sketch-density-collisions.md`)
violates — chrome painted over content is a Cell failing to reserve its box and
failing to clip. In the Composite framing (§3) it is the **LSP violation**: an
Occupant rendering outside the box it was given. Stating it as a guarantee here is
deliberate — Form is only "boardroom 10/10" if the guarantee holds, which is also
why the **`fill` discipline** (§5) is first-class: a correctly-placed box that
top-left-anchors its content is geometry, not a board deck.

---

## 7. The designer / author split — Form is a "structural theme"

Form draws the create/consume line exactly where Lattice already draws it for
colour:

| | **Theme** | **Form** |
|---|---|---|
| Owned by | designer | designer |
| Authored in | theme tooling | the Workbench (a future Frame studio, AI-assisted) |
| Author action | *selects* a theme | *selects* a Frame (`form: <name>`) |
| Supplies | colour tokens | structure (the coordinate frame + Cells) |
| Consumer is blind to it | layouts are palette-blind | Tiles are frame-blind |

A theme is a designer-owned **colour** bundle an author selects; a Frame is a
designer-owned **structure** bundle an author selects. Same contract, orthogonal
axis. Lattice ships default Frames; designers add more; authors pick one and fill
its Cells.

> **What ships vs. what's proposed:** author *selection* of a Frame exists today
> (the `islands:` class toggle, renaming to `form:` — §10). The designer-facing
> **Workbench Frame studio** and **AI-assisted Frame generation** are future work,
> not built.

**The containment contract is the guardrail that makes this safe.** Because
Frames can be *generated*, something must stop a footer Tile from being wired into
a masthead Cell. That something is the `accepts` / `fits` pair (§5): the
author-lint and the AI-generation guardrail are the same data. Capture it from
day one; **stage the enforcement** — catalog + warn-level lint first, blocking
gate once the vocabulary settles (the same opt-in-then-graduate path the masthead
lift already followed).

---

## 8. The Frame and Tile catalogs (today)

**Frames** are the twelve Form values (`design/design-system.md` §4): `bookend`,
`divider`, `canvas`, `grid`, `stack`, `ledger`, `panel`, `matrix`, `scatter`,
`spatial`, `timeline`, `split` — plus the **root** chrome Frame (the masthead /
stage / footer bands) and sovereign Frames (`split-panel`, `title`,
`image-full`).

**Tiles** are the fourteen leaves across the four z-planes (the registry in the
superseded ADR): the surfaces `canvas` · `rule` · `atmosphere` · `watermark`;
the chrome `kicker` · `title` · `meta` · `logo` · `status` · `footer` ·
`progress` · `pagination`; the `content` Tile; and the `annotation` review Tile.
Five of these (`meta`, `progress`, `status`, the generalised `watermark`, the
formalised `annotation`) are the boardroom gaps the model gives a principled home
instead of cramming into the footer or eyebrow.

---

## 9. The recursion, in one place

```
SLIDE  ──is a──▶  root Frame
  └─ divides into Cells ─┬─ Cell (masthead) ─▶ holds chrome Tiles (kicker, title, logo, meta…)
                         ├─ Cell (stage)    ─▶ holds the content Tile (a component)…
                         │                       └─ which is itself a Frame ─▶ Cells ─▶ Tiles…
                         └─ Cell (footer)   ─▶ holds chrome Tiles (footer, progress, pagination)
```

A sovereign Frame docked in the stage Cell suppresses the masthead/footer Cells
and re-carves the whole canvas — that is the entire mechanism behind "this slide
looks completely different." Recurse until every Cell holds a Tile.

---

## 10. Status and the rename

The **model** is canonical now. The **identifiers** rename in a staged sweep
(pre-release, so no compatibility shims). The map:

| Concept | Old identifier | New |
|---|---|---|
| System / feature | "Islands" | **Form** |
| Composition axis + `form:` field | `form` | **`form`** *(unchanged — now canonical)* |
| Slicer | island group / group | **Frame** |
| Slicer catalog | `FORMS` constant values | **Frame types** |
| Typed slot | `berth` | **Cell** |
| Leaf filler | `island` | **Tile** |
| CSS tokens | `--isl-inset-x/-y`, `--isl-page-reserve` | `--frame-*` / `--cell-*` |
| CSS classes | `.isl-masthead`, `.m-stage`, `.m-bay` | `.frame-*` / `.cell-*` |
| Deck/section toggle | `islands: on / off / minimal` | **`form: <frame>`** (author selects a Frame) |
| Transform | `transformMastheadSection` / `lib/core/masthead-lift.js` | `lib/forms/cell/masthead/masthead.transform.js` (kernel, co-located) + `lib/transformers/masthead-lift.js` (adapter) |

Two cautions for the sweep, captured so the rename is a reviewed plan, not a blind
regex: (1) **`form` is a substring of `transform`** — and the engine is full of
*transform* (`lib/transformers/`, `applyToRenderedHtml`). The `form:` axis stays,
so there is no "form" sweep; only `island`/`berth`/`isl-*` are retired, which are
unique tokens. (2) The rename must land in **all three render paths** (emulator,
marp-cli plugins, runtime) in lock-step (HARD RULE 1), with the cross-renderer
parity gate and the per-component galleries asserting no pixel drift.

What ships **today** (under the old names) is unchanged behaviour: the masthead
lift, the `meta` / `progress` / `watermark` injectors, and the `islands:` toggle
with its skip-list. The open density defect (§1 reference) is the next behavioural
fix and is independent of the rename.

### The model is realized by B — flex + in-flow bands (section-as-grid retired)

Two mechanisms were once weighed (per the originating ADR): **B — berth/Cell
overlay** (keep `section` flex; Cells are content-height in-flow bands / reserved
token-contract bands, component bodies stay direct children of `section` —
*zero component risk*) and **A — section-as-grid** (`section { display:grid }`, the
body wrapped in a `.cell-stage` element; a large per-component migration) — **A is
RETIRED (see the next paragraph); named here only for the record**.

**B is now the canonical end state; A (section-as-grid) is retired — rejected on
merit, not deferred** (`engineering/decisions/2026-06-16-retire-section-as-grid.md`).
A fixed-track grid fights content-driven sizing — the masthead Cell was deliberately
moved *from* a fixed-height box *to* an in-flow content-height band exactly to fix
the dead-space-under-short-titles / can't-grow-for-two-lines failure, which a grid
row would reintroduce — and it costs responsiveness (desktop/tablet/mobile) and
feasibility (~373 `section.X > …` selectors) for a marginal payoff. So component
bodies staying **direct children of `section`** is correct by design, permanently;
there is no `.cell-stage` wrapper to migrate toward.

Changes are still gated so an unintended visual change fails a gate, not a
reviewer's eye: the per-component galleries (light + dark page counts asserted) and
`tools/pixel-check.js` before/after on the baseline deck.

---

## 11. Why Form is first-class — the manifest

The gap this doc closes is not just naming. Form was **hidden**: the model lived
only in a dated decision note and a one-line Drawing-Board tooltip, while the
slicer catalog (the twelve forms) was a frozen constant + prose with no manifest,
and every Tile was injected by hand-written code in three render paths. That is
an Open/Closed violation and a single-source-of-truth violation at once.

The fix is to treat Form exactly like the component model: a **single source of
truth the engine reads**, generated into a machine catalog beside
`dist/docs/components.json`.

```
lib/forms/
  frame/<frame>/<frame>.manifest.json    # slicers — the selectable structural "themes"
  tile/<tile>/<tile>.manifest.json       # fillers — the registry rows, one folder each
    tile/<tile>/<tile>.transform.js      #   …its kernel (applyToHtml + applyToDom), and
    tile/<tile>/<tile>.css               #   …its CSS — co-located, like a component
  cell/<cell>/<cell>.cell.json           # the shared slot definitions Frames emit,
    cell/<cell>/<cell>.css               #   …each Cell's own CSS — co-located too, and
    cell/<cell>/<cell>.transform.js      #   …its kernel, when the Cell has one (masthead)
  schema/cell.schema.json                # the JSON-schema for a Cell
```

Like a component, a Tile folder owns **everything** — manifest, kernel, CSS — so
it is self-contained, not scattered across `base.variants.css` and two hand-copied
render-path injectors. Every logic-bearing Tile works this way now (`watermark`,
`meta`, `progress`; the CSS-only `status` co-locates its chip CSS) — issue #356.
The **Cell** CSS is now co-located the same way: the Form chrome (the root Frame
box, the masthead/stage/footer Cells, the stage fill discipline) lives under
`cell/<cell>/<cell>.css` (`stage` · `masthead` · `masthead-lede` · `masthead-bay`
· `footer`), globbed into the same cascade slot. The masthead Cell's **transform**
is co-located too — `cell/masthead/masthead.transform.js` (the kernel) beside its
manifest + CSS, with the registry adapter in `lib/transformers/masthead-lift.js`,
mirroring how a component splits kernel↔adapter. The masthead + footer Cells are
fully self-contained; still to follow: the Frame chrome.

The manifest is **load-bearing, not descriptive**: it drives the `--frame-*` grid
and the Tile injectors and the `accepts`/`fits` validation, so adding a Frame or a
Tile is *a folder, not edits to three kernels*. As of the "light" coupling
(`2026-06-16-form-manifest-medium-independent-contract.md` §4.2), a build gate also
enforces that every Cell's geometry/gap **token reference resolves** to a real CSS
custom property — so the manifest↔CSS link can't silently drift (the structural
`z`/`suppresses` couplings stay descriptive until §4.3/§4.4 land). This is what makes designer- and
AI-authored Frames (§7) possible at all — a Frame defined only in three
hand-edited kernels cannot be generated; a Frame defined as data can. Reuse the
component infrastructure (the manifest loader, the portal generator, the schema,
the Astro page) — generalise it, do not clone it (HARD RULE 15).

**Doc ownership.** This doc owns the **model and vocabulary** of Form. The
**concrete schema, on-disk layout, and execution plan** are owned by the
engineering ADR (`engineering/decisions/2026-06-15-form-implementation.md`). The
directory sketch above is illustrative of the *shape*; the
ADR is authoritative for the *fields*. Keeping the split explicit is what stops
the two docs from drifting (the §2.5 hazard, stated as a rule).

---

## See also

- `engineering/architecture.md` § *CSS owns layout; JS is a bounded
  post-processing set* — the implementation contract: where each Frame/Cell/Tile
  construct lives (CSS vs the cataloged JS transforms) and why.
- `engineering/decisions/2026-06-15-form-implementation.md` — how this model was
  built in code (the B-now decision; what ships vs. staged).
- `design/design-system.md` §4 — the twelve forms (the Frame catalog) in the
  component model.
- `engineering/decisions/2026-06-11-islands.md` — the originating design note
  (superseded vocabulary; the staged execution plan is still live).
- `engineering/decisions/2026-06-13-islands-sketch-density-collisions.md` — the
  open chrome-reservation defect (the LSP violation §3 names).
