---
status: proposed
summary: Multi-stage plan to activate CSS @layer across the bundle — eliminate the 14 cascade-workaround !important first (via .marpit> specificity), reconcile the three engine render paths, then layer the whole composed sheet in one coordinated pass
---

# Scope — activating `@layer` across the Lattice cascade

> **Not yet built.** This is the scoping plan for the work `cascade.md` defers
> as "full coordinated rewrite … no near-term action." Read `engineering/cascade.md`
> first — it is the canonical statement of *why partial activation is a trap*.
> This doc says *how* a full activation would be staged and verified, and flags
> the open questions that must be spiked before any rule changes.

## Goal

Make the cascade **explicit and order-independent**: every rule in its declared
`@layer`, so precedence is governed by layer order rather than the brittle
combination of bundle source-order + specificity hacks + `!important`. The
declaration already exists (inert) in `tools/build-css.js`:

```css
@layer base, root, scaffold, components, semi-universal, universal, diagram-overrides;
```

Success = that declaration becomes load-bearing, the **14 cascade-workaround
`!important` in `base.variants.css` are gone**, and pixel output is unchanged
across every gallery in both modes.

**Non-goal:** removing the **library-override `!important`** (246 in
`mermaid.css` + more in KaTeX/SVG/emoji overrides). Those defeat *inline* styles
emitted by third-party tools — correct per spec, must stay, and stay working in
any layer (any author `!important` beats normal inline regardless of layering).

## Why this is hard (recap + new findings)

`cascade.md` covers the two `@layer` traps:
- **Rule 2 — `!important` inverts across layers:** an earlier-declared layer's
  `!important` beats a later one's. So you cannot "fix" the scaffold-vs-variants
  competition by putting variants in a later layer — it makes scaffold *win*.
- **Rule 3 — unlayered beats layered:** during partial activation, any unlayered
  rule beats every layered rule regardless of specificity. Phase 3.5b proved
  this by breaking 100% of canary pages. ⇒ **all-or-nothing.**

This scoping pass adds three findings from `lib/engine/css.js`:

1. **The engine scaffold and the bundle compose into ONE stylesheet.**
   `composeCss()` emits `scaffold(geometry)` + `resolvedTheme` (theme with
   `@import 'lattice'` inlined) + `orientationCss`, in that order. So scaffold
   and bundle share one cascade context — a coordinated layering **can** wrap the
   engine scaffold too (it is not a separate `<style>` we'd be powerless over).
   Rule 3 therefore demands the scaffold block also move into `@layer scaffold`
   in the same pass.

2. **The 14 cascade-`!important` have a clean de-`!important` path: `.marpit>`.**
   They exist only because the engine pagination pseudo
   `div.marpit > section::after` is **(0,1,3)** while the state markers
   (`section.archived::after`, `section.silent::after`) are **(0,1,2)** — they
   lose on specificity, so `!important` lifts them. Prefixing with the engine's
   own wrapper — `.marpit > section.archived::after` → **(0,2,2)** — wins on
   specificity (class-count 2 > 1) **without** `!important`. (`.marpit` is an
   owned-engine DOM vestige, not Marp — Marp is purged as a render path; only
   export-to-Marp via `marp-bundle.js` remains, and it is a *format*, not a
   renderer we verify.)

3. **A content-mask transform straddles the render paths — THE #1 UNKNOWN.**
   `packTheme()` runs `maskNonPaginationContent()`, commenting out every
   `content:` in a `section…::after` that isn't `attr(data-lattice-pagination)`
   (mirroring Marpit's pagination plugin for baseline parity). Its regex
   `^section(?![\w-])[^\s>+~]*::?after$` *statically appears to match*
   `section.archived::after` — which would strip the stamp — yet **the stamp
   renders** in the emulator path (verified: an `archived` slide shows the
   ARCHIVED stamp). The css.js header names **three engine render paths**
   (composeCss scaffold · the emulator PDF template · the runtime preview) that
   may apply this mask — and the cascade — **differently**. Reconciling them is a
   prerequisite, because the `.marpit>` rewrite also changes whether the regex
   matches (a combinator-led selector no longer starts with `section`, so it
   *escapes* the mask — which is desirable but must be confirmed identical across
   all three paths).

## The layer model (file → layer)

Bundle order today vs. target layer (from `build-css.js` + `cascade.md`):

| # | Source | Target layer |
|---|---|---|
| — | engine `scaffold()` (`css.js`, injected) | `scaffold` |
| 2 | `base.tokens.css` | `root` |
| 3 | `base.elements.css` | `base` |
| 4 | `scaffold.css` | `scaffold` |
| 6 | `components/**/*.styles.css` | `components` |
| 7 | `base.modifiers.css` | `semi-universal` |
| 8 | `highlight-js.css` | `diagram-overrides`* |
| 9 | `chart-family.css` | `components` |
| 10 | `base.treatments.css` | `semi-universal` |
| 11 | `shared.styles.css` | `semi-universal` |
| 12 | `base.variants.css` | `universal` |
| 13 | `mermaid.css` | `diagram-overrides` |

\* highlight-js/Mermaid library-overrides may want their own importance handling
— see Risk R3.

## Staged plan

**Stage 0 — baseline harness (no rule changes).** Per `cascade.md`: snapshot
*in-sandbox* pixel baselines (not committed PDFs — Chromium-version drift makes
them a false baseline). Cover every state-marker variant (archived, silent,
no-paginate, confidential, redacted, draft, tbd, wip, pinned, revised, tone-\*)
in light + dark, plus a broad gallery sweep. This is the regression oracle for
every later stage.

**Stage 1 — kill the 14 cascade-`!important` via specificity (NO layering yet).**
Rewrite the ~3 state-marker `::after` selectors to `.marpit > …` and drop the 14
`!important`. Still fully unlayered, so no rule-3 exposure. **Independently
shippable** and valuable on its own (−14 `!important`, removes the fragility).
Gate: AE=0 across the Stage-0 set on all three engine paths. *This is the
recommended first PR even if full activation stalls.*

**Stage 1.5 — reconcile the content-mask across the three render paths.** Resolve
finding #3: prove the `.marpit>` selectors behave identically (mask-escape +
specificity win) in composeCss, the emulator, and the runtime preview. If a path
diverges, fix the path (or the transform) before proceeding. Gate: the Stage-0
set is identical across all three paths.

**Stage 2 — coordinated full layering (all-or-nothing).** Wrap *every* source —
including the engine `scaffold()` block — in its target layer in one pass.
Audit every remaining `!important` for cross-layer inversion (rule 2): a
library-override `!important` landing in an earlier-declared layer than a rule it
must NOT beat is now a latent bug. Gate: AE=0 across the full gallery sweep,
both modes, all three paths.

**Stage 3 — make it load-bearing + document.** Flip `build-css.js` to emit the
layer wrappers, delete the "broad activation is blocked" comments scattered
through the component files, rewrite `cascade.md` to describe the *active*
cascade, and add a lint/test guard that fails if a source file is unlayered.

## Verification protocol (every stage)

- In-sandbox `tools/pixel-check.js` snapshot/diff; treat > ~250 px/page as a real
  signal (Mermaid mmdc adds up to ~200 px Puppeteer noise on affected pages).
- Run the **three engine paths** explicitly — a regression can hide in one.
- **Maker–checker** (HARD RULE / cascade blast radius): an independent checker
  re-derives the specificity math, hunts for a state-marker variant the rewrite
  missed, and audits cross-layer `!important` inversions before each merge.
- Rollback = revert the stage's commit; stages are ordered so each is green on
  its own.

## Risk register

- **R1 — partial layering (rule 3).** Mitigation: Stage 2 is atomic; a lint guard
  (Stage 3) prevents a later unlayered file sneaking in.
- **R2 — render-path divergence (#3).** Mitigation: Stage 1.5 gates on all three
  paths before any layering.
- **R3 — cross-layer `!important` inversion (rule 2).** A library-override in an
  early layer could newly beat a later-layer override. Mitigation: Stage 2
  importance audit; keeping all library-overrides in the *latest* layer
  (`diagram-overrides`) so they can't out-`!important` earlier layers.
- **R4 — marp-bundle export.** `lattice.css` ships as the export themeSet; layered
  CSS is valid CSS so it carries over, but confirm the exported bundle still
  parses in a downstream Marp consumer (cheap smoke test, not a visual gate).
- **R5 — marginal payoff.** Honest call: the end state removes 14 `!important` and
  makes the cascade legible, but it is architectural hygiene, not a user-visible
  fix. Stage 1 captures most of the practical value (the fragility) at a fraction
  of the risk — **if appetite runs out, ship Stage 1 and stop.**

## Recommendation

Execute **Stage 1 first as its own PR** — it banks the real win (the 14 fragile
`!important` gone) with no rule-3 exposure. Treat Stages 2–3 as a follow-on only
if explicit `@layer` legibility is independently wanted; they carry most of the
risk for the least incremental user value.

## Related

- `engineering/cascade.md` — why partial activation is a trap (canonical)
- `engineering/decisions/2026-05-18-important-audit-phase-35-prep.md` — the audit
- `engineering/decisions/2026-06-18-chart-mermaid-style-separation.md` — the
  companion separation work (Mermaid CSS consolidation, radar/journey)
- `lib/engine/css.js` — `composeCss` / `packTheme` / `maskNonPaginationContent`
