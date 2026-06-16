---
status: design-decision
version: 1
supersedes: none
last-status-update: 2026-06-16
---

# Directional text — RTL, LTR, and vertical (tb) support

**Date:** 2026-06-16 · **Status:** design-decision (shape aligned with the
owner; no engine code yet) · **Owner:** Sharmarke

> **Not canonical / no shipped behaviour yet.** This fixes the *shape* of the
> capability before any CSS or transform lands. When this note and a shipped
> surface disagree, the shipped surface wins.

Related: `lib/engine/directives.js` (the directive table this extends),
`lib/engine/slides.js` (where directives land on the `<section>`),
`lib/base/base.tokens.css` (the font stacks this widens),
`engineering/gotchas.md` (the sandbox webfont-MITM caveat that gates
verification), `engineering/typography.md` (the 12-token scale RTL/CJK must
respect).

---

## The question

A deck author writes in Arabic, Hebrew, Japanese, or traditional Chinese. Three
things have to be true for the slide to read correctly:

1. **Inline direction** — Arabic/Hebrew run right-to-left; the *layout* (which
   side the eyebrow, list bullets, KPI labels, redline gutter sit on) must
   mirror, not just the glyphs.
2. **Block direction** — traditional CJK runs in vertical columns, top-to-bottom,
   columns flowing right-to-left (`writing-mode: vertical-rl`). This re-pivots
   the whole layout axis, not just text.
3. **The right glyphs** — none of the bundled fonts cover Arabic, Hebrew, or
   CJK. Today every such deck silently falls back to serif/`system-ui`.

Today Lattice does **none** of this. `lang:` is parsed (`directives.js:34`) but
inert — it lands as `data-lang`/`--lang` on the section and nothing consumes it.
No `dir` directive exists. Every layout uses physical `left`/`right` CSS. The
font stacks are Latin-only. (Full current-state audit in the task thread; the
short version: it's Latin-centric LTR by design.)

**Decision:** support all three (RTL + LTR + vertical-tb), in that priority
order, behind two new directives and a logical-CSS refactor.

---

## The axes

Naming the axes is the design — each is an independent decision.

| Axis | The choice |
|---|---|
| **A. Author control surface** | How does a deck declare direction? New `dir:` directive? Reuse `lang:`? Auto-detect from script? |
| **B. Granularity** | Deck-wide only, or per-slide (spot `_dir:`), or per-element (a single RTL pull-quote inside an LTR deck)? |
| **C. Layout mechanism** | Logical CSS properties (mirror for free) vs. an explicit `[dir=rtl]` override sheet vs. JS-driven? |
| **D. Vertical (tb) mechanism** | `writing-mode` on the whole section vs. opt-in per component vs. a separate vertical layout family? |
| **E. Fonts** | Which scripts to cover, and self-host vs. CDN (the sandbox MITMs CDN webfonts)? |
| **F. Verification** | How do we prove mirrored/vertical layouts are correct when the sandbox can't load the webfonts? |

---

## Candidate moves, per axis

### A. Author control surface — **new `dir:` directive + make `lang:` real**

Three options:

1. **Infer `dir` from `lang`.** `lang: ar` → RTL automatically. Zero new
   surface, but conflates two orthogonal things: a deck can be Arabic-LTR
   (transliterated) or English-RTL (rare, but bidi quoting). Rejected as the
   *only* control — too magic.
2. **A standalone `dir:` directive** (`auto` | `ltr` | `rtl` | `tb`). Explicit,
   mirrors the HTML `dir` attribute authors already know. **Chosen.**
3. **Auto-detect from content** (first strong character). Brittle for mixed
   decks, invisible to the author. Rejected — but we adopt its spirit via
   `dir: auto`, which delegates per-element resolution to the browser's bidi
   algorithm (the safe default).

**Recommendation:** add `dir:` as the primary control **and** start emitting a
real `lang=` HTML attribute (today `lang:` only produces `data-lang`). A real
`lang` attribute drives the browser's font fallback and `:lang()` selectors;
`data-lang` does neither. `dir` defaults to `auto` when `lang` is an RTL script
and unset; otherwise `ltr`.

### B. Granularity — **deck global + per-slide spot, defer per-element**

- `dir:` is **global** (front matter / bare comment) and **spot** (`_dir:` →
  this slide). This matches every other applied directive and costs nothing
  extra in `slides.js`. Note `lang:` is currently `GLOBAL_ONLY`
  (`directives.js:40`) — we relax it to allow spot `_lang:` too, since a single
  Arabic quote slide in an English deck is a real case.
- **Per-element** RTL (one pull-quote) is handled *for free* by `dir: auto` +
  the Unicode bidi algorithm once the section carries a real `dir`. No new
  syntax. A dedicated inline marker is deferred until a deck needs it.

### C. Layout mechanism — **logical CSS properties (the load-bearing decision)**

This is the expensive, correct path and the one HARD RULE-adjacent choice.

- **Convert physical → logical** across the layout CSS: `margin-left` →
  `margin-inline-start`, `padding-right` → `padding-inline-end`, `text-align:
  left` → `text-align: start`, `border-left` → `border-inline-start`, `left:` →
  `inset-inline-start`, etc. Under `dir=rtl` these mirror automatically; under
  `dir=ltr` they're identical to today. **One mechanism serves both
  directions** — no parallel `[dir=rtl]` override sheet to drift out of sync.
- **Scope:** `grep` finds **189 physical declarations across 48 CSS files**
  (`margin/padding/border-left|right`, `text-align:left|right`). Not all need
  converting — some `left`/`right` are genuinely physical (a drop shadow offset,
  a decorative rule that shouldn't mirror). Each needs a judgement call, which
  is why this is a refactor, not a sed script.
- **Guardrail:** add a lint (extending `tools/check-ownership.js` or a new
  `tools/check-logical-css.js`) that flags *new* physical inline-axis properties
  in layout CSS, the way HARD RULE #3 polices hex literals. Otherwise the
  refactor rots the moment someone adds a component.

The alternative — an `[dir=rtl] { ... }` override sheet — was rejected: it
doubles every rule, drifts, and silently misses new components. Logical
properties are the modern, single-source answer.

### D. Vertical (tb) mechanism — **per-section `writing-mode`, opt-in component support**

Vertical is genuinely harder than RTL and must be scoped honestly:

- `dir: tb` sets `writing-mode: vertical-rl` + `text-orientation: mixed` on the
  section. Inline-axis logical properties *also* re-pivot under vertical writing
  modes — so the same logical-CSS refactor that buys RTL buys *most* of vertical
  for free. That's the strategic reason to do C first.
- **But** many card/grid layouts assume a horizontal main axis (fixed-height
  rows, `grid-template-rows`, aspect-locked media). These will **not** survive a
  blind pivot. **Decision (owner, 2026-06-16): attempt-all + blocklist** — every
  component renders vertical by default, and a component is added to a
  `verticalBlocked` list (manifest flag) only once a reviewer confirms it breaks.
  This trades a faster, broader rollout for the risk that an un-reviewed grid
  ships pivoted-and-broken — mitigated by the demo deck and per-component
  invariant tests catching breakage before merge. (The rejected alternative was
  opt-in `verticalReady`: safer but it gates every component behind a sign-off,
  stalling coverage.)
- Review order still leads with the **text-forward buckets** (anchor, statement,
  content, quote) where vertical CJK is most idiomatic and least likely to break
  — but they render vertical from day one, not after graduation.

### E. Fonts — **self-host Noto Sans/Serif Arabic, Hebrew, CJK**

- Add Noto Sans/Serif Arabic, Hebrew, and CJK to `--font-display` /
  `--font-body` stacks in `base.tokens.css`, gated behind `:lang()` so a
  Latin deck doesn't pay the download. **Decision (owner, 2026-06-16): ship all
  three CJK scripts — Simplified (SC), Traditional (TC), and Japanese (JP) —
  in the first cut**, not one-then-expand. Complete coverage up front; the cost
  is ~3 large fonts and a wider verification surface (see open question below).
- **Self-host**, do not CDN: `engineering/gotchas.md` documents that the sandbox
  TLS proxy MITMs Google Fonts and silently falls back to serif. Self-hosting is
  also the only way PDF export embeds the glyphs reliably. CJK fonts are large
  (~10MB+ subsetted) — subset aggressively and load per-`:lang()`.

### F. Verification — **render real Arabic/Hebrew/CJK decks, view whole slides**

- A demo deck per HARD RULE #9: `examples/directional-text.md`, with Arabic
  (RTL), Hebrew (RTL), and Japanese (vertical-tb) slides + a mixed bidi slide,
  rendered to committed PDF in both light/dark.
- Per-component **semantic-invariant** tests asserting the section carries the
  right `dir`/`lang` and that mirrored layouts keep their structural
  invariants (the eyebrow is on the inline-start, the redline gutter mirrors).
- **Honesty gate:** the sandbox can't load the real webfonts (MITM), so glyph
  *shaping* can't be fully verified here — only layout mirroring (which doesn't
  need the fonts). This is the one place the §Quality Bar "say so if a tool
  can't run here" clause applies: **export/glyph fidelity needs the owner's
  inspection** on a machine with the fonts, exactly like the existing
  export-changes-require-inspection rule.

---

## Recommended shape (the assembled decision)

| Axis | Decision |
|---|---|
| A. Control | New `dir:` directive (`auto`/`ltr`/`rtl`/`tb`); start emitting real `lang=` + `dir=` on the section |
| B. Granularity | Global + spot `_dir:`/`_lang:`; per-element via `dir: auto` + bidi algorithm |
| C. RTL layout | Logical-CSS refactor (189 decls / 48 files), + a lint guard against new physical inline props |
| D. Vertical | `writing-mode` on the section; **attempt-all + `verticalBlocked` blocklist**; text buckets reviewed first |
| E. Fonts | Self-hosted, `:lang()`-gated Noto Arabic/Hebrew + **all three CJK (SC/TC/JP)**, subset |
| F. Verify | Demo deck + invariant tests for mirroring; **owner inspection** for glyph/export fidelity |

### Why this order

RTL is the high-value, tractable win and the logical-CSS refactor it requires is
*also* the foundation vertical text needs — so the expensive step is paid once
and serves both. Vertical ships incrementally behind per-component sign-off so a
half-pivoted grid never reaches a slide.

### Phasing

1. **Directives** — `dir:`, real `lang=`/`dir=` emission, spot support, tests.
   (Small, self-contained, unblocks everything.)
2. **Logical-CSS refactor + lint guard** — the big one; per-bucket, maker-checker
   per HARD RULE's parallel-review.
3. **Fonts** — self-host + `:lang()` gating.
4. **Vertical** — `writing-mode` + `verticalReady` manifest flag, text buckets.
5. **Demo deck + docs** (`base.docs.md`, `CHANGELOG`) + owner glyph inspection.

---

## Open questions for the owner

Resolved 2026-06-16: **CJK breadth → all three (SC/TC/JP)**; **vertical default →
attempt-all + blocklist** (both folded into the sections above). One remains:

1. **Font budget** — with all three CJK scripts in the first cut, a CJK deck's
   font download is substantial (each Noto CJK weight is multi-MB even
   subsetted). Is a larger one-time download acceptable, or do we need
   per-script lazy loading / aggressive `unicode-range` subsetting so a JP deck
   never fetches SC/TC? This is a Phase 3 (fonts) decision and does not block
   Phases 1–2.

Phase 1 (directives) is pure plumbing and blocked by nothing — it can start
while the font-budget question settles.
