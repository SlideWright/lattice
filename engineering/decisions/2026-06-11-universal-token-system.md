---
status: shipped
summary: Universal role-based token system — design, crosswalk, and the phased alias-then-flip migration, phases 1–7 implemented
---

# Universal token system — design, crosswalk, and migration strategy

**Date:** 2026-06-11 · **flip plan added 2026-06-14**
**Status:** design accepted · phases 1–7 implemented (alias era) ·
canonical flip specified as an executable plan (§11) · **groups 1–5 FLIPPED to
canonical (issue #337): group 1 sequential = PR #339, groups 2–5 = the
follow-on PR; the engine + all 14 themes now declare only the new names. Closeout
remains — post-flip token-tier lint, HARD RULE #11 flip, toggle inversion.**
**Scope:** `lib/base/base.tokens.css`, `themes/*.css`, the three render-path
Mermaid bridges (`lattice-emulator.js`, `lib/runtime/index.js`,
`marp.config.js`), `lib/theme/derive.js`, the gates
(`tools/check-ownership.js`, `lib/theme/contrast.js`), and the token docs
(`design/theming.md`, `CLAUDE.md`).

> This note is to the **colour / universal** token layer what
> `2026-05-19-typography-token-refactor.md` was to the type scale: a solver
> pass — diagnosis, model, crosswalk, phased alias-based migration, approval
> checkpoints. The typography refactor is the house template; this follows it.

---

## 1 — Symptom

The engine ships ~232 tokens across 14 hand-audited palettes, a base layer,
and the chart family. It is **capable but incoherent**: the values and the
relationships are mostly right, but the *names* don't say what a token is or
where it goes, several systems solve the same problem three different ways,
and the rules that actually keep diagrams from rendering black are implicit
and occasionally violated. The brief: a universal token system where **what
you see is what it means and how it is used**, with the magic removed and
room to scale.

## 2 — Diagnosis (the magic, grounded)

| # | Problem | Evidence |
|---|---|---|
| **P1** | **`-light`/`-dark` is overloaded three ways.** `--c1-light` is a *pale fill* (a TIER); `--dark-bg` is *dark color-scheme*; `light-dark()` is the CSS function. So `--c1-light` is **not** "light-mode c1" — and it *holds* a `light-dark()` pair. | `themes/indaco.css:226` (`--c1-light: light-dark(#BCD5EC, #006398)`) vs `:170` (`--dark-bg`) |
| **P2** | **`--c-` is a junk drawer** — categorical, semantic, structural, ink, surface, accent all share one prefix. | `--c1-light`, `--c-warm-light`, `--c-stroke`, `--c-ink-light`, `--c-container`, `--c-accent-warm` |
| **P3** | **Three parallel categorical systems.** engine `--c1..12-light/dark` (12); chart `--chart-cat1..8` → `--cat1-hue/fill/ink` (8); sequential `--scale-50..900` (10). | `base.tokens.css`, `chart-family.css:119`, `:289` |
| **P4** | **Three parallel status systems.** `--pass/warn/fail`; `--chart-state-*` → `--state-*-hue/fill/ink`; `--c-warm/cool/alarm/mark/note`. Same meanings, three vocabularies. | `base.tokens.css:207`, `chart-family.css:180`, `theming.md:274` |
| **P5** | **The good pattern is hidden.** chart-family's `hue → fill → ink` triad (one source hue, derived fill + ink, canvas-aware, one override hook) is the cleanest sub-system — but only charts use it; the engine still hand-tunes two tiers. | `chart-family.css:119-201` |
| **P6** | **Input vs derived tokens are indistinguishable by name.** A theme author can't tell the 11 they must set from the ~200 that derive. | `derive.js` ESSENTIAL_KEYS (11) vs REQUIRED_TOKENS (~200) |
| **P7** | **Component recipe knobs live in global `:root`** next to design tokens. | `--state-fill-pct`, `--pill-pad-y`, `--mark-check`, `--chart-fill-top-l` in `base.tokens.css` |
| **P8** | **`--scale-500` (colour ramp) vs `--fs-scale` (font multiplier)** overload "scale". | `base.tokens.css:289` vs `:128` |
| **P9** | **`--bg-dark` (dark panel on a light deck) vs `--dark-bg` (canvas in dark mode)** — near-identical names, opposite roles. | `indaco.css:96` vs `:171` |

**The worse problem the names hide (from the maker–checker review).** The
categorical token names are not just CSS — they are a **cross-language wire
protocol**. `--cN-light`/`--cN-dark`/`--c-ink-light` appear as hardcoded
strings in ~131 JS sites across 11 files (the emulator's `MERMAID_VAR_MAP`,
the runtime bridge, the chart transforms, `derive.js`), and the emulator's
offline resolver could only follow a *top-level* `light-dark()` and a *bare*
`var()`. Whether a token may hold a rich expression (`color-mix`, nested
`var`) or must stay flat **depends on which render path consumes it** — and
that load-bearing rule was invisible in every name.

## 3 — The model: two axes

A token's name is determined by answering two orthogonal questions.

### Axis 1 — abstraction (what it means → how it's used)

- **Tier 1 · Primitive** — raw, context-free (`--sp-*`, `--radius-*`,
  `--font-*`, the 12 `--fs-*`, the sequential ramp). Never consumed for
  colour-role by a component. *Mostly already clean — keep; rename only the
  genuinely broken `--scale-*` → `--seq-*`.*
- **Tier 2 · Semantic** — role-named, palette-blind, **theme-set**. The
  contract surface: surfaces, ink, accent, status, categorical. *"What it
  means."* Components and bridges consume **only** this tier.
- **Tier 3 · Component** — recipe knobs scoped to a component, derived from
  Tier 2, **living in component CSS, not global `:root`**. *"How it's used."*
  (We do **not** adopt a `--_`-private prefix — `--_sec-1cqi` already claims
  that namespace for a runtime-injected value. File location is the boundary.)

### Axis 2 — render shape (the anti-magic law)

- **css-rich** tokens are resolved live (browser + the marp-vscode runtime's
  `getComputedStyle`) and may use `color-mix()` / nested `var()` freely.
- **bridge** tokens are *also* read offline by the emulator's Mermaid
  resolver. Historically these had to be a literal or a single
  `light-dark()`. **Phase 1 removes that constraint by upgrading the resolver
  into a real recursive evaluator** (`lib/core/resolve-token-expr.js`:
  `var()`+fallback, `light-dark()`, `color-mix()` in oklab/srgb) — the
  offline twin of `getComputedStyle`. A bridge token may now be any
  expression the three paths share, and the former black-diagram failure mode
  is gone.

## 4 — Foreground vs background: spelled out

Every colour token must declare, in its name, **whether it is painted or
painted-upon** — and, if it is a foreground, **which background it is paired
to**. This is the spine of "what it means."

| Class | Question it answers | Roles | Naming |
|---|---|---|---|
| **Background** | *things sit on me* | canvas · panel/surface · **fill** | the bare role: `--surface`, `--surface-alt`, `--cat-N-fill`, `--accent`, `--accent-soft` |
| **Foreground** | *I am painted on a background* | **ink** (text) · **stroke/border** · **mark/glyph** | named for its background with `on-`: `--ink`, `--on-accent`, `--cat-on-fill`, `--cat-N-mark` (stroke), `--border` |

**The pairing law.** A foreground token names the background it is designed to
read against, so its contrast obligation is explicit and AA-auditable:
`--on-accent` ⟂ `--accent`; `--cat-on-fill` ⟂ `--cat-N-fill`. The existing
`--accent` / `--on-accent` pair is the precedent; the new categorical
vocabulary extends it.

**Tokens that are both (relational).** A *mark* is a foreground when it strokes
a node on the canvas, but becomes a *background* when text sits on it. We
resolve this the same way `--accent` does: the token's **primary** role names
it (`--cat-N-mark` — a foreground stroke/mark), and its `on-` partner handles
the surface case (`--cat-on-mark` — ink for text placed on a `-mark`). No
token is ever ambiguous at its use site:

```
--cat-N-fill    background  (pale categorical surface)
--cat-on-fill   foreground  (ink ON a -fill)
--cat-N-mark    foreground  (saturated stroke / mark / cScale on the canvas)
--cat-on-mark   foreground  (ink ON a -mark, when the mark is used as a fill)
```

## 5 — Naming grammar

`--<group>-<index?>-<role>[-<variant>]`, **one meaning per dimension**:

- **group** — `cat` (categorical), `status`, `surface`, `ink`, `accent`,
  `chart-cat`, `seq`, `diagram` …
- **role** — `fill` (a background), `mark` (a foreground stroke/mark),
  `on-fill` / `on-mark` / `on-accent` (a foreground ink for that background),
  `stroke`, `line`. **Never** a color-scheme word — light/dark lives only
  inside the `light-dark()` *value*.

Worked example — the categorical pair (phase 1):

| Old | New | Class | Role |
|---|---|---|---|
| `--cN-light` | `--cat-N-fill` | background | pale categorical surface |
| `--cN-dark` | `--cat-N-mark` | foreground | saturated stroke / mark / cScale feed |
| `--c-ink-light` | `--cat-on-fill` | foreground | ink ON a `-fill` |
| `--c-ink-dark` | `--cat-on-mark` | foreground | ink ON a `-mark` |

(`ink` was already taken by the on-fill text token, so the deep mark is
`mark`, never `ink` — which also avoids the `--cat-1-ink` / `--c-ink-*`
collision the first draft would have created.)

## 6 — AA / contrast safety

The contrast contract is **preserved by construction**, not by re-tuning:

- Phase 1 (and every rename phase) is a **strict rename — zero value change**.
  New names alias to the old tokens (`--cat-1-fill: var(--c1-light)`), so the
  *resolved hex is byte-identical*. All 14 palettes keep their hand-audited,
  inline-annotated AA ratios; no swatch moves.
- The gate (`lib/theme/contrast.js`, `test/unit/palette/*`) keys on the
  current source names and stays green untouched during phase 1; when a later
  phase flips canonical-ity, the gate's pair names move **in the same commit**
  (the atomicity rule — aliases satisfy name-parity but not the contrast-pair
  assertions across the `derive.js` flip).
- **Re-derivation is explicitly OUT of phase 1.** Any future unification of
  value derivation (e.g. generalising the `hue → fill → ink` triad to the
  engine categoricals) changes rendered hex and therefore requires a full
  14-theme contrast re-audit + gallery re-baseline — sequenced as its own
  phase, never smuggled into a rename.

## 7 — Crosswalk (old → new), by phase

| Phase | Group | Old | New |
|---|---|---|---|
| **1 (done)** | categorical | `--cN-light` / `--cN-dark` / `--c-ink-light` / `--c-ink-dark` | `--cat-N-fill` / `--cat-N-mark` / `--cat-on-fill` / `--cat-on-mark` |
| **2 (done)** | diagram-structural | `--c-stroke` / `--c-line` / `--c-accent-warm` | `--diagram-stroke` / `--diagram-line` / `--diagram-accent-warm` |
| **3 (done)** | status axis | `--pass/warn/fail` (+ chart `--chart-state-*`) | `--status-{pass,warn,fail,info,mute}` — one vocabulary for engine discs + charts; `--pass/warn/fail` alias to it (not bridge-fed) |
| **3 (done)** | diagram lifecycle | `--c-warm/cool/alarm/mark/note` | `--diagram-{active,done,critical,today,note}` (+ paired `-mark` strokes) — a *separate* axis; lifecycle ≠ status |
| **4 (done)** | surfaces / scheme | `--bg-dark`, `--dark-*` | `--surface-inverse` (8 consumers repointed), `--scheme-dark-*` (vocabulary; the per-theme `light-dark()` pairs flip later). **Refined:** `--bg` / `--bg-alt` / `--border` are kept as-is — clear and short, not magic; renaming them would be churn without payoff. |
| **5 (done)** | sequential | `--scale-50..900` (+ `--scale-500`) | `--seq-50..900` — frees "scale" from the `--fs-scale` collision (word-cloud repointed; the ramp anchor + derivation flip later) |
| **6 (done)** | chart triad | `--cat1..8-{hue,fill,ink}` | `--chart-cat-1..8-{hue,fill,ink}` — **flipped, not aliased**: the bare `cat` name is *eliminated*, killing the near-collision with phase-1 `--cat-N-*`. Self-contained (chart CSS + transforms, not bridge-fed), so a direct rename is cleaner than an alias that would leave the collision. Theme hooks `--chart-catN` kept. |
| **7 (done — reclassified)** | component knobs | `--pill-*`, `--mark-*`, state-disc knobs, `--chart-fill-*` | **No relocation needed.** Investigation showed the premise was overstated: `--chart-fill-*` is *already* component-scoped (`section.chart-frame`); `--pill-*` and `--mark-*` / state-disc knobs are consumed by `base.modifiers` **and** 10+ components, i.e. genuine *universal component primitives* that correctly live in base (not magic — the shared recipe). Phase 7 instead ships the **self-policing vocabulary gate** (`test/unit/palette/universal-token-vocabulary.test.js`). |

The two categorical systems stay **separate** (12 diagram slots vs 8 chart
slots is a *designed* divergence — Wong 2011 perceptual ceiling for charts;
the 12-section band cycle for timelines). The fix is parallel, self-describing
naming (`--cat-*` vs `--chart-cat-*`), not a merge.

## 8 — Migration strategy

Mirrors the typography template, with the maker–checker corrections folded in:

0. **Spec + crosswalk** (this doc).
1. **Per-group, alias-based.** Introduce new names aliased to old (zero value
   change), repoint the three render paths + consumers, prove zero-diff +
   parity. *Done for the categorical group (§9).*
2. **Atomic where the gates demand it.** A group whose names are asserted by
   `contrast.js` / `derive.js` / parity fixtures flips those references **in
   the same commit** as the canonical rename — aliases do not survive the
   test gate (checker F9).
3. **Parity gates the first line, not the last.** Each group ships only after
   the emulator + marp-cli + runtime agree on it (checker F11).
4. **Self-policing.** Extend `check-ownership.js` into a token-tier lint: no
   Tier-1 primitive consumed for colour-role in a component; no Tier-3 knob in
   global `:root`; no color-scheme word in a token name; every theme defines
   the Tier-2 input set (the 13 `*-dark.css` wrappers are exempt — they define
   zero tokens by design, checker F8).
5. **Dark wrappers & palette-audit** are first-class migration citizens, not
   afterthoughts.
6. **A demo deck per phase.** Every phase ships an `examples/<slug>.md`
   (+ committed PDF) the reviewer can open in one click to inspect and verify
   that phase's vocabulary end-to-end, light **and** dark. Phase 1 is
   `examples/universal-tokens.md` (§9).

## 9 — Phase 1 prototype — what shipped and how it was verified

**Built (categorical group, all 14 themes, all 3 render paths):**

- `lib/core/resolve-token-expr.js` — the recursive offline evaluator
  (`var()`+fallback · `light-dark()` · `color-mix()` oklab/srgb · cycle
  guard), reusing `lib/theme/color.js` (share, never duplicate). Replaces the
  emulator's order-dependent two-pass resolver.
- `lib/base/base.tokens.css` — the `--cat-N-fill/mark` + `--cat-on-fill/mark`
  vocabulary, aliased new→old (palette-blind, so all 14 themes inherit it;
  values byte-identical).
- `lattice-emulator.js` `MERMAID_VAR_MAP` (105 string sites) and
  `lib/runtime/index.js` (34 sites) repointed to the new names. `mermaid.css`
  (~250 SVG-override rules) and the chart transforms stay on the old names via
  the alias — zero churn there — and migrate in a later phase.

**Verified:**

- `lib/core/resolve-token-expr` unit test (10 cases) — incl. the critical
  `var(--cat-1-fill) → var(--c1-light) → light-dark() → hex` chain in both
  schemes, `color-mix` oklab/srgb/transparent, and cycle termination.
- Full unit suite **1480/1480 green** — incl. the contrast gate (AA intact)
  and `mermaid-var-map` (every repointed name resolves in indaco **and**
  cuoio, the one theme that overrides the universal semantic palette).
- Integration tier (cross-renderer parity + page counts) — **167 pass / 0
  fail.** Diagrams render in colour through the upgraded bridge; byte-identical
  values mean no page-count drift.
- Demo deck `examples/universal-tokens.md` (8 slides, light + a `dark` diagram
  slide) rendered through the emulator and spot-checked: categorical fills,
  marks, and on-fill ink paint correctly on both canvases — the dark slide
  confirms the `light-dark()` inside each `--cat-*` value resolves to its dark
  branch through the new names.

### Phases 2–7 — same recipe, each shipped green

Every phase below was committed separately, each with a demo deck, and each
gated by the full unit suite + the integration tier (cross-renderer parity +
page counts, 167/0) + a visual spot-check:

| Phase | Group | Verified |
|---|---|---|
| 2 | diagram-structural (`--diagram-stroke/line/accent-warm`) | flowchart strokes + edges |
| 3 | status axis (`--status-*`) + diagram lifecycle (`--diagram-active/done/critical/today/note`) | checklist discs + gantt lifecycle |
| 4 | surfaces (`--surface-inverse`, `--scheme-dark-*`) | title + code dark panels |
| 5 | sequential (`--seq-*`) | word-cloud heat-ramp |
| 6 | chart categorical (`--chart-cat-*`, **flip**) | piechart + radar |
| 7 | self-policing vocabulary gate (no relocation needed — see §7 row 7) | `universal-token-vocabulary.test.js` 12/12 |

Final state of the alias era: full unit suite **1498/1498**, integration
**167/0**, demo decks `examples/universal-tokens*.md`.

### Cross-renderer COLOUR parity (gap closed)

The structural parity gate proves the renderers agree on slide *count*, not
*colour*. `test/integration/parity/color-parity.test.js` closes that: it
resolves every bridge token through the emulator's resolver
(`resolve-token-expr.js`) **and** through a real marp-cli-rendered DOM read by
headless Chromium, and asserts the identical RGB — indaco + cuoio, light + dark.
It also pins the resolver's `color-mix()` math to Chromium (±3/channel),
guarding the moment colour-mix flows through the bridge (re-derivation, the
chart triad). Note: the browser side **must** render through marp-cli (tokens on
`section` via Marpit's `:root`→`section` rewrite); hand-injecting `:root` CSS
does not reproduce production and gives false negatives on alias-to-alias custom
properties.

## 10 — Remaining work

- ~~Whether phase 3 collapses the three status systems to one vocabulary~~
  **Resolved (two honest axes):** a STATUS axis `--status-*` shared by engine
  discs + charts (`--pass/warn/fail` alias to it), and a SEPARATE diagram
  lifecycle/annotation axis on semantic `--diagram-*` names — because a gantt
  "in-progress" tone is not a "warn". Shipped in phase 3.
- Folding in the deferred **Model A** (`2026-06-05-token-structure-audit.md`):
  retire most of `--on-dark-*` by giving dark panels a scoped
  `color-scheme: dark`, so they reuse the one canvas ramp.
- **The canonical flip (the headline remaining work) — now fully specified in
  §11.** All seven groups ship as *aliases new→old* — the new vocabulary is what
  every render path and new consumer reads, but the old names (`--c1-light`,
  `--c-stroke`, `--bg-dark`, `--scale-*`, …) are still the per-theme / base
  source. The flip makes the new names canonical (themes declare `--cat-*` etc.
  directly; the old names become thin aliases or retire), atomically per group
  with the contrast / token-parity / mermaid-var-map fixtures (checker F9). This
  is where `mermaid.css`'s ~250 SVG rules + `derive.js`'s `REQUIRED_TOKENS` + the
  14 themes finally move off the old spellings. **§11 turns this paragraph into a
  runnable plan: the exact purge set, per-group ordering, the atomic-commit
  recipe, the gate moves, validation, rollback, and the post-flip closeout.**
- **Validation A/B (shipped).** Before the irreversible flip, the migration is
  de-risked two ways. (1) `lib/tokens/crosswalk.js` is the SoT old→new map plus
  the `flip()` transform; `test/unit/tokens/crosswalk.test.js` resolves every
  crosswalk token under the flipped system and asserts it equals the current
  value (indaco + cuoio, light + dark) — the byte-identical guarantee, gated in
  the unit suite. (2) The **Drawing Board** reads a `tokens:` front-matter
  directive (`current` | `universal`, default current) — deck-setup drawer
  control + editor autocomplete — and renders the deck against the universal
  vocabulary by flipping the engine + theme CSS client-side via the crosswalk,
  namespaced under `-u` `@theme` names so both vocabularies coexist live. Flip a
  real deck back and forth to confirm it renders identically before committing to
  the canonical flip. Drawing-Board-only (marp-cli ignores the directive, so a
  deck stays portable).
- **The post-flip token-tier lint.** Once the old names are gone, extend
  `check-ownership.js`: forbid a color-scheme word (`light`/`dark`) in any token
  name, forbid a Tier-1 primitive consumed for colour-role in a component, and
  assert every theme defines the Tier-2 input set (the 13 `*-dark.css` wrappers
  exempt). Cannot run during the alias era because the old `*-light`/`*-dark`
  names still exist by design. *(Specified as the closeout step in §11.5.)*

## 11 — The canonical flip: executable migration plan

§10 names the surfaces; this section is the runnable plan — the gap between
"design accepted" and "old names gone." It is the colour-token analogue of the
typography refactor's flip, and it is a **pure rename**: every step preserves
the resolved hex byte-for-byte (the §6 contract), so the failure mode is a
*missed* reference (a token that stops resolving), never a *moved* swatch.

### 11.0 — What "the flip" inverts (the one-paragraph model)

**Today:** the 14 light themes declare the **old** names; `base.tokens.css`
carries forward aliases **new → old** (`--cat-1-fill: var(--c1-light)`); every
render path and every new consumer already reads the **new** names.
**After the flip:** the themes declare the **new** names directly; the old names
either retire or survive only as thin **back-aliases old → new**
(`--c1-light: var(--cat-1-fill)`) for as long as a deliberately-deferred
consumer needs them. `lib/tokens/crosswalk.js`'s `flip()` is the mechanical
transform that does both halves (rename every old → new, then drop the aliases
that thereby became self-referential); `test/unit/tokens/crosswalk.test.js`
proves the result resolves identically before any commit lands.

### 11.1 — Scope: what purges, what deliberately stays

**Purge set (57 names, exactly the `crosswalk.js` `PAIRS`):**

| Group | Names | Old → new |
|---|---|---|
| categorical | 26 | `--cN-light/dark`, `--c-ink-light/dark` → `--cat-N-fill/mark`, `--cat-on-fill/mark` |
| diagram-structural | 3 | `--c-stroke/line/accent-warm` → `--diagram-stroke/line/accent-warm` |
| diagram-lifecycle | 8 | `--c-warm/cool/alarm/mark/note` (+ `-dark` marks) → `--diagram-active/done/critical/today/note` (+ `-mark`) |
| surfaces / scheme | 10 | `--bg-dark` → `--surface-inverse`; `--dark-*` → `--scheme-dark-*` |
| sequential | 10 | `--scale-50..900` → `--seq-50..900` |

**Deliberately NOT purged** (same rationale as keeping `--bg` / `--border` in
phase 4 — clear, short, no magic):

- **`--pass` / `--warn` / `--fail`** (+ `-bg`) stay the curated status *source*;
  `--status-*` remain forward aliases **to** them. They carry no color-scheme
  word and no junk-drawer ambiguity, so the post-flip lint (§11.5) still passes
  with them present. *Status is the one group that never flips.*
- **`--chart-cat-1..8-{hue,fill,ink}`** — already canonical (flipped, not
  aliased, in phase 6).
- The primitives `--sp-* --radius-* --font-* --fs-* --bg --bg-alt --border`.

### 11.2 — The per-group atomic-commit recipe (identical for each group)

**One group = one atomic commit = one PR.** Within that single commit, in order:

1. **Flip the 14 light themes' *definitions*** old → new (mechanical —
   `flipTheme` is the reference transform). Confirm the **13 `*-dark.css`
   wrappers still define zero tokens** (checker F8); they only set
   `color-scheme`, so they need no edit.
2. **Sweep every *consumer* of that group's old names → new, in the same
   commit:** `lib/integrations/mermaid/mermaid.css` SVG-override rules, the chart
   / diagram transforms, component CSS, `lib/theme/derive.js`
   (`REQUIRED_TOKENS` + `ESSENTIAL_KEYS`), and any JS string sites not already on
   the new names. (The emulator `MERMAID_VAR_MAP` + `lib/runtime/index.js` are
   **already** on the new names since phase 1 — they need no move.)
3. **Move the asserting gates in lockstep** (checker-F9 atomicity — aliases do
   not satisfy a contrast-pair assertion across the `derive.js` flip):
   `lib/theme/contrast.js` `LIGHT_PAIRS` / `DEEP_PAIRS` / the alarm pair switch
   to the new names; remove the group from `crosswalk.js` `PAIRS` (it is no
   longer "old"); its names already live in
   `universal-token-vocabulary.test.js`, which stays green.
4. **Collapse the aliases in `base.tokens.css`:** delete the group's forward
   alias block (it would otherwise become `--cat-1-fill: var(--cat-1-fill)`).
   Add a thin **back-alias old → new** *only* for a consumer you consciously
   defer — the goal is zero, achieved by completing step 2.
5. **Rebuild + regenerate:** `npm run build` (behind the ownership gate)
   refreshes every `dist/` artifact; the Drawing Board re-reads `crosswalk.js`
   directly at build time (see §11.6), so its A/B follows automatically.
6. **Ship the group's demo deck** — re-render the existing
   `examples/universal-tokens-pN-*.md` light **and** dark; it now exercises the
   *canonical* names rather than the aliases.

### 11.3 — Order: most-isolated → highest-coupling

Flip the groups in increasing blast radius, so the riskiest one lands last
against a tree where every other group is already proven on the new names:

1. **sequential** — only the word-cloud heat-ramp + the ramp anchor consume it;
   smallest, self-contained, the warm-up that exercises the recipe end-to-end.
2. **diagram-structural** (3) — `mermaid.css` strokes/edges + flowchart.
3. **diagram-lifecycle** (8) — gantt / timeline lifecycle tones.
4. **surfaces / scheme** (10) — `--surface-inverse` (8 consumers, already
   repointed in phase 4) + `--scheme-dark-*` + the dark wrappers.
5. **categorical** (26) — **last.** It is the cross-language wire protocol:
   `mermaid.css`'s ~250 SVG rules, the chart `cScale` feed, `contrast.js`'s 24
   pale/deep pairs, `derive.js`'s 26 required entries. Everything else is green
   before it moves.

(Status never appears — §11.1. Re-derivation / generalising the `hue→fill→ink`
triad to the engine categoricals is **not** part of any of these commits — it
changes hex and is a separate contrast-re-audited phase, §6.)

### 11.4 — Per-group gates (all green before the group's PR merges)

- **Byte-identical proof** — `crosswalk.test.js` still resolves the *remaining*
  (still-aliased) groups to identical values; the flipped group leaves the
  crosswalk and is now covered by the vocabulary + contrast gates directly.
- **Unit suite** — incl. `contrast.js` (AA preserved by construction),
  `mermaid-var-map`, `universal-token-vocabulary`.
- **Integration** — structural cross-renderer parity **and**
  `color-parity.test.js` (resolve every bridge token through the emulator
  resolver **and** a marp-cli-rendered Chromium DOM; assert identical RGB —
  indaco + cuoio, light + dark).
- **Pixel-check = zero-diff** vs the pre-flip baseline. This is the **go/no-go**:
  a pure rename must not move a single pixel; any diff means a missed reference
  fell back to `initial`/serif. (`tools/pixel-check.js`.)
- **Visual spot-check** of the group's demo deck, light + dark.

### 11.5 — Closeout (after all five groups are new-canonical)

1. **Post-flip token-tier lint** — extend `tools/check-ownership.js` (§10): no
   `light`/`dark` *word* in any token name (now enforceable — the `*-light`/
   `*-dark` spellings are gone), no Tier-1 primitive consumed for colour-role in
   a component, every theme defines the Tier-2 input set (13 dark wrappers
   exempt, F8). Wire it into the `capabilities:check` / pre-push gate.
2. **`CLAUDE.md` HARD RULE #11 flips** — delete "use the old per-theme token
   names until the flip"; the standing instruction becomes *themes declare the
   universal names*. Update `lib/base/base.docs.md` and `design/theming.md` in
   the same change (HARD RULE #5 / §Default-Operating-Mode doc-sync).
3. **The `tokens:` directive retires (or inverts).** `universal` is now the
   engine itself, so the Drawing-Board A/B has nothing to compare. Either remove
   the toggle, or invert it to a `tokens: legacy` back-compat path driven by the
   *same* `flip()` run in reverse for decks pinned to the old vocabulary. Keep
   `crosswalk.js` + `flip()` regardless — they become the documented historical
   map and the legacy-deck shim, not dead code.
4. **`derive.js` scaffold emits new names** for generated themes; the
   `REQUIRED_TOKENS` groups are renamed to match.
5. **`CHANGELOG.md` `## Unreleased`** — lead with **`Breaking:`**: the old
   per-theme token names (`--c1-light`, `--c-stroke`, `--bg-dark`, `--scale-*`,
   …) are retired; a BYO theme or external consumer on them must adopt the
   crosswalk (or pin `tokens: legacy` if that shim is kept).

### 11.6 — Pre-flight reconciliation (do this first, it's free)

`crosswalk.js`'s header comment claims two consumers that **do not exist** —
`tools/build-universal-css.js` and `docs/src/playground/crosswalk.generated.js`.
The *actual* consumers are `test/unit/tokens/crosswalk.test.js` (applies `flip()`
inline — no build step needed) and `docs/src/pages/drawing-board.astro` (a
direct build-time `require()` of `crosswalk.js`, re-implementing `flip` as
`flipTokens`). Correct the header so the plan never leans on a phantom tool;
this is a comment-only fix that can ride the first group's PR.

### 11.7 — Rollback & risk

- Each group is **one atomic, pure-rename commit**, so `git revert` of that
  commit cleanly restores its alias era; `flip()` makes a re-attempt mechanical.
- The byte-identical guarantee (§6, gated four ways in §11.4) means the only way
  a group regresses is a *missed reference*, which the zero-diff pixel-check
  catches deterministically before merge — there is no "looks close enough"
  failure surface.
- The single irreversible-feeling step is closeout #2 (deleting HARD RULE #11);
  it lands only after all five groups are green and the post-flip lint passes,
  i.e. when the old names already resolve to nothing in the tree.
