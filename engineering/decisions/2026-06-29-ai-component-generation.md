---
status: proposed
summary: AI component generation that produces components which feel native to Lattice's 10/10 boardroom set — not generic CSS. The design has three pillars, mirroring the proven Theme-AI architecture (#613, model-proposes-within-a-contract / deterministic-code-disposes): (1) a CONCRETE knowledge file (the component analog of THEME_CANON) that teaches the model Lattice's whole design language — the Form vocabulary (Frame/Cell/Tile, the `section.X > .cell-stage` skeleton), the named slots (eyebrow/title/subtitle/pill/key-insight/footer/pagination/logo), THE TOKEN SYSTEM as the composition vocabulary (palette/surface/spacing/the 12-token --fs-* type roles/radius/pill/font/categorical/state — never an invented value), the hard invariants WITH their why (no margin #20, var(--token) #3, --fs-* #4, card-nesting #5, scoping #7, US #21), the 12-bucket taxonomy, the operationalized 10/10 rubric, the universal recipes (cards-as-`li`, grid-vs-flex-matrix, elevation, state-as-shape, `@container lattice` reflow), and — the make-or-break deliverable — 2–3 fully-worked examples (prompt → manifest+CSS+skeleton). (2) DEDUP-FIRST: before generating, embed the request (the architect model already ships a bge-small embedder) and rank it against the component catalog (dist/docs/components.json), SUGGEST the top similar components with a reuse nudge, then proceed (default-on, Workspace-configurable). (3) GUARDRAILS: gateComponent + findCssExfil + a new design-audit (margin/token/slot/--fs-*/scope/adapt-capacity). Repair is SPLIT by safety (red-team B2): deterministic auto-fix ONLY for spatially-neutral text/structure edits (strip **Title**, add scope); every SPATIAL fix (margin→padding, raw→token) is flagged and regenerated, never silently mutated, because margin→padding is not layout-neutral. HONESTY (red-team B1): the STRUCTURAL contract is gateable (most of "feels native"), but there is NO automated AESTHETIC gate — that residue rests on the knowledge file + model + human review (the Quality Bar); the design does not claim an auto-10/10 gate. SCOPE (red-team B3): transform-FREE components only (pure-CSS-over-native-DOM — most of inventory/comparison/legal/evidence/code/math); transform-bearing components (charts/journey/roadmap/diagram, which need codegen + 3-renderer parity) are the #618 DSL track, and the model must DECLINE + route those. Grounded in a profile of all 53 shipped components (what good looks like, derived not invented). This backbone lands BEFORE the #618 DSL (prerequisite). PROTOTYPE-FIRST: prove on inventory with a FROZEN, held-out, adversarial, blind-rated prompt set (incl. a dedup-route case, a portrait-reflow case, and a decline case) before widening.
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

This doc is grounded in a read-only **profile of all 53 shipped components** (the
"what good looks like" pass) and the distilled **semantic contract** from the
design docs. It **extends** the #618 transform-DSL knowledge-file outline (§10),
which is DSL-and-safety-centric; this supplies the structural + aesthetic backbone
the model needs *before* it ever reaches the DSL.

## 2. What "good" looks like — the universal DNA (profiled, not invented)

Every shipped component, across all 12 buckets obeys the same skeleton. These are
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
3. **Zero non-reset `margin`.** Universal across all 53 — a bare `margin:0` reset
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
| `deriveTheme` → `auditBoth` → AA-repair | `gateComponent` + `findCssExfil` + **design-audit** (§6) |
| honesty contract (show a failing pair) | honesty contract (show the design findings; never fake a pass) |

**The analogy is load-bearing but NOT total — and the difference is the whole risk.**
Themes work because the contract is *closed*: `coerceEssentials` snaps the model's
reply onto exactly the essential keys and `deriveTheme` generates the other ~70
tokens deterministically, so the model **cannot** emit a foreign value that
survives, and `auditBoth` proves AA. Component CSS is **open-ended** — there is no
equivalent closure. So the disposes step splits in two:

- **The STRUCTURAL contract IS gateable** (and that is most of "feels native"): the
  invariants are deterministic checks — `var(--token)`-only, no hex, `--fs-*`-only
  type, no `margin`, `section.<name>` scoping, the `> .cell-stage` root, the
  card-as-`<li>` skeleton, manifest validity incl. `adapt`/`capacity` coherence.
  The gate + design-audit (§6) enforce these and a violation hard-fails.
- **The AESTHETIC residue is NOT machine-gateable.** No gate can see bad hierarchy,
  a wrong `--fs-*` rung, cards touching edges, or "generic-looking." That residue
  rests on the knowledge file + the model + a **human looking at the render**
  (the Quality Bar) — the same floor every visual change in this repo has. The
  design does **not** claim an automated 10/10 gate; it claims a strong structural
  gate plus disciplined human review. (This is the honest read of red-team B1.)

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
The full table — each with what it IS, where it sits, its selector, and *when to
use it*. The author never hand-bolds or hand-numbers; the engine lifts/counts. The
**chrome slots are auto-supplied by the Frame — a component must NOT re-implement
them**; the **content slots** are what the component authors:
- **header / masthead** — the masthead band (`.cell-masthead`) the Frame lifts the
  eyebrow + title into; the component never styles it.
- **eyebrow** (`p > code:only-child` above `h2`) · **title** (`h2`,
  masthead-lifted) · **subtitle** (inline-code below the heading).
- **footer · pagination · progress** — the footer band's three marks (running
  text · section progress · page number), all auto-chrome.
- **logo** — author brand mark, top-right, from front-matter.
- **metadata pill** (trailing `code`) · **key-insight** (trailing `blockquote`) ·
  **below-note** (em-dash `<p>`).
- **rail — disambiguate (it is not one slot).** Three distinct things share the
  word: (a) the **progress rail** = the footer's section-progress mark, *auto-chrome*
  the component must not draw; (b) a **split-panel/sovereign rail** = a dark side
  column a *split-form* component owns (split-compare's `.compare-left`); (c) an
  **agenda-style `.rail`** = a per-component *variant* class. The knowledge file
  must name all three so the model never hand-authors the progress rail (a) and
  knows a side rail is a (b) split-form or (c) variant concern, not a universal slot.

### 4.3 THE TOKEN SYSTEM — the composition vocabulary *(the user's point, first-class)*
The complete, role-organized palette the model selects from. **Compose only from
these; never invent a value.** Profiled as universal across all 53 components:
- **Surface/ink**: `--bg`, `--bg-alt`, `--border`, `--text-heading`,
  `--text-body`, `--text-secondary`, `--text-muted`, `--text-label`.
- **Accent**: `--accent`, `--accent-soft`, `--on-accent`, `--on-accent-soft`
  (the elevation recipe lives here).
- **State**: `--pass`, `--warn`, `--fail` (+ `-bg` tints, + the `--state-*` disc knobs).
- **Categorical**: `--cat-1-mark … --cat-12-mark` (structure) and
  `--chart-cat-1 … -8` (`-hue/-fill/-ink`) for charts — capped ~6–8, Wong 2011.
- **Spacing** (8px scale): `--sp-3xs … --sp-2xl`; geometry in `cqi`/`cqh`.
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
  **top-level** `description/purpose/tags` from `dist/docs/components.json`
  (extract the top-level fields explicitly — `name` recurs on slots/members, a
  footgun), cosine-rank. **`purpose` is not a manifest-required field** — require it
  for AI-authored components (or drop it from the vector) so the signal can't rot.
- **Fallback is the SHIPPED lexical path, not a new one.** `embed()` returns `null`
  on Safari/mobile/no-CDN **and when the model is toggled off** — so dedup must fall
  back to the existing `fuse.js` lexical retrieval (`docs/src/playground/architect-retrieval.js`),
  not an invented "keyword overlap." Bucket/function/tag overlap is a cheap re-rank
  on top.
- **Behavior** (your decision): **suggest, then proceed.** Show the top ~3 similar
  components with a "reuse this instead?" nudge and a one-line why; the user can
  open one, or proceed to generate. **Default-on; Workspace toggle to disable.**
- Honest scope: because it never *blocks*, dedup **surfaces** near-duplicates and
  nudges reuse — it does not *prevent* catalog bloat (a determined user still
  proceeds). bge-small on ~10-word docstrings is usable but noisy: expect
  false-negatives across domain-language gaps ("RACI grid" vs "responsibilities
  roster") and false-positives between legitimately-distinct same-bucket siblings
  (cards-grid vs cards-stack vs verdict-grid). The nudge is a soft guardrail, not a
  hard one — by design.

## 6. Guardrails — repair the safe class, flag-and-regenerate the rest

Your call was **auto-repair then gate**; red-team B2 sharpened *how much* is safely
auto-repairable. The refinement (same intent, correct mechanism): **deterministic
auto-fix only for provably-safe textual/structural edits; everything spatial is
flagged and fed back to the model to regenerate — never silently mutated.**

Three layers, reusing what exists plus one new audit:
- **Existing gates**: `gateComponent` (manifest validity, CSS scoping, no-hex,
  skeleton coherence — `lib/layout/gate.js`) + `findCssExfil` (#616 — no `@import`/
  remote `url()`/`expression()`).
- **New design-audit**: the *native-ness* checks the gate doesn't cover —
  margin-discipline (#20), token-only typography (`--fs-*`, no raw `cqi` font-size),
  slot-vocabulary use (eyebrow/title/card-nesting), `var(--token)` color, the
  `> .cell-stage` root, **and manifest `adapt`/`capacity` coherence** (a manifest
  can pass `validateManifest` with no `adapt` block and then never reflow for
  portrait/tall — §2 item 6, a core native-DNA property; the audit must require it
  for AI output). Advisory findings + hard failures, like the theme audit.
- **Repair, split by safety**:
  - **Deterministic auto-fix — only the spatially-neutral cases**: strip
    `**Title**` card markup to the nested `- Title` form, add a missing
    `section.<name>` scope prefix, drop a barred property. These change *structure/
    text*, not layout geometry, so they can't shift the render.
  - **Flag-and-regenerate — every spatial fix**: `margin → padding` is **NOT**
    layout-neutral (it moves which box absorbs the space, repaints a `background`/
    `border` into what was the gap, and *adds* measured height the Fit-Spine then
    sees — e.g. `.card{background:var(--accent-soft);margin:var(--sp-md)}` snapped to
    `padding` floods the fill into the inter-card gap and grows the card by
    2·`sp-md`). Likewise `raw value → nearest token`: snapping a `cqi` font-size to
    a `--fs-*` rung changes the measured line count and can overflow `.cell-stage`,
    and snapping an arbitrary hex to "the nearest role token" silently changes
    *meaning* (is `#C20000` a `--fail` or a `--cat-?`). So these are **reported as
    audit failures and regenerated**, with the violation fed back to the model —
    not mechanically rewritten.

This still front-loads the cheap fixes (your UX goal) while keeping the gate
*honest*: a spatial violation costs one regeneration round, not a silent corruption.

## 7. The generation flow (end to end)

```
describe → [dedup: embed/fuse → suggest similar → reuse? or proceed]
        → model proposes {manifest, css, skeleton}  (knowledge file in context)
        → safe auto-fix (text/structure only)
        → gateComponent + findCssExfil + design-audit (incl. adapt/capacity)
            ├─ clean → preview → human review (the aesthetic gate) → accept (§7.1)
            └─ fail  → show findings → regenerate with the failures fed back
```

**Two distinct safety surfaces — they are NOT the same mechanism:**
- the **skeleton** (markdown → preview HTML) is guarded by the #616
  `sanitizeSlideHtml` (DOMPurify) at the preview frame;
- the **CSS** (`styles.css`) is guarded by `findCssExfil` — a *denylist* regex
  (`@import`/remote `url()`/`expression()`), now facing adversarially-fuzzable
  *generated* input rather than human shared components. It allows inline `data:`
  URIs, so AI output should additionally be **size-capped** (a multi-MB `data:`
  payload passes the denylist). Treat CSS safety as a denylist that may need
  tightening as generation lands, not a solved envelope.

Honesty contract throughout: a failing audit is *shown*, never papered over; with
no model connected the Studio says so (no fake generation), like the architect's
`offline` outcome. **The human review step is load-bearing** — it is the aesthetic
gate the machine can't be (§3).

### 7.1 Accept → edit → graduate (how a generated component reaches the set)

Generation ends at a *local* component, not a shipped one:
1. **Review + edit** — the generated `manifest`/`css`/`skeleton` land in the
   Component Studio editor (the same surface that gates + previews local
   components today); the user edits any of the three and re-gates live.
2. **Save to library** — accepted, it joins the user's local component library
   (the existing `kind:component` asset store) and is usable in their decks +
   shareable via the `.lattice-component.zip`.
3. **Graduate into the gallery** — promoting a component into the shipped set is a
   **deliberate, human, post-review step**, never automatic: it follows HARD RULE
   #8 (graduate in a separate post-review commit, isolated from the six galleries)
   and HARD RULE #9 (ship a demo deck). AI authorship does not bypass either gate.

## 8. Workspace configuration

One toggle for the dedup default (on), surfaced in the Workspace alongside the
model/tier controls (where the AI settings already live). Room to grow:
audit-strictness (advisory-only vs blocking) and a "house tags" preference can join
later without reworking the flow.

## 9. Scope — the transform-free subset only (red-team B3)

**This design covers only components a model can fully author as
`manifest + CSS + skeleton` with NO `transform.js`.** That boundary is real and
load-bearing: a `substance: structure` component whose markdown shape is not a
plain `ul>li` (journey, roadmap, timeline-list, compare-code …) ships a
`transform.js` that parses the nested markdown into the DOM the CSS targets — and
that transform must be **triplicated for three-renderer parity**
(`lattice-emulator.js` / `lattice-runtime.js` / `lib/engine`). The model emits no
transform, so those components are **out of scope here**. (Note: `lib/layout/gate.js`
currently calls `structure`/`prose` "the two no-transform substances" — that
comment is wrong; three shipped `structure` components have transforms. The gate
text is a tracked nit, not a blocker for this design — see #18 off-path log.)

In scope is the **large transform-free subset**: the pure-CSS-over-native-DOM
components — most of `inventory`, `comparison`, `legal`, `evidence`, plus `code`,
`math` (the profile found these ship no `transform.js`). The knowledge file's §4.5
classification must therefore steer the model to a transform-free `form`/`substance`
and **decline** (route to "this needs the DSL / a first-party build") when a request
implies codegen, a chart, a Mermaid diagram, or non-`ul>li` structure.

**Relationship to the DSL (#618):** this is the **structural + aesthetic backbone**;
the #618 transform **DSL** is the *behavioral* layer (safe `match→do` rules + the
closed capability registry for charts/codegen). **This backbone lands first** — it
is a prerequisite the model needs before it can author even the declarative parts,
and the DSL's §10 knowledge-file outline references it. A future component that
needs behavior reaches the DSL *through* this contract; the safety envelope
(declarative only, no user JS, the #616 sanitizer on preview) is inherited.

**Also out of scope here**: building the DSL interpreter (its own slice, #618
PROTOTYPE-FIRST); the Component AI *chat UI* (a thin layer over this contract once
it exists).

## 10. PROTOTYPE-FIRST

The risk is the knowledge file being abstract-but-useless (it must be as concrete
as `THEME_CANON` or it won't work). So **prove it on one bucket before widening —
with a falsification that can actually fail** (red-team S4: inventory alone is the
easy, templated case and would pass on cherry-picked prompts, proving little):
1. Author the knowledge file for **inventory** (the transform-free backbone:
   cards/ledger patterns), incl. the §4.7 recipes written *verbatim* — especially
   the `@container lattice` reflow with its doubled-class specificity trick, the
   single most error-prone idiom, which the low tier (Qwen2.5-0.5B on Safari/mobile)
   will not invent.
2. Wire dedup (embed/fuse vs the catalog) + the safe-auto-fix + design-audit
   (incl. `adapt`/`capacity`).
3. Run a **frozen, held-out, adversarial prompt set** — not author-chosen at bench
   time — that *must* include: (a) a prompt that should route to an **existing**
   component (tests dedup actually fires); (b) a prompt needing **portrait reflow**
   (tests the `adapt`/`capacity` + reflow audit); (c) a request implying a
   **non-`ul>li` structure or a chart** (tests that the model correctly **declines**
   and routes to the DSL rather than emitting a broken transform-free fake).
4. **Blind human rating against the 10/10 rubric** — a reviewer who is *not* the
   author rebuilds and looks (the aesthetic gate of §3) — plus the structural gate.
5. Widen to the other transform-free buckets only when the held-out set clears both
   bars *and* the decline/dedup cases behave. Transform-bearing buckets wait on the
   #618 DSL.

The worked examples (§4.8) are the make-or-break deliverable; the prototype is how
we find out if they teach what we think they teach.
