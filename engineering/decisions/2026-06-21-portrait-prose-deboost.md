---
status: shipped
summary: Portrait/square decks select generous body type coefficients (tuned for sparse hero slides), which overflow content-dense layouts — the engine clips the slide title and last item. A deck-wide --prose-deboost token (sibling to --stat-emphasis; 0.66 portrait, 0.8 square, UNSET landscape) lets dense families multiply just their card/item body+title font by var(--prose-deboost, 1); hero elements keep full size and landscape stays byte-identical. Applied to cards-grid, actors, cards-stack, matrix-2x2, decision, compare-prose, split-compare. pricing is excluded — its overflow is spacing-driven, a separate follow-up.
version: 1
supersedes: none
builds-on: 2026-06-20-typography-categories.md, 2026-06-18-component-adaptive-sizing.md
---

# Portrait prose de-boost — dense layouts stop clipping

**Status:** landed. **Scope:** `lib/engine/css.js`, `lib/runtime/index.js`, seven
component stylesheets. **Companion:** `2026-06-20-typography-categories.md` (the
per-orientation type scale this tunes), `2026-06-18-component-adaptive-sizing.md`
(the box-local reflows it rides on).

## The problem

Portrait and square decks select their own curated `--fs-*` coefficient set (not a
uniform stretch of landscape — see typography-categories). The `body` coefficient
there is deliberately **generous**: social/mobile decks are sparse and read at
arm's length, so prose wants to be large. That is right for a statement slide and
wrong for a *content-dense* one: a slide with four text cards (cards-grid, actors)
or stacked comparison panels overflows the tall frame — the engine clips the slide
**title** off the top and the **last item** off the bottom. Content is lost, not
just ugly. Neither single-column nor two-column reflow fixes it; the type itself is
too big for the content.

## The model considered

Three options were weighed (and the choice confirmed with the owner):

- **A — systemic de-boost (chosen).** Dense families keep their reflow and serve
  *body* prose at a readable, non-hero size; hero elements (slide title, stat
  numbers) keep the full boost. One coherent rule, applied per family.
- **B — patch cards-grid only.** Smallest, but the same overflow recurs on every
  other dense family → N inconsistent patches (the drift HARD RULE #1 forbids).
- **C — auto-scale-to-fit.** A general overflow→shrink loop. Most general, but the
  largest engine change and it makes a component's type size content-dependent,
  undermining the fixed token scale (HARD RULE #4).

## The mechanism

A deck-wide token, sibling to `--stat-emphasis`, emitted by **both** orientation
emitters (engine `orientationCss`, runtime `injectOrientationStyle` — HARD RULE #1
siblings):

```
section { … --prose-deboost: <0.66 portrait | 0.8 square>; … }
```

Landscape emits **nothing** (the orientation block is empty), so consumers reading
`var(--prose-deboost, 1)` fall back to `1` and every landscape export is
byte-identical. The values are curated flat-per-orientation (like `--stat-emphasis`),
tuned against the worst case (4:5, the shortest portrait); taller frames (story,
mobile) get more margin. 0.66 brings the generous portrait body back to ~1.25× the
landscape base — readable, and four dense cards fit.

**The de-boost is applied ONCE, centrally — not per component** (this is the
resolution of the red-team's per-family-patch finding). `base.tokens.css` defines
three derived **dense-content roles** off the canonical `--fs-*` set:

```css
:root, section {
  --dense-body:         calc(var(--fs-body)         * var(--prose-deboost, 1));
  --dense-body-compact: calc(var(--fs-body-compact) * var(--prose-deboost, 1));
  --dense-message:      calc(var(--fs-message)      * var(--prose-deboost, 1));
}
```

Dense families reference the matching role (`font-size: var(--dense-body)`); they
never re-derive the multiply. Naming is *outside* the closed `--fs-*` namespace
(HARD RULE #4 — the 12 type roles are sealed); these are a **derived adjustment** of
existing roles, not new roles. A new dense layout opts in by using `var(--dense-*)`
— no new CSS logic, and the de-boost factor is tuned in one place. Each family keeps
its own base size in landscape (cards → body, actors → body-compact, statement
overrides → message), so the cross-family size differences that pre-exist in
landscape are preserved (intentional: dense-compact vs dense-prose), now *named*.

## Where it applies (and a cascade footgun)

Consumers: **cards-grid** (reference), **actors**, **cards-stack**, **matrix-2x2**,
**decision**, **compare-prose**, **split-compare** (the last also de-boosts its
hero-band *intro* line so the verdict clears; the display `h2` stays hero-sized).
Extended to the **list family** after the jargon-gallery portrait stress test (14 →
8 clips): **list** (spine + `takeaway` registers via `--dense-message`; the
`principles` *display* register stays full-size — it's sparse declarations, not dense
prose), **list-steps**, **checklist**, **list-criteria**, and **list-tabular**
(compact cells via `--dense-body-compact`). `q-and-a` already fit and is untouched.

**Footgun:** a family with a portrait `@container` body override must de-boost
**that** rule, not just the base body — the override wins in portrait and the base
de-boost is inert there. This bit `decision` (line ~100) and `compare-prose` (line
~328), both of which raise the body to `--fs-message` weight in portrait; both
overrides are now de-boosted.

## The pricing exception

`pricing` clips too, but its overflow is **spacing-driven** — three tall tiers
stacked, each with its own padding and inter-row gaps — not type-driven. A type
de-boost shrinks the text without reclaiming the dominant (spacing) height, so it
is intentionally **excluded** here. Pricing needs a compact portrait reflow
(spacing de-boost or a denser tier layout) — a separate follow-up.

## Verification

Rendered each consumer at portrait (4:5), square, and story (9:16) with realistic
two-line bodies: slide title, every item, and footnotes fit with no overflow
warning. Landscape: no gallery PDF regenerated (byte-identical). `engine.test.js`
locks the token values (0.66 / 0.8 / unset). A maker-checker pass caught the
`compare-prose` override miss before merge.

## Open & deferred (the honest not-yets)

This de-boost is the **deterministic, curated** layer: it sizes dense body by
`(role, orientation)`, content-blind, so type is consistent slide-to-slide. It does
NOT, and is not meant to, solve everything:

- **Content-autofit actuator — designed, deferred.** The general fix for *uncontrolled*
  density (the Persona-2 mobile reader who reads whatever the author shipped) is the
  engine measure→shrink→fit actuator + legibility floor + re-pagination scoped in
  `2026-06-20-native-to-reflow-feasibility.md`. The de-boost **complements** it (a
  curated default that keeps autofit from engaging on ordinary dense slides), so it is
  NOT torn down when the actuator lands — no accretion. The actuator is the larger
  build and is **gated on confirming Persona 2 is a prioritized customer**; the phone
  preview (#479) is the cheap instrument to gather that evidence first.
- **Case 2b unsolved.** A *landscape* deck opened on a phone stays 16:9 and tiny — the
  portrait scale never fires, so the de-boost can't reach it. That is the actuator's job.
- **`pricing`** — spacing-driven overflow, excluded here (see above); needs a compact reflow.
- **Gallery residual (8 of 58 still clip in portrait) — the actuator's territory.** After
  the list-family extension, the jargon gallery's remaining clips are NOT type-driven:
  `list-tabular` (row-count/spacing, like `pricing`), one dense `list-steps` (content
  *just* over the floor — a flat factor can't absorb arbitrary density), `verdict-grid`
  and `cards-stack horizontal` (in-scope but heavier content than the floor handles),
  `stats` (hero numbers + running header/footer chrome), `split-panel` ×2 (the §11
  section-element `@container` blocker), and `compare-code` (code blocks). These are the
  concrete case for the content-autofit actuator + structural reflow — a curated flat
  de-boost is a floor, not a fit guarantee.
- **Threshold jump (accepted).** `--prose-deboost` is keyed on the orientation boundary,
  so dense type steps at the wide↔tall transition in a live-resizing (fluid) view. This
  rides on the *existing* landscape↔portrait coefficient step; not smoothed, accepted.

## Red-team note: the Frame does NOT subsume per-component reflow (yet)

A red-team pass flagged a suspected duplication between the responsive-Frame slicing
and per-component `@container` reflow. Investigation (the generated CSS + `reflow-as-
form-capability.md` §5–6) showed it was a **misread**: Frame slicing operates at the
Form **Cell** level (`section.form .cell-masthead`, Form decks only); per-component
`@container` reflow operates on the **component's internals** (`section.<comp> > ul`,
any deck). A plain (non-Form) component deck gets no `data-family` slicing, so its
`@container` rule is load-bearing — deleting it would break plain-deck portrait. They
are **complementary layers by design** (Frame = placement strategy, component = the
"Tile-in-its-Cell leaf fill", per §5). Full retirement of per-component reflow is the
separate components→Tiles migration (#356), not this work.
