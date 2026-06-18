---
status: shipped
summary: Audit of lattice.css !important declarations for @layer activation, separating 21 cascade-workarounds from 331 legitimate library overrides
---

# `!important` audit — Phase 3.5 (@layer activation) prep

Date: 2026-05-18
Branch: `claude/organize-components-AmQcL`

> **Update (2026-06-17, Track-3 internal-`!important` cleanup).** Marp was
> retired as a render path after this audit, which reclassified
> `lib/integrations/markdown-it/scaffold.css` from the "library-override"
> category below (it overrode Marpit's live scaffold) to **internal**: with no
> marp-core scaffold loading after the theme, those rules compete only with the
> owned engine scaffold and won without `!important`. A marp-cli pixel probe
> confirmed it, and all 12 scaffold `!important` were removed, along with 1 in
> `chart-family.css`, 2 in `base.variants.css`, and 7 in `base.sketch.css` (22
> total). The genuinely load-bearing internal `!important` — the `archived` /
> `silent` pagination overrides (beat the engine scaffold's higher-specificity
> `div.marpit > section::after`) and two sketch lifted-label rules — were kept.
> The external-tool clusters (mermaid/math/highlight/radar/kanban/timeline)
> below are unchanged. See `CHANGELOG.md` `## Unreleased`.

## Headline

The blocker `tools/build-css.js:62-66` names for `@layer` activation —
"hundreds of `!important` declarations would reverse cascade silently"
— is real, but the actual scope of cascade-workaround `!important`
declarations is **21**, not 352. The other 331 are legitimate
library-override use cases (overriding inline styles emitted by
Mermaid, KaTeX, Marpit, the emoji shim) that must stay `!important`
AND must stay unlayered for the cascade to keep working post-`@layer`.

## Counts (lattice.css = 352 total)

### Library-override category — stays !important, stays unlayered (331)

| Source | Count | What it overrides |
|---|---|---|
| `lib/integrations/mermaid/mermaid.css` | 169 | Mermaid SVG inline styles emitted by `mmdc` |
| `lib/components/imagery/image/image.styles.css` | 55 | Marpit's `<img class="emoji">` catch-all + Marpit's `section img` rule |
| `lib/components/progression/timeline/timeline.styles.css` | 25 | Mermaid `.timeline-node` SVG nodes (timeline component uses Mermaid) |
| `lib/components/chart/kanban/kanban.styles.css` | 24 | Mermaid `.cluster` SVG nodes (kanban uses Mermaid) |
| `lib/components/chart/radar/radar.styles.css` | 22 | SVG element fill/stroke on the radar polygons |
| `lib/integrations/markdown-it/scaffold.css` | 16 | Marpit `<section>` / `<header>` / `<footer>` defaults |
| `lib/components/evidence/math/math.styles.css` | 16 | KaTeX SVG inline-style attributes |
| `lib/integrations/highlight-js/highlight-js.css` | 2 | highlight.js inline styles |
| `lib/components/imagery/featured/featured.styles.css` | 2 | image overrides |
| **subtotal** | **331** | |

These all override styles set BY EXTERNAL TOOLS at the inline-style
specificity tier. `!important` is the correct CSS mechanism for that.
After `@layer` activation, these files MUST NOT be wrapped in any
layer — wrapping them would invert the !important cascade and they'd
lose to anything layered (an unlayered !important beats any layered
!important).

### Cascade-workaround category — !important removable after @layer (21)

These declarations exist solely to win specificity over other Lattice
rules. Once `@layer universal` is declared AFTER `@layer components`,
universal-layer rules win over component-layer rules at normal
specificity — the `!important` becomes vestigial.

| Source | Count | Examples |
|---|---|---|
| `lib/base/base.variants.css` | 14 | `section.archived::before { content: 'ARCHIVED' !important; font-family: var(--font-mono) !important; ... }` — state badges, currently use !important to win over per-component h2 styling |
| `lib/components/progression/list-criteria/list-criteria.styles.css` | 2 | |
| `lib/components/imagery/featured/featured.styles.css` | 2 (of the 2 above; recount) | |
| `lib/base/base.modifiers.css` | 1 | |
| `lib/components/anchor/title/title.styles.css` | 1 | |
| `lib/components/chart/gantt/gantt.styles.css` | 1 | |
| `lib/components/comparison/verdict-grid/verdict-grid.styles.css` | 1 | |
| `lib/components/progression/list-steps/list-steps.styles.css` | 1 | |
| **subtotal** | **21** | |

The lion's share (14) is `base.variants.css` state markers. Those are
the cleanest case for retirement — they're all `@layer universal`
candidates and the !important was added because variants were
contending with per-component rules at equal specificity.

## Proposed `@layer` plan when this lands

```css
@layer base, root, scaffold, components, semi-universal, universal, diagram-overrides;
```

Layer-to-source mapping:

| Layer | Source(s) |
|---|---|
| `base` | `lib/base/base.tokens.css` (lower in source: tokens defined first) |
| `root` | `lib/base/base.elements.css` (semantic HTML defaults) |
| `scaffold` | `lib/integrations/markdown-it/scaffold.css` — **STAY UNLAYERED** (library override) |
| `components` | every `lib/components/<bucket>/<name>/<name>.styles.css` EXCEPT the 5 with library-override !importants (image, featured, math, timeline, kanban, radar) which stay unlayered |
| `components` | `lib/chart-family/chart-family.css` |
| `components` | `lib/shared/shared.styles.css` |
| `semi-universal` | `lib/base/base.modifiers.css` (compact, loose, accent, eyebrow, key insight) |
| `universal` | `lib/base/base.variants.css` (state, tone, chrome) |
| `universal` | `lib/base/base.treatments.css` (tint-*, mark-*) |
| `diagram-overrides` | `lib/integrations/mermaid/mermaid.css` — **STAY UNLAYERED** |

After activation:
1. Remove the 14 !importants from `base.variants.css` (state markers
   now win via layer cascade, not specificity hack).
2. Remove the 7 stragglers in component files where the !important
   was a cascade workaround, not a library override.
3. Verify `regulatory-update` duplicate-class specificity bump — the
   hack targets intra-`@layer components` cascade (regulatory-update
   vs timeline class collision when both classes appear on one
   slide). `@layer` does NOT resolve this; selector specificity is
   still the right tool here. Keep the hack but add a comment
   pointing at this audit.

## Pixel-diff coverage

The integration tests (`component-galleries.test.js`,
`bucket-galleries.test.js`) assert PDF page counts but not pixel
equivalence. Phase 3.5 needs explicit pixel-diff gates per batch.
`tools/pixel-check.js` is the right tool — usage:

```sh
node tools/pixel-check.js snapshot pre-layer-activation
# make changes
node tools/pixel-check.js diff pre-layer-activation
```

Run after:
- The layer declaration commit (zero drift expected — declaration
  without wrapping is a no-op)
- Each batch of source-file wrapping
- Each `!important` removal batch

Any non-zero pixel diff in a layered-conversion commit is a real bug,
not noise. The 1-byte metadata variance in PDF file size is fine
(`tools/pixel-check.js` does pdftoppm rasterize on byte-diff and only
flags actual pixel deltas).

## Phase 4 (modular CSS migration) followups exposed by this audit

The 14 `base.variants.css` !importants point at the same architecture
question Phase 4 was designed to address: state badges currently live
in shared variants CSS; they could equally live in each component's
styles.css. The two answers are:

1. **Shared (status quo).** Variants stay in `base.variants.css`,
   `@layer universal`. Adding a new state variant touches one file
   but applies to all components.
2. **Per-component (Phase 4).** Each component's `<name>.styles.css`
   declares its own `section.<name>.archived` etc. Touching one
   component is fully localized.

Recommendation: stay shared for state/tone (1) — they're genuinely
universal and the shared file is small. Migrate component-specific
universal-variant rules (e.g. component-specific `.dark` overrides
where they exist) per Phase 4 (2). The split is "is the variant
behaviour generic across components, or does this component need a
specific override?" The first stays shared; the second migrates.

## Open items for the human design pass

1. **Cascade safety of the regulatory-update hack post-@layer.**
   The duplicate-class specificity bump targets intra-`@layer
   components` selector ties. `@layer` doesn't help. Either keep
   the hack and document, or restructure regulatory-update's
   variant selectors to be intrinsically more specific (e.g.
   `section.regulatory-update.timeline > ...` for the variant
   override rather than relying on doubled class names).
2. **Where do `dark` state-token overrides live?**
   `section.dark { --bg: ... }` style rules are token-set rules
   that must propagate by inheritance. They MUST stay in a single
   shared file (`base.variants.css`?) — pushing them into each
   component would scope them to that component only. Per-rule audit
   needed before any token-set rule moves into a component file.
3. **`scaffold.css` staying unlayered.** Its !importants
   override Marpit defaults at the inline-style tier. Should the
   non-!important rules in `scaffold.css` get wrapped in
   `@layer scaffold`? Mixed layering within one source file is
   syntactically fine but auditing the cascade outcome is the work.

## Status

This note captures the audit; Phase 3.5 itself remains deferred
pending human review. Branch `claude/organize-components-AmQcL`
is otherwise complete (Phases 0/1/2/3/5/6 shipped).
