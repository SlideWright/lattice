---
status: blocked
summary: Stage 1 SHIPPED (#435) — the 12 cascade-workaround !important in base.variants.css removed via a path-agnostic doubled-class (0,2,2). Stage 1.5 spike DONE: resolved the content-mask unknown (it runs only on the engine path, never the emulator) but found Stage 2 VETOED by R-PATH — the export-to-Marp / marp-vscode consumer styles decks with marp-core's own unlayered scaffold that Lattice cannot wrap, so full @layer activation is not achievable. Recommendation: stop at Stage 1.
---

# Scope — activating `@layer` across the Lattice cascade

> **Stage 1 shipped (#435); Stage 1.5 spike done; Stage 2 VETOED — see
> Recommendation.** This scoped the work `cascade.md` defers as "full coordinated
> rewrite … no near-term action." Outcome: Stage 1 (de-`!important` via
> specificity, no layering) shipped; the Stage 1.5 spike then proved full
> activation cannot cover the export-to-Marp / marp-vscode consumer (R-PATH). The
> inert `@layer` declaration stays inert by design. Read `engineering/cascade.md`
> first — it is the canonical statement of *why partial activation is a trap*.

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

1. **The engine scaffold and the bundle compose into ONE stylesheet.** *(⚠ Path 1
   only — the emulator/runtime do NOT share `composeCss`; corrected by Stage 1.5.)*
   `composeCss()` emits `scaffold(geometry)` + `resolvedTheme` (theme with
   `@import 'lattice'` inlined) + `orientationCss`, in that order. So scaffold
   and bundle share one cascade context — a coordinated layering **can** wrap the
   engine scaffold too (it is not a separate `<style>` we'd be powerless over).
   Rule 3 therefore demands the scaffold block also move into `@layer scaffold`
   in the same pass.

2. **The 12 cascade-`!important` have a de-`!important` path — but NOT `.marpit>`
   (SHIPPED as Stage 1, see below).** They exist only because the engine
   pagination pseudo `div.marpit > section::after` is **(0,1,3)** while the state
   markers (`section.archived::after`, `section.silent::after`) are **(0,1,2)** —
   they lose on specificity, so `!important` lifts them. The fix raises the marker
   to **(0,2,2)** (class-count 2 > 1 beats the engine pseudo without `!important`).
   The *first* attempt prefixed the engine wrapper — `.marpit > section.archived`
   — but pixel-diff **caught a regression**: the **emulator** render path wraps no
   `.marpit`, so the ancestor selector matched nothing and the ARCHIVED stamp
   *vanished*. The path-agnostic fix is a **doubled class** —
   `section.archived.archived::after` (0,2,2), no ancestor dependency — verified
   AE=0 light+dark on both engine and emulator paths. (`.marpit` is an
   owned-engine DOM vestige, not Marp — Marp is purged as a render path; only
   export-to-Marp via `marp-bundle.js` remains, a *format*, not a renderer.)
   **This validated finding #3 / R2: the render paths really do diverge.**

3. **A content-mask transform straddles the render paths — THE #1 UNKNOWN.**
   *(⚠ RESOLVED by Stage 1.5: the mask runs only on Path 1; the emulator never
   masks, which is why the stamp survives there.)*
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

**Stage 1 — kill the cascade-`!important` via specificity (NO layering yet). ✅ SHIPPED.**
Rewrote the two state-marker `::after` blocks in `base.variants.css` (`silent` /
`no-paginate` content-suppression + the `archived` stamp) to a **doubled class**
(`section.archived.archived::after`, 0,2,2) and dropped all **12** `!important`.
Still fully unlayered → no rule-3 exposure. Path-agnostic doubled-class was
chosen *after* `.marpit >` failed pixel-diff on the emulator path (finding #2).
Verified AE=0 light+dark across the Stage-0 state-marker set; unit (2210),
integration (452), lint, build:check all green.

**Stage 1.5 — reconcile the render paths. ✅ DONE (spike) — and it resolved the
#1 unknown AND surfaced a Stage-2 veto.** The spike traced the actual CSS
assembly of all three paths and corrected this doc's framing:

- **The content-mask runs on ONE path only.** `composeCss`/`packTheme`/
  `maskNonPaginationContent` is called *only* by `lib/engine.render()` (Path 1,
  used by marp.config + the docs playground). The **emulator** (Path 2,
  `lattice-emulator.js` — which renders the galleries / golden-diff) does **not**
  call `composeCss`; it hand-assembles its own `<style>` from raw `dist/lattice.css`
  + an appended `marpSystemCss` (`lattice-emulator.js:1043-1057`, whose
  `section[data-lattice-pagination]::after` is the emulator's pagination, 0,1,2).
  The **runtime** (Path 3) injects *no* page stylesheet — only `#lattice-orientation`.
  ⇒ Finding #1 ("scaffold + bundle compose into one sheet") is **Path-1-only**;
  finding #3's "#1 unknown" is **resolved** — the emulator never masks, which is
  why the ARCHIVED stamp survives there. (Stage 1's parity holds on Path 1 too:
  the doubled class matches the mask regex identically to the old single class, so
  mask behaviour is unchanged — confirmed by the maker-checker.)
- **Stage-2 must-wrap-together list (every unlayered string reaching a browser):**
  (1) `dist/lattice.css` (build-css); (2) `scaffold()` `css.js:86`; (3)
  `orientationCss()` — emitted by THREE sites (`css.js:393`, `lattice-emulator.js:1272`,
  `runtime:1074`); (4) the emulator `@page`/`body`/sizing literals
  (`lattice-emulator.js:1268-1271`); (5) `marpSystemCss` `:1043-1057` (note its
  `aside.lattice-notes{display:none !important}` — another `!important` outside
  base.variants); (6) palette `themes/*.css` (injected raw); (7) author
  `style:` `globalStyle` (`:1274`, unlayered by nature).

**Stage 2 — coordinated full layering. ⛔ BLOCKED by R-PATH (see risk register).**
The export-to-Marp consumer (`marp-bundle.js` + the marp-vscode preview the
runtime serves) styles decks with **marp-core's own scaffold CSS, which Lattice
does not emit and cannot wrap.** Layering `lattice.css` while marp-core's scaffold
stays unlayered re-creates the exact rule-3 trap with **marp-core winning** — a
broken preview for every exported deck. Since export-to-Marp is a first-class,
supported feature (not a retired render path), all-or-nothing layering is **not
achievable across all consumers from Lattice's side.** Stage 2 cannot proceed
until this is resolved (exclude-by-design + prove safe, or abandon). *This is the
honest end of the line: Stage 1 banked the practical win; Stage 2 is vetoed.*

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
- **R-PATH — marp-core scaffold we don't control (BLOCKING, confirmed by the
  Stage 1.5 spike).** Originally filed as a "cheap smoke test"; the spike upgraded
  it to a **veto**. Export-to-Marp (`marp-bundle.js`, CLI + Drawing Board) and the
  marp-vscode preview (which the runtime, Path 3, serves) style decks with
  **marp-core's own unlayered scaffold CSS**. `lattice.css` ships as that consumer's
  themeSet; layering it while marp-core's scaffold stays unlayered makes the
  unlayered marp-core win (rule 3) → broken exported/preview decks. Lattice cannot
  wrap marp-core's CSS. ⇒ all-or-nothing layering is **not achievable** for this
  first-class consumer. No mitigation from our side short of excluding the path by
  design and proving the exclusion safe.
- **R3 — cross-layer `!important` inversion (rule 2), now wider.** Beyond
  `mermaid.css`, the spike found `marpSystemCss` carries
  `aside.lattice-notes{display:none !important}` (`lattice-emulator.js:1056`) — an
  `!important` outside `base.variants.css` the original inventory missed.
- **R5 — marginal payoff.** The end state removes 12 `!important` and makes the
  cascade legible, but it is architectural hygiene, not a user-visible fix. Stage 1
  captured that practical value at a fraction of the risk.

## Recommendation (UPDATED post-Stage-1.5)

**Stop at Stage 1.** Stage 1 shipped (PR #435) — the 12 fragile `!important` are
gone with no rule-3 exposure, the practical win banked. **Stage 2 is vetoed by
R-PATH:** full `@layer` activation cannot cover the export-to-Marp / marp-vscode
consumer, whose marp-core scaffold Lattice does not emit and cannot wrap. Revisit
only if (a) export-to-Marp is retired or (b) someone proves the marp consumer can
be safely excluded from layering. Until then, the inert `@layer` declaration
stays inert by design, and `cascade.md`'s "status quo" verdict stands —
**now with a concrete, traced reason, not just caution.**

## Related

- `engineering/cascade.md` — why partial activation is a trap (canonical)
- `engineering/decisions/2026-05-18-important-audit-phase-35-prep.md` — the audit
- `engineering/decisions/2026-06-18-chart-mermaid-style-separation.md` — the
  companion separation work (Mermaid CSS consolidation, radar/journey)
- `lib/engine/css.js` — `composeCss` / `packTheme` / `maskNonPaginationContent`
