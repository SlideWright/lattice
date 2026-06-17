---
status: proposed
summary: Design model for directional text — RTL, LTR, and vertical CJK — via a dir directive, a logical-CSS refactor, and self-hosted OFL font pairs
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

A deck author writes in Arabic, Hindi, Japanese, or traditional Chinese. Three
things have to be true for the slide to read correctly:

1. **Inline direction** — Arabic runs right-to-left; the *layout* (which side
   the eyebrow, list bullets, KPI labels, redline gutter sit on) must mirror,
   not just the glyphs.
2. **Block direction** — traditional CJK runs in vertical columns, top-to-bottom,
   columns flowing right-to-left (`writing-mode: vertical-rl`). This re-pivots
   the whole layout axis, not just text.
3. **The right glyphs (and shaping)** — none of the bundled fonts cover Arabic,
   CJK, or Devanagari, and scripts like Arabic and Devanagari need *shaping*
   (cursive joining, conjunct reordering), not just a glyph swap. Today every
   such deck silently falls back to serif/`system-ui`.

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

### E. Fonts — **register-matched boardroom pairs per script, `:lang()`-gated**

Direction and *script* are separate problems: a script can share Latin's LTR
direction yet still need its own font and complex shaping (Devanagari reorders
matras and forms conjuncts; Arabic joins cursively). And **Noto is a *coverage*
font, not a boardroom one** — defaulting every script to one Noto weight
collapses the display/body contrast that carries a 10/10 slide's hierarchy.

So the rule is **match the register, not the letterforms.** Lattice's Latin
identity is Playfair Display (high-contrast *editorial serif*) for `--font-display`
+ Outfit (clean *geometric sans*) for `--font-body`. Each script gets its
editorial face in the display slot and its clean workhorse in the body slot.
All picks are **OFL/open** — mandatory, since they must self-host and embed in
PDF export (CDN fonts are banned, below):

| Script (lang) | Display — *Playfair register* (editorial) | Body — *Outfit register* (clean sans) | Notes |
|---|---|---|---|
| Arabic | **Amiri** (classical Naskh) | **IBM Plex Sans Arabic** | Amiri = the editorial-Naskh analog to a contrast serif; Plex Arabic is corporate-grade. Covers Persian/Urdu too |
| Devanagari (Hindi) | **Tiro Devanagari Hindi** (Tiro Typeworks) | **Mukta** (or IBM Plex Sans Devanagari) | Tiro is a refined text serif beside Playfair; Mukta a clean geometric workhorse. Covers Marathi/Nepali |
| Chinese Simplified | **Noto Serif SC** (Source Han Serif, Songti) | **Noto Sans SC** (Source Han Sans) | Source Han **is** the boardroom-grade open CJK — no better open option exists |
| Chinese Traditional | **Noto Serif TC** | **Noto Sans TC** | Same superfamily, correct TC glyph set |
| Japanese | **Shippori Mincho** (editorial Mincho) | **Noto Sans JP** (Source Han Sans) | Shippori Mincho steps above generic Noto Serif for display; Sans JP for body |
| Korean | **Noto Serif KR** (Myeongjo) | **Pretendard** | Pretendard is the de-facto premium Korean UI sans (ships harmonized Latin); Serif KR carries the editorial display register |

**Two register caveats (cultural, not compromise):** Arabic and CJK have no
true didone/high-contrast-serif tradition — Naskh (Amiri) and Mincho/Songti
(Noto Serif, Shippori) are the correct *editorial-register* analogs. The picks
above map register, not contrast mechanics.

Wire these into `--font-display` / `--font-body` in `base.tokens.css`, each
gated behind `:lang()` so a Latin deck downloads none of them. **Decision
(owner, 2026-06-16): ship all three CJK scripts (SC/TC/JP) in the first cut**,
not one-then-expand — and Korean + Devanagari join them, so the first cut covers
the full named matrix.
- **Self-host**, do not CDN: `engineering/gotchas.md` documents that the sandbox
  TLS proxy MITMs Google Fonts and silently falls back to serif. Self-hosting is
  also the only way PDF export embeds the glyphs reliably. CJK fonts are large
  (~10MB+ subsetted) — subset aggressively and load per-`:lang()`.
- **These pairings are a recommendation, not yet verified** — the sandbox can't
  render the real webfonts, so they need the owner's eyes on a true render
  before they're locked (the §F honesty gate applies).

### F. Verification — **a named test-language matrix, each earning its slot**

The test set is **not** "a few RTL samples." Each language is chosen because it
stresses a *distinct* rendering capability — so the matrix doubles as a coverage
checklist. Three independent axes are in play: **direction** (LTR/RTL/vertical),
**bidi** (mixing scripts + Latin digits/brand names), and **complex shaping**
(reordering, conjuncts, cursive joining). A language can be LTR yet still a
shaping torture test — which is exactly why Hindi and Korean belong here, not
just the RTL/CJK cases.

| Language | Script | Direction | What it proves (its reason to be in the set) |
|---|---|---|---|
| **Arabic** | Arabic | RTL | Cursive **joining/shaping** + RTL mirroring + bidi (Latin digits, brand names) — the hardest combined case, and our sole RTL row |
| **Hindi** | Devanagari | LTR | Complex **shaping in isolation**: matra reordering, conjuncts — proves shaping works with *no* direction change |
| **Chinese (Simplified)** | Han (SC) | LTR **+ vertical** | CJK metrics + `writing-mode: vertical-rl` |
| **Chinese (Traditional)** | Han (TC) | LTR **+ vertical** | Same axis, distinct glyph set (TC ≠ SC) |
| **Japanese** | Kanji + Kana | LTR **+ vertical** | Hardest **vertical** case: mixed scripts, tate-chū-yoko (horizontal runs inside vertical) |
| **Korean** | Hangul | LTR | Syllable-block composition + word-spacing — proves "CJK" isn't one monolith |

"etc" is deliberately bounded: this six-language set spans every axis once
(RTL×1, vertical×3, complex-shaping×2, plus Korean's spacing case) — Arabic
carries RTL **and** the hardest shaping case, so a second RTL row earns little.
Further scripts — Hebrew (RTL without shaping, if we ever want to isolate
direction), Thai (no word boundaries → line-break stress), Urdu (Nastaliq) —
are **named as future rows**, added only when a real deck needs them, so the
suite stays meaningful rather than exhaustive.

- **Demo deck** per HARD RULE #9: `examples/directional-text.md` carries one
  slide per matrix row (+ a **mixed-bidi** slide: Arabic prose with an inline
  English product name and a number), rendered to committed PDF in light + dark.
- **Per-component semantic-invariant tests** assert the section carries the
  right `dir`/`lang` and that mirrored layouts keep their structural invariants
  (eyebrow on the inline-start, redline gutter mirrored). These run **per matrix
  language** so a regression in any one script is caught.
- **Honesty gate:** the sandbox can't load the real webfonts (MITM → serif
  fallback), so glyph **shaping** (Arabic joining, Devanagari conjuncts) can't be
  verified here — only layout mirroring (which needs no fonts). Per the §Quality
  Bar "say so if a tool can't run here" clause, **glyph/export fidelity for every
  matrix language needs the owner's inspection** on a machine with the fonts,
  exactly like the export-changes-require-inspection rule.

---

## Recommended shape (the assembled decision)

| Axis | Decision |
|---|---|
| A. Control | New `dir:` directive (`auto`/`ltr`/`rtl`/`tb`); start emitting real `lang=` + `dir=` on the section |
| B. Granularity | Global + spot `_dir:`/`_lang:`; per-element via `dir: auto` + bidi algorithm |
| C. RTL layout | Logical-CSS refactor (189 decls / 48 files), + a lint guard against new physical inline props |
| D. Vertical | `writing-mode` on the section; **attempt-all + `verticalBlocked` blocklist**; text buckets reviewed first |
| E. Fonts | Self-hosted, `:lang()`-gated **register-matched OFL pairs** — Amiri/Plex Arabic · Tiro/Mukta (Hindi) · Source Han Serif+Sans (CJK) · Shippori Mincho/Noto Sans JP · Noto Serif KR/Pretendard — subset |
| F. Verify | **6-language test matrix** (Arabic·Hindi·Chinese SC/TC·Japanese·Korean) spanning RTL/vertical/shaping; demo deck + per-language invariant tests; **owner inspection** for glyph fidelity |

### Why this order

RTL is the high-value, tractable win and the logical-CSS refactor it requires is
*also* the foundation vertical text needs — so the expensive step is paid once
and serves both. Vertical renders by default (attempt-all) with breakage caught
by the per-language invariant tests + demo deck before merge, and a
`verticalBlocked` entry added only for a reviewer-confirmed broken component.

### Phasing

1. **Directives** — `dir:`, real `lang=`/`dir=` emission, spot support, tests.
   (Small, self-contained, unblocks everything.)
2. **Logical-CSS refactor + lint guard** — the big one; per-bucket, maker-checker
   per HARD RULE's parallel-review.
3. **Fonts** — self-host + `:lang()` gating, all matrix scripts.
4. **Vertical** — `writing-mode` + `verticalBlocked` blocklist; CJK/Japanese rows
   of the matrix are the primary stress.
5. **Demo deck + docs** (`base.docs.md`, `CHANGELOG`) + owner glyph inspection
   across the full test-language matrix.

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
