---
status: proposed
summary: AI component generation that produces components which feel native to Lattice's 10/10 boardroom set — not generic CSS. The design has three pillars, mirroring the proven Theme-AI architecture (#613, model-proposes-within-a-contract / deterministic-code-disposes): (1) a CONCRETE knowledge file (the component analog of THEME_CANON) that teaches the model Lattice's whole design language — the Form vocabulary (Frame/Cell/Tile, the `section.X > .cell-stage` skeleton), the named slots (eyebrow/title/subtitle/pill/key-insight/footer/pagination/logo), THE TOKEN SYSTEM as the composition vocabulary (palette/surface/spacing/the 12-token --fs-* type roles/radius/pill/font/categorical/state — never an invented value), the hard invariants WITH their why (no margin #20, var(--token) #3, --fs-* #4, card-nesting #5, scoping #7, US #21), the 12-bucket taxonomy, the operationalized 10/10 rubric, the universal recipes (cards-as-`li`, grid-vs-flex-matrix, elevation, state-as-shape, `@container lattice` reflow), and — the make-or-break deliverable — 2–3 fully-worked examples (prompt → manifest+CSS+skeleton). (2) DEDUP-FIRST: before generating, embed the request (the architect model already ships a bge-small embedder) and rank it against the component catalog (dist/docs/components.json), SUGGEST the top similar components with a reuse nudge, then proceed (default-on, Workspace-configurable). (3) GUARDRAILS: gateComponent + findCssExfil + a new design-audit (margin/token/slot/--fs-*/scope), with an AUTO-REPAIR-THEN-GATE layer (snap stray margin→padding, raw value→nearest token, add missing scope) mirroring the theme AA-repair, then the hard gate blocks anything still off. The knowledge file is grounded in a profile of all 54 shipped components (what good looks like, derived not invented). Extends the #618 DSL knowledge-file outline (§10) with the structural+aesthetic backbone the model needs before it ever reaches the DSL. PROTOTYPE-FIRST: build the knowledge file + dedup + audit/repair against ONE bucket (inventory) and bench generated components against the 10/10 rubric before widening.
---

# AI component generation — native-feeling components, not generic CSS

## 1. The problem

The Component Studio can save, share, and (soon) AI-generate components. A model
asked to "make me a component" with no grounding produces *generic* CSS — it does
not know that Lattice slides compose as **Frame → Cell → Tile**, that the body
lives in `section.<name> > .cell-stage`, that there is **no `margin`** (space is
`gap`/`padding`), that every color is a `var(--token)`, that type is the 12-token
`--fs-*` role system, that a card is a `<li>` whose title auto-bolds, that an
eyebrow is an inline-code paragraph above the heading. The result looks foreign
next to the 53 shipped components — the "ugly as sin" failure mode.

The fix is the same shape that made the **Theme AI** work (#613): the model never
owns correctness; it **proposes within a tight, concrete contract** and
**deterministic code disposes** (derive → audit → AA-repair). For themes the
contract is `THEME_CANON` + `deriveTheme` + `auditBoth`. For components the
contract is a **knowledge file** + **dedup** + **gate/repair**, all grounded in a
profile of what the existing components actually do.

This doc is grounded in a read-only **profile of all 54 shipped components** (the
"what good looks like" pass) and the distilled **semantic contract** from the
design docs. It **extends** the #618 transform-DSL knowledge-file outline (§10),
which is DSL-and-safety-centric; this supplies the structural + aesthetic backbone
the model needs *before* it ever reaches the DSL.

## 2. What "good" looks like — the universal DNA (profiled, not invented)

Every shipped component, across all 12 buckets, obeys the same skeleton. These are
the patterns the knowledge file must teach as *defaults*, because they are what
makes a component read as native Lattice:

1. **Root = `section.<name> > .cell-stage`, a flex column.** The component never
   styles its own title — the eyebrow + `h2` auto-lift into the masthead band
   (`.cell-masthead`). The body lives in the bounded `.cell-stage` (which clips +
   reports overflow). *Exception:* sovereign **split** forms (split-compare,
   compare-code) claim the whole canvas and own their own cells.
2. **Cards are list items, not `<div>`s.** `ul/ol > li` with
   `list-style:none; padding:0; margin:0` on the list, `flex:1` per card. The lead
   text **auto-lifts to `<strong>`** (slotLabelLift) — author writes `- Label`,
   never `- **Label.** body` (HARD RULE #5).
3. **Zero non-reset `margin`.** Universal across all 54 — a bare `margin:0` reset
   only; all real spacing is `gap`/`padding` + `--sp-*`. Push idioms use
   `justify-content:space-between`, a `flex:1` spacer item, or absolute
   positioning — never `margin:auto`. (HARD RULE #20; the components document the
   *why* — `margin` is invisible to the height math the stage/Fit-Spine depend on.)
4. **Multi-column = real CSS grid (labeled columns, `display:contents` field
   grids) OR the flex-wrap "matrix" idiom** (`width:calc(100%/N - (N-1)/N·gap)` +
   `box-sizing:border-box`) — never a flex-`basis` calc (proven unreliable).
5. **Compose only from tokens** (the pillar the user flagged — §4.3): every color
   is `var(--token)`, every size is a `--fs-*` role token, every gap a `--sp-*`,
   geometry in `cqi`/`cqh`. **Zero hex.** Categorical via `--cat-N-mark` /
   `--chart-cat-N`; state via `--pass/--warn/--fail`.
6. **Box-local reflow** via `@container lattice (aspect-ratio <= 0.9 | 1.05)`, with
   the doubled-class specificity trick; portrait/tall → single column.
7. **The chrome slot vocabulary is auto-detected** — eyebrow = inline-code
   paragraph *above* the heading; subtitle = inline-code *below*; pill = trailing
   inline `code`; key-insight = trailing `blockquote`; below-note = em-dash `<p>`.
8. **State is carried by SHAPE, not color alone** — the `.badge` disc+mask recipe;
   `[x]/[-]/[ ]/[/]` markers decode to shape-primary discs (grayscale- and
   CVD-safe).
9. **Elevation = one recipe, one element**: `--accent-soft` fill + accent border +
   `--on-accent-soft` ink + a single corner tag/ribbon/glyph. Exactly one elevated
   thing per slide; the accent is reserved for the verdict, not the whole slide.
10. **Restraint**: one accent; big numbers on `--fs-*` rungs (`--fs-hero` for the
    one monumental number, `--fs-h1`/`--fs-emphasis` for peers); categorical hues
    capped ~6–8 (Wong 2011); color spent on the *decision axis* (status), not
    decoratively on category.
11. **The manifest is the contract**: `function`/`form`/`substance`/`bucket`,
    `slots` (selector + required + description), `capacity`
    (`sweet`/`soft`/`hard`/`escalateTo`), `antiPatterns`, `adapt.priority`, `tags`,
    `variants` (Tier-4 only). Each component knows its own legible ceiling.
12. **Labels/citations** (chrome): chrome-stripped inline `code`, mono `--fs-meta`,
    uppercase tracked, colored by a rotating `--cat-N` hue — color-codes a set
    without a legend.

## 3. Architecture — mirror the Theme AI

| Theme AI (shipped #613) | Component AI (this design) |
|---|---|
| `THEME_CANON` fed as model context | **knowledge file** (§4) — the whole design language |
| model proposes 10 essentials + ramp | model proposes **manifest + scoped CSS + skeleton**, grounded in the knowledge file |
| — | **dedup-first** (§5): embed → rank vs catalog → suggest reuse → proceed |
| `deriveTheme` → `auditBoth` → AA-repair | `gateComponent` + `findCssExfil` + **design-audit** + **coerce/repair** (§6) |
| honesty contract (show a failing pair) | honesty contract (show the design findings; never fake a pass) |

The model **proposes**; deterministic code **disposes**. The model never authors a
shippable component unsupervised — every output passes the gate, and mechanical
near-misses are auto-repaired first.

## 4. The knowledge file (the component analog of `THEME_CANON`)

A curated, **concrete** spec injected as model context — concrete the way
`THEME_CANON` is (exact counts, literal identifiers, a fully-worked example),
because that concreteness is *why* the theme AI worked. Lives next to the bridge
(a generated module the Studio imports, like `theme-core.generated.js`). Its
sections, each backed by the §2 profile:

### 4.1 The Form vocabulary (how a slide composes)
Frame · Cell · Tile (one sentence: *a Frame divides a box into Cells; each Cell
holds a Tile; the content Cell hosts the component*). The `section.<name> >
.cell-stage` skeleton as the default root. The masthead band / footer / progress
rail as auto-supplied chrome the component must NOT re-implement. Sovereign/split
forms as the one exception. CSS identifier families: `--frame-*` / `.cell-*` /
`.tile-*`. *(Owner doc: `design/forms.md`.)*

### 4.2 The named slots
The full table — eyebrow (`p > code:only-child` above `h2`), title (`h2`,
masthead-lifted), subtitle (inline-code below), metadata pill (trailing `code`),
key-insight (trailing `blockquote`), below-note, footer/pagination/progress/logo —
each with what it IS, where it sits, its selector, and *when to use it*. The author
never hand-bolds or hand-numbers; the engine lifts/counts.

### 4.3 THE TOKEN SYSTEM — the composition vocabulary *(the user's point, first-class)*
The complete, role-organized palette the model selects from. **Compose only from
these; never invent a value.** Profiled as universal across all 54 components:
- **Surface/ink**: `--bg`, `--bg-alt`, `--border`, `--text-heading`,
  `--text-body`, `--text-secondary`, `--text-muted`, `--text-label`.
- **Accent**: `--accent`, `--accent-soft`, `--on-accent`, `--on-accent-soft`
  (the elevation recipe lives here).
- **State**: `--pass`, `--warn`, `--fail` (+ `-bg` tints, + the `--state-*` disc knobs).
- **Categorical**: `--cat-1-mark … --cat-12-mark` (structure) and
  `--chart-cat-1 … -8` (`-hue/-fill/-ink`) for charts — capped ~6–8, Wong 2011.
- **Spacing** (8px scale): `--sp-2xs … --sp-2xl`; geometry in `cqi`/`cqh`.
- **Type** (HARD RULE #4, the 12-token `--fs-*` system): the 5 CONTENT rungs
  (`--fs-meta` 11pt chrome · `--fs-body-compact` 13pt dense cells · `--fs-body`
  16pt default · `--fs-message` 21pt statement · `--fs-emphasis` 30pt lead), the
  6 HEADING rungs (`--fs-h1` 48 … `--fs-h6` 11, `--fs-h2` 28 = standard title), and
  the 1 DISPLAY rung (`--fs-hero` 86, class-driven only). Plus `--lh-*`,
  `--font-display/body/mono/label`, and the `--fs-scale` global multiplier.
- **Radius/chrome**: `--radius-sm/-md`; the `--pill-*` family (`-font/-fs/-weight/
  -tracking/-radius/-pad-x/-pad-y/-bg/-fg/-border`).
The model picks a token by **role** ("the body of a dense table" → `--fs-body-compact`),
never by feel — exactly the discipline the components show.

### 4.4 The hard invariants — with the WHY (so the model reasons, not pattern-matches)
no `margin` → `gap`/`padding` (#20: margin is invisible to the height math);
`var(--token)` only, no hex (#3: layouts are palette-blind so a theme swap +
a11y/CVD themes work); the `--fs-*` role system (#4: size is a one-step role
decision); card nesting `- Title` / `  - body` (#5: the title is a structural slot
label the CSS bolds, not editorial `**`); selector scoping `section.<name> …`
inside `@layer components` (#7); US English (#21).

### 4.5 The taxonomy
Function · Form · Substance axes; the 12 buckets (anchor/statement/inventory/
comparison/progression/evidence/imagery/chart/diagram/math/code/legal) with what
each is *for*, so a new component is **classified correctly** (drives both the
manifest and the dedup ranking).

### 4.6 The operationalized 10/10 rubric
Hierarchy (six distinct levels; if two adjacent levels look the same, it's broken);
restraint/density (≤~40 words, ≤6 bullets, ≤4 cards, diagrams ≥50% — the `capacity`
block); spacing (8px scale, cards never touch edges); alignment; contrast (text vs
`--bg-alt`, not just `--bg`); one-accent restraint. Checkable, not vibes.

### 4.7 The universal recipes
Cards-as-`li`; grid vs flex-matrix multi-column; the elevation recipe; state-as-
shape (`.badge` disc+mask); `@container lattice` reflow with the doubled-class
trick; the chrome-stripped citation/label idiom. Each as a *literal before→after
snippet*.

### 4.8 Worked examples (the make-or-break deliverable)
2–3 fully-worked: prompt → `manifest.json` + scoped `styles.css` + `skeleton.md`,
each annotated against the invariants and the rubric. At least one card-grid, one
ledger/list, and one that *reuses* an existing pattern rather than inventing.

## 5. Dedup-first (suggest, then proceed — your call)

Before generating, **rank the request against the catalog** and surface near
neighbors so the user reuses rather than duplicates:
- **Signal**: the architect model already ships a `bge-small` embedder
  (`architect-model.js` `embed()`); embed the request + each component's
  `name/description/purpose/tags` from `dist/docs/components.json`, cosine-rank.
  Bucket/function/tag overlap is a cheap secondary signal (and a keyword fallback
  when the embedder isn't loaded).
- **Behaviour** (your decision): **suggest, then proceed.** Show the top ~3 similar
  components with a "reuse this instead?" nudge and a one-line why; the user can
  open one, or proceed to generate. **Default-on; Workspace toggle to disable**
  (the dedup gate is configurable, the generation is not blocked).
- This is also a guardrail: it stops the catalog silently accreting near-duplicates
  and keeps the set coherent.

## 6. Guardrails — auto-repair, then gate (your call)

Three layers, reusing what exists plus one new audit:
- **Existing gates**: `gateComponent` (manifest validity, CSS scoping, no-hex,
  skeleton coherence — `lib/layout/gate.js`) + `findCssExfil` (#616 — no `@import`/
  remote `url()`/`expression()`).
- **New design-audit**: the *native-ness* checks the gate doesn't cover —
  margin-discipline (#20), token-only typography (`--fs-*`, no raw `cqi` font-size),
  slot-vocabulary use (eyebrow/title/card-nesting), `var(--token)` color, the
  `> .cell-stage` root. Advisory findings + hard failures, like the theme audit.
- **Coerce/repair** (your decision: **auto-repair then gate**): a mechanical layer
  that snaps near-misses before the hard gate — stray `margin: x` → `padding`/`gap`,
  a raw color → the nearest role token, a raw `cqi` font-size → the nearest `--fs-*`
  rung, a missing `section.<name>` scope added, `**Title**` card markup stripped to
  the nested form. Mirrors the theme AA-repair: fix the mechanical, *then* the hard
  gate blocks anything still off (and the model regenerates only then). Best UX,
  fewest round-trips, and the repair is deterministic so it can't introduce drift.

## 7. The generation flow (end to end)

```
describe → [dedup gate: embed + rank → suggest similar → reuse? or proceed]
        → model proposes {manifest, css, skeleton}  (knowledge file in context)
        → coerce/repair (snap mechanical near-misses)
        → gateComponent + findCssExfil + design-audit
            ├─ clean → preview (sanitized, #616) → save / graduate
            └─ hard-fail → show findings → regenerate with the failures fed back
```

Honesty contract throughout: a failing audit is *shown*, never papered over; with
no model connected the Studio says so (no fake generation), exactly like the
architect's `offline` outcome.

## 8. Workspace configuration

One toggle for the dedup default (on), surfaced in the Workspace alongside the
model/tier controls (where the AI settings already live). Room to grow:
audit-strictness (advisory-only vs blocking) and a "house tags" preference can join
later without reworking the flow.

## 9. Relationship to the DSL (#618) and scope

This is the **structural + aesthetic backbone** the model needs to author the
*declarative* parts of a component (manifest + CSS + skeleton). The #618 transform
**DSL** is the *behavioral* layer (the safe `match→do` rules for the "magic"); its
§10 knowledge-file outline named the sections — this fills sections 1/2/4 with the
Form/slot/token/rubric substance. A component that needs behavior reaches the DSL
*through* this contract; the safety envelope (declarative only, no user JS, the
#616 sanitizer on preview) is unchanged and inherited.

**Out of scope here**: building the DSL interpreter (its own slice, #618
PROTOTYPE-FIRST); the Component AI *chat UI* (a thin layer over this contract once
it exists).

## 10. PROTOTYPE-FIRST

The risk is the knowledge file being abstract-but-useless (the §10 warning: it must
be as concrete as `THEME_CANON` or it won't work). So **prove it on one bucket
before widening**:
1. Author the knowledge file for **inventory** only (the biggest, most
   representative bucket — cards/ledger/rail patterns are the backbone).
2. Wire dedup (embed vs the inventory slice of the catalog) + the coerce/repair +
   design-audit.
3. Generate ~5 inventory components from real prompts; **bench each against the
   10/10 rubric** (rebuild + actually look at it, per the Quality Bar) and against
   the gate.
4. Only when generated inventory components clear the bar (and don't duplicate
   existing ones) widen the knowledge file to the other 11 buckets.

The worked examples (§4.8) are the make-or-break deliverable; the prototype is how
we find out if they teach what we think they teach.
