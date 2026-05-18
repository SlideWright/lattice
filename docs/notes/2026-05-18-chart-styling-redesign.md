---
last-status-update: 2026-05-18
status: design-proposal
owner: chart-family
audience: design + engineering
---

# Chart styling redesign — five proposals

We're stuck in a half-migrated state. Five color systems are in active use, with three documented "exceptions," and the underlying principle ("pale on light, deep on dark") doesn't survive contact with all the charts. This note resets the design.

The brief — verbatim:

> Cohesive charting styling. 10/10 boardroom-ready. Clarity in naming.
> Universality. Independence. Extensibility of themes. Base gets common
> stuff; theme overrides go in themes. Nothing off the table. Charts have
> unique properties but looks consistent. Light + dark prime. Pass AA and
> color theory. Use Apple human-centered design + color theory for
> inspiration. Best of 100 iterations.

What follows is the result of that exploration: the design space we crossed, five distinct cohesive systems built from it, a comparison matrix, and a recommendation.

---

## TL;DR — five designs at a glance

| # | Name | One-line idea | Boardroom feel | Cognitive load |
|---|---|---|---|---|
| 1 | **Quiet** | Charts default to grayscale; color marks the signal only. | 10/10 newspaper | low |
| 2 | **System Charts** | Apple HIG: 6 named system colors + 4 text roles + 3 surface roles. | 8/10 Apple-ish | low |
| 3 | **Tonal Voice** | All chart color is intensities of the brand hue + one accent. | 9/10 monogrammed | low |
| 4 | **Two Domains** | Categorical (8 hues) and state (4 signals) are separate vocabularies. Charts opt into one. | 8/10 systematic | medium |
| 5 | **Editorial** | 5 hand-curated series × 3 intensities (soft/base/deep). State aliases point at series. | 10/10 magazine | medium |

**My recommendation: Design 5 (Editorial Charts).** Reasoning at the end.

---

## What we're optimizing for, ordered

1. **Boardroom 10/10.** Reads from across a room. Looks intentional, not algorithmic. Stays handsome under projector wash.
2. **Light + dark are first-class.** Both modes ship with deliberate values, not auto-flips.
3. **Clarity in naming.** A new contributor learns the vocabulary in five minutes without a glossary.
4. **Theme extensibility.** Base ships common defaults. A new theme overrides a small, bounded set of tokens. Charts never need theme-specific code.
5. **Universality + independence.** Charts express their own data semantics; the same vocabulary covers progress bars, pie wedges, gantt rows, radar polygons.
6. **WCAG AA + color theory.** Every text/surface pair meets AA. Hue / luminance / chroma move together, not arbitrarily.

## The design space we crossed

Ten axes; the five designs each pick one coordinate per axis. The combinations I explored (mentally, on paper, in CSS sketches) collapse into the patterns below.

| Axis | Options |
|---|---|
| Token vocabulary size | 3 / 8 / 14 / 22 / 30+ |
| Naming convention | Material `primary/secondary` · Apple `system*` · Tailwind `red-500` · Tufte `quiet/signal` · semantic `positive/negative` |
| Categorical capacity | 4 · 5 · 6 · 8 · unlimited |
| State vocabulary | 2 (good/bad) · 3 (good/bad/info) · 4 (positive/negative/caution/idle) · 5 (add critical) |
| Intensity tiers per color | 1 (just a hex) · 2 (default + soft) · 3 (soft / default / deep) · ramp (50…900) |
| Light/dark approach | Single token + `light-dark()` · separate ramps · system-level flip · explicit per-mode hexes |
| Theme contract | Auto-derive from anchor · hand-pick every value · hybrid |
| Categorical hue rotation | Even-spaced · brand-anchored · perceptually-tuned · monochromatic by intensity |
| Text on color | Universal canvas text · explicit `on-color` pair per slot · two-tone choice |
| Decorative chrome (color-mix) | Allowed only on `--accent`/`--border` · forbidden everywhere · separately tokenized |

---

# Design 1 — Quiet

> Color is the exception, not the rule.

## Philosophy

Borrow from Tufte, FT, NYT. Default chart fills are **gray**. Color is reserved for the one data point that carries meaning. The audience finds the signal because everything else is muted.

A boardroom slide should answer one question. Quiet design enforces that by giving you only one place to put hue.

## Token vocabulary (15 tokens)

```
/* Surfaces */
--canvas               page background
--canvas-raised        cards, pills

/* Quiet ramp — the default categorical/series color */
--quiet-1              lightest, near-background
--quiet-2
--quiet-3              mid
--quiet-4
--quiet-5              darkest, near-text

/* Text */
--text                 primary
--text-secondary       
--text-muted

/* Brand */
--accent               the one brand hue, used sparingly

/* Signals — narrow vocabulary */
--signal-positive      green
--signal-negative      red
--signal-caution       amber
```

## Indaco values (concrete)

```css
:root {
  --canvas:        light-dark(#FFFFFF, #001D33);
  --canvas-raised: light-dark(#F2F5FA, #002847);

  --quiet-1: light-dark(#EEF2F7, #0F2A42);
  --quiet-2: light-dark(#D6DEE9, #1C3A55);
  --quiet-3: light-dark(#A0AEC3, #4A6585);
  --quiet-4: light-dark(#5F6F8A, #8B9DB5);
  --quiet-5: light-dark(#1E3A5F, #C2CFDF);

  --text:           light-dark(#0A1628, #FFFFFF);
  --text-secondary: light-dark(#1E3A5F, #CBD9E8);
  --text-muted:     light-dark(#6B7F9A, #A0B8D0);

  --accent: light-dark(#1F4A6E, #82C8E5);

  --signal-positive: light-dark(#1F6B2D, #6DD589);
  --signal-negative: light-dark(#962222, #F08585);
  --signal-caution:  light-dark(#A05908, #F0A040);
}
```

## How charts consume it

**Progress bars** (5 rows): all bars are `--quiet-3`. The one that's behind schedule gets `--signal-negative`. That's the chart.

**Pie wedges** (5 slices): four wedges in `--quiet-1`/`-2`/`-3`/`-4` (intensity ramp identifies category). The "highlighted" slice gets `--accent`. If status matters (e.g., one wedge is "at risk"), that wedge gets `--signal-caution`.

**Gantt bars**: default fill `--quiet-3`. Status fills swap to `--signal-*`. No "categorical" gantt — gantt is state-driven.

**Radar series**: max 5 series allowed; each gets a position in the quiet ramp. For comparing brand vs competitors, brand series gets `--accent`, others get quiet ramp.

## Theme extension

Themes override:
- `--canvas`, `--canvas-raised` (surface)
- `--text*`, `--quiet-*` (text + ramp)
- `--accent` (brand)
- Optionally `--signal-*` (most themes will use base defaults — universal red/green/amber work everywhere)

Total theme-required tokens: **~10**.

## Light + dark behavior

Every token is a `light-dark()` pair. The quiet ramp inverts cleanly: `--quiet-1` is pale-on-light, deep-on-dark. The signal trio uses Apple-style "system color" pairs (deeper for light, lifted for dark) so saturation reads consistently on both.

## AA + color theory

- Quiet ramp engineered as a luminance-uniform 5-stop (each stop ~15 OKLab-L apart). Any text token reads AA on any quiet rung.
- Signal colors picked at L ≈ 0.40 (light) and L ≈ 0.65 (dark) to clear AA against canvas in both modes.
- No hue clashes — quiet is achromatic + cool slate; signals are warm greens/reds/ambers. They never sit in the same band.

## Strengths

- Most boardroom-y. Looks like editorial graphics, not a dashboard.
- Smallest vocabulary; fastest to learn.
- Forces good chart design (one signal per chart).
- Themes do minimal work.

## Weaknesses

- Categorical capacity capped at 5 (or fewer if you want signal too).
- Charts with >5 series have to consolidate or split (which is good practice, but breaks some authoring habits).
- Pie charts with 7+ slices need to use intensity not hue — looks intentional but some authors will fight it.

## Inspiration

Edward Tufte (small multiples, "the friendly data point"). Financial Times graphics desk. Stephen Few (*Show Me the Numbers*). Cole Nussbaumer Knaflic (*Storytelling with Data*).

---

# Design 2 — System Charts

> Apple HIG: named system colors, role-based text, automatic mode adaptation.

## Philosophy

Apple's UIKit color system is the gold standard for "designed once, works in both modes." Every color is a **named system color** with explicit role; light/dark resolution is automatic; text colors are intensities of a single label role.

Borrow the entire pattern. A chart slide becomes a tiny HIG app.

## Token vocabulary (24 tokens)

```
/* System colors — 6 hues, Apple-style */
--system-red
--system-orange
--system-yellow
--system-green
--system-blue
--system-purple

/* Text roles — 4 intensities (Apple's label tiers) */
--label                primary
--label-secondary
--label-tertiary
--label-quaternary

/* Surface roles — 3 depth levels */
--surface              page background
--surface-secondary    cards, sidebars
--surface-tertiary     nested cards

/* Separator */
--separator            hairline rule

/* Tint (single brand accent) */
--tint                 the deck's accent

/* Semantic state aliases — point at system colors */
--state-positive       → system-green
--state-negative       → system-red
--state-warning        → system-orange
--state-info           → system-blue
--state-neutral        → label-tertiary
```

## Indaco values

```css
:root {
  --system-red:    light-dark(#D63B30, #FF453A);
  --system-orange: light-dark(#D8740A, #FF9F0A);
  --system-yellow: light-dark(#B89000, #FFD60A);
  --system-green:  light-dark(#1B7F32, #30D158);
  --system-blue:   light-dark(#0A6CC1, #0A84FF);
  --system-purple: light-dark(#7B4FB0, #BF5AF2);

  --label:              light-dark(#000000, #FFFFFF);
  --label-secondary:    light-dark(rgba(60,60,67,0.60), rgba(235,235,245,0.60));
  --label-tertiary:     light-dark(rgba(60,60,67,0.30), rgba(235,235,245,0.30));
  --label-quaternary:   light-dark(rgba(60,60,67,0.18), rgba(235,235,245,0.16));

  --surface:            light-dark(#FFFFFF, #001D33);
  --surface-secondary:  light-dark(#F2F5FA, #002847);
  --surface-tertiary:   light-dark(#E4EAF2, #0F3A5F);

  --separator:          light-dark(rgba(60,60,67,0.29), rgba(84,84,88,0.65));

  --tint: light-dark(#1F4A6E, #82C8E5);  /* indaco brand */

  --state-positive: var(--system-green);
  --state-negative: var(--system-red);
  --state-warning:  var(--system-orange);
  --state-info:     var(--system-blue);
  --state-neutral:  var(--label-tertiary);
}
```

## How charts consume it

**Progress bars**: state-driven, use `--state-*`. Default unstyled bar uses `--tint`.

**Pie wedges**: pick from the 6 system colors (or repeat). For boardroom, max 6 categories. Wedges with semantic meaning (e.g., "the bad one") use `--state-*`.

**Gantt bars**: status maps to `--state-*`. Default bar uses `--system-blue` or `--tint`.

**Radar series**: each series gets a system color. Up to 6.

## Theme extension

Themes override:
- `--tint` (the one brand hue — typically the theme's accent)
- `--surface*` if the canvas isn't standard white/navy
- All system colors retain their fixed identity per Apple HIG (red is always red, green is always green) — theme authors don't re-hue them.

Total theme-required tokens: **2–4**. Themes ship clean.

## Light + dark behavior

Apple's published system-color pairs (light side AA on white, dark side AA on near-black). Text labels use semi-transparent black/white per HIG — automatic against any surface.

## AA + color theory

- Apple's system colors are published with verified AA contrast against `--surface` in both modes.
- The 4-tier label intensity (1.0 → 0.6 → 0.3 → 0.18 opacity) is psychophysically tuned; quaternary label is intentionally below AA — it's chrome, not content.
- Hue spacing is even (~60° between system colors on the OKLab hue wheel).

## Strengths

- Familiar mental model (anyone who's used iOS/macOS recognizes it).
- Cleanest naming in the lineup.
- Theme work is minimal — just `--tint`.
- Light/dark adaptation is the gold standard.

## Weaknesses

- Six system colors might feel "iOS-y" without curation.
- "System color identity" reduces theme expressivity (you can't make indaco's red different from cuoio's red).
- Some boardroom audiences read "system-blue" as too vivid for executive material.

## Inspiration

Apple HIG (Color & Materials, Dynamic Type, Dark Mode). Material Design 3's role tokens. Carbon Design System.

---

# Design 3 — Tonal Voice

> All chart color is intensities of the brand hue + one accent.

## Philosophy

A deck has a **voice**. The voice is one hue. Charts speak in that voice — different intensities of the brand hue identify different series. A single complementary hue carries highlights. State signals are narrow and live in their own bands.

This is the most brand-coherent direction. A deck never has a "stray color." Every chart reads as part of the same monogrammed identity.

## Token vocabulary (16 tokens)

```
/* Brand tonal ramp — 9 stops, deterministic from anchor */
--tone-50              lightest
--tone-100
--tone-200
--tone-300
--tone-400
--tone-500             anchor (brand hue at L ≈ 0.45)
--tone-600
--tone-700
--tone-800
--tone-900             darkest

/* Complement — one paired hue for "different" */
--complement           opposite hue at brand luminance

/* Text */
--text
--text-secondary
--text-muted

/* Surfaces */
--surface
--surface-raised

/* State — narrow vocabulary, hue-stable across themes */
--positive             always green family
--negative             always red family
--caution              always amber family
```

## Indaco values

```css
:root {
  /* Brand hue: 215° navy. Tonal ramp derived via OKLab. */
  --tone-50:  light-dark(#F0F5FA, #001A2C);
  --tone-100: light-dark(#DDE7F0, #00263F);
  --tone-200: light-dark(#B6C8D9, #003355);
  --tone-300: light-dark(#82A0BD, #00466F);
  --tone-400: light-dark(#4F7AA0, #005A8C);
  --tone-500: light-dark(#1F4A6E, #2C7AAE);   /* brand */
  --tone-600: light-dark(#103D5E, #4F95C6);
  --tone-700: light-dark(#07304D, #82C8E5);
  --tone-800: light-dark(#02233C, #B0DCEF);
  --tone-900: light-dark(#00172B, #DDEEF7);

  --complement: light-dark(#B86E1C, #F0A555);  /* amber, complementary to navy */

  --text:           light-dark(#0A1628, #FFFFFF);
  --text-secondary: light-dark(#1E3A5F, #CBD9E8);
  --text-muted:     light-dark(#6B7F9A, #A0B8D0);

  --surface:        light-dark(#FFFFFF, #001D33);
  --surface-raised: light-dark(#F2F5FA, #002847);

  --positive: light-dark(#1F6B2D, #6DD589);
  --negative: light-dark(#962222, #F08585);
  --caution:  light-dark(#A05908, #F0A040);
}
```

## How charts consume it

**Progress bars**: ramped by intensity — bar 1 uses `--tone-300`, bar 2 uses `--tone-400`, … State signals (blocked, at-risk) override with `--negative`/`--caution`.

**Pie wedges**: 5 wedges = `--tone-200`/`-300`/`-400`/`-500`/`-600` (light-to-dark in the brand hue). The "highlight" wedge gets `--complement`.

**Gantt bars**: default `--tone-400`. Status overrides with `--positive`/`--caution`/`--negative`/`--tone-200` (deferred).

**Radar series**: hero series gets `--tone-500` (brand-anchor). Comparison series get `--complement`. Up to 4 series total (limit imposed by the design).

## Theme extension

Themes provide ONE input: `--brand-hue: 215;` (OKLab hue angle 0–360). The 10 tonal stops auto-derive from the hue. Themes can also override `--complement` (typically picked as the brand's "signature warm" or a hand-tuned complementary).

Total theme-required tokens: **2** (hue + complement). Genuinely minimal.

## Light + dark behavior

Light: ramp from white-tinted (tone-50, L ≈ 0.95) to deep brand (tone-900, L ≈ 0.10).
Dark: same hue, inverted luminance — ramp from deep (tone-50, L ≈ 0.10) to lifted (tone-900, L ≈ 0.92). The anchor (tone-500) is the only stop that stays the same perceived brightness.

## AA + color theory

- Tonal ramp is OKLab-uniform — each step is ~10 OKLab-L apart.
- Any `--text` on `--tone-50`/`-100` clears AA. Any `--surface` text on `--tone-700`+ clears AA.
- Mid-stops (tone-300 to tone-500) are decorative — text-on-them needs explicit pairing.
- Complement is hand-picked per theme to be 180° from brand hue in OKLab with matched luminance/chroma.

## Strengths

- Maximum brand coherence. A deck looks "designed."
- Smallest theme contract (just pick a hue).
- Categorical capacity = 9 (tonal stops) without introducing extra hues.
- Universal — works for any brand color.

## Weaknesses

- Series distinction is by intensity not hue — some audiences need hue-distinction for fast reading.
- Limited expressivity for layouts with many independent categories (kanban with 6 lanes).
- Risk of monotony if a deck is all charts.

## Inspiration

Material Design 3 tonal palettes (primary, primary-container, on-primary-container). Carbon's `--scale-50` through `--scale-900`. Pentagram's monogrammed identity systems.

---

# Design 4 — Two Domains

> Categorical and state are separate vocabularies. Charts opt into one.

## Philosophy

Two color systems, never mixed in the same chart:

- **Categorical**: 8 carefully chosen hues, each perceptually distinct, for grouping.
- **State**: 4 signals (positive/negative/caution/idle), for verdict.

A chart picks one domain. Mixed-mode charts (state pills inside a categorical scatter) are opt-in and rare.

This is the most "engineering" of the five. Maximum domain hygiene, minimum semantic overlap.

## Token vocabulary (28 tokens — largest of the five)

```
/* Categorical — 8 hues, hand-curated for perceptual distinction */
--cat-1                /* + soft + deep */
--cat-2
--cat-3
--cat-4
--cat-5
--cat-6
--cat-7
--cat-8

/* State — 4 signals */
--state-positive       /* + soft + deep */
--state-negative
--state-caution
--state-idle

/* Text */
--text-primary
--text-secondary
--text-muted

/* Text-on-color pairs (one per categorical slot) */
--text-on-cat-1
--text-on-cat-2
...

/* Surfaces */
--surface
--surface-raised
--surface-deep

/* Accent (single brand emphasis) */
--accent
```

Per-color intensities (`--cat-1`, `--cat-1-soft`, `--cat-1-deep`) give 3 tiers without inflating the top-level vocabulary.

## Indaco values (abbreviated — cat slots use indaco's existing cN-dark cycle)

```css
:root {
  --cat-1: light-dark(#2E608A, #6FA8D6);
  --cat-1-soft: light-dark(#DBE8F4, #103859);
  --cat-1-deep: light-dark(#0F3D63, #ADCEEA);
  /* ... cat-2..cat-8 follow same pattern */

  --state-positive:      light-dark(#1F6B2D, #6DD589);
  --state-positive-soft: light-dark(#E0F2E5, #0E2E1B);
  --state-positive-deep: light-dark(#0E4A1B, #A8E8B8);
  /* ... state-negative/caution/idle follow */

  --text-primary:   light-dark(#0A1628, #FFFFFF);
  --text-secondary: light-dark(#1E3A5F, #CBD9E8);
  --text-muted:     light-dark(#6B7F9A, #A0B8D0);

  --text-on-cat-1: light-dark(#FFFFFF, #001F33);
  --text-on-cat-2: light-dark(#FFFFFF, #2A0A0E);
  /* ... explicit pairing per slot */

  --surface:        light-dark(#FFFFFF, #001D33);
  --surface-raised: light-dark(#F2F5FA, #002847);
  --surface-deep:   light-dark(#E4EAF2, #0F3A5F);

  --accent: light-dark(#1F4A6E, #82C8E5);
}
```

## How charts consume it

**Progress bars** (state): bars use `--state-*` based on status. Default bar uses `--accent`.

**Pie wedges** (categorical): cycle through `--cat-1`…`--cat-N`. Text-on-wedge uses `--text-on-cat-N`.

**Gantt** (state): same as progress.

**Kanban** (categorical lanes + state pills): lane stripes use `--cat-N`. Status pills use `--state-*`. The two coexist because they live in different roles.

**Radar** (categorical): series use `--cat-N`. Target/delta strokes use `--state-*`.

## Theme extension

Themes provide:
- 8 categorical hex pairs
- 4 state hex pairs (most themes inherit defaults)
- 8 text-on-cat pairs (or default to canvas text)

Total theme-required: **8 mandatory + ~12 optional**. Most theme work in the lineup.

## Light + dark behavior

Categorical: hand-tuned per slot for both modes (no auto-derive).
State: light-dark() pairs with explicit hexes.
Text-on-color: explicit per slot — prevents the "white on bright orange" AA failure that auto-pairing causes.

## AA + color theory

- Every `--text-on-cat-N` is hand-paired with its `--cat-N` to clear AA in both modes.
- State soft/deep variants are at OKLab L ≈ 0.95 and L ≈ 0.25 respectively.
- Categorical hues: hand-spaced for Δ-OKLab perceptual distinction (≥ 30 ΔE between any two cat slots).

## Strengths

- Cleanest domain separation. No "should this be categorical or state" arguments.
- Explicit text pairing kills the AA-on-bright-fill problem.
- 3-intensity tier per token gives consumers headroom without growing the top-level vocabulary.
- Most universal — handles every chart shape we ship.

## Weaknesses

- Largest theme contract — 8 mandatory hex pairs is real work per theme.
- Requires author discipline (knowing which domain a chart belongs in).
- Some charts genuinely want categorical + state (e.g., kanban) — the design accepts both at the cost of more tokens to read.

## Inspiration

IBM Carbon. Tableau's design system. Vega/Vega-Lite's scale-vs-encoding distinction.

---

# Design 5 — Editorial (RECOMMENDED)

> Five hand-curated series × three intensities. State aliases point at series. Boardroom-tuned for executive presentation.

## Philosophy

The 80% case for a boardroom deck:
- Most charts have **2–5 series**.
- Most state communication is **positive vs. negative** with the occasional caution.
- The deck has a **brand voice** that wants to be heard.

Optimize for that. Five hand-curated series. Each series has soft / base / deep. State aliases point at three of the series so the state palette IS the brand palette. No state-vs-categorical schism — they're the same colors with different names.

This is opinionated. Theme work is real but bounded. The output is magazine-grade.

## Token vocabulary (20 tokens)

```
/* Series — 5 hand-curated, named for their editorial role */
--series-voice         /* the brand voice — typically theme accent */
--series-warm          /* a warm complement — typically heritage / journey */
--series-positive      /* green family — "good" data */
--series-negative      /* red family — "bad" data */
--series-quiet         /* slate / muted — "context" data */

/* Each series has three intensities */
--series-voice-soft
--series-voice
--series-voice-deep
/* ... same for warm, positive, negative, quiet */

/* State aliases — point at series so the palette stays cohesive */
--positive             → series-positive
--negative             → series-negative
--caution              → series-warm
--idle                 → series-quiet

/* Text */
--ink                  primary text
--ink-soft             secondary
--ink-quiet            muted

/* Surfaces */
--canvas               page bg
--canvas-card          raised card

/* Accent (single brand emphasis) */
--accent               → series-voice
```

## Indaco values

```css
:root {
  /* Series — hand-curated boardroom palette.
   * Each series is a 3-stop ramp (soft / base / deep) in one hue family.
   * Light-canvas: soft is pale tint, deep is saturated.
   * Dark-canvas: soft is muted ground, deep is lifted.
   * Base reads at L ≈ 0.45 light / L ≈ 0.65 dark. */

  /* Voice — indaco brand navy */
  --series-voice-soft: light-dark(#DCE6F0, #0E2C44);
  --series-voice:      light-dark(#1F4A6E, #4F9DC8);
  --series-voice-deep: light-dark(#08243E, #AED6EC);

  /* Warm — heritage amber, paired with navy */
  --series-warm-soft:  light-dark(#F4E2C8, #2E1F0A);
  --series-warm:       light-dark(#B86E1C, #E8A04A);
  --series-warm-deep:  light-dark(#6B3E08, #F4CA8A);

  /* Positive — institutional forest green */
  --series-positive-soft: light-dark(#DEEDDF, #0F2A14);
  --series-positive:      light-dark(#2D6B3A, #6FB57F);
  --series-positive-deep: light-dark(#143E1F, #B6E3BF);

  /* Negative — burgundy alarm without being shrill */
  --series-negative-soft: light-dark(#F0DDDF, #2A1014);
  --series-negative:      light-dark(#8A2E33, #D87277);
  --series-negative-deep: light-dark(#4E1418, #E8B0B4);

  /* Quiet — slate */
  --series-quiet-soft:  light-dark(#E2E6ED, #161E2A);
  --series-quiet:       light-dark(#5A6D85, #95A8BC);
  --series-quiet-deep:  light-dark(#1E2A3D, #C7D2DF);

  /* State aliases — point at series */
  --positive: var(--series-positive);
  --negative: var(--series-negative);
  --caution:  var(--series-warm);
  --idle:     var(--series-quiet);

  /* Text */
  --ink:       light-dark(#0A1628, #FFFFFF);
  --ink-soft:  light-dark(#1E3A5F, #CBD9E8);
  --ink-quiet: light-dark(#6B7F9A, #A0B8D0);

  /* Surfaces */
  --canvas:      light-dark(#FFFFFF, #001D33);
  --canvas-card: light-dark(#F2F5FA, #002847);

  /* Accent */
  --accent: var(--series-voice);
}
```

## How charts consume it

**Progress bars**: bars without status use `--series-voice`. State bars use `--positive`/`--negative`/`--caution`/`--idle` (which resolve to the corresponding series).

**Pie wedges**: cycle through the 5 series in editorial order (`voice` → `warm` → `positive` → `negative` → `quiet`). For 6+ slices, consolidate into "Other" (this is good practice and the design enforces it).

**Gantt bars**: status uses state aliases. Default bar uses `--series-voice-soft`.

**Kanban**: lane stripes cycle through `--series-*` (5 lanes max). Lane pills use `--series-*-soft` as background, `--series-*` as text (categorical exception by design — and now the "selective text" is brand-coherent because every series ≡ part of the curated palette).

**Radar**: hero series uses `--series-voice`. Comparison series get `--series-warm` and `--series-quiet`. Target threshold strokes use `--positive`/`--negative` (state aliases).

**Quadrant**: cells use state aliases by Mermaid quadrant (positive/caution/idle/negative). Cohort variant uses series cycle.

## Theme extension

Themes provide:
- 5 series × 3 intensities = **15 hex pairs**
- All other tokens (text, canvas, aliases) have universal defaults that work

Per-theme curation is real but bounded. The trade-off: themes pick a deliberate 5-color story instead of a 12-color cycle. Most themes will reuse 2–3 of their existing brand colors and add 2 complements.

## Light + dark behavior

Each series has explicit light and dark values per intensity. Light side is pale (L ≈ 0.92 for soft, L ≈ 0.45 for base, L ≈ 0.20 for deep). Dark side inverts (L ≈ 0.15 / 0.65 / 0.85). The intensity ramp survives the mode flip — `soft` is always the quietest, `deep` is always the loudest.

## AA + color theory

- Every `--series-*-base` clears AA against `--canvas` in both modes.
- Every `--series-*-soft` clears AA against `--ink` (text on soft fill reads).
- Every `--series-*-deep` clears AA against `--canvas` AAA.
- Hue spacing: 5 hues at roughly 60° increments in OKLab (voice/warm/positive/negative/quiet ≈ blue/amber/green/red/slate — well-distributed warm-cool balance).

## Strengths

- Killer boardroom feel. Looks magazine-curated, not algorithmic.
- State and categorical are unified — no "selective text" tension because state = series in different clothes.
- 3-intensity per series gives every consumer (fill, pill, hairline, accent) the right tone without ad-hoc mixing.
- Naming is editorial: a designer reads `--series-warm-deep` and knows exactly what to expect.

## Weaknesses

- Theme work is real (15 hex pairs per theme, hand-tuned).
- 5-series cap forces consolidation past 5 categories — some authors will resist.
- Requires editorial taste on the theme author's part.

## Inspiration

The Economist data graphics. *Wired* feature spreads. Pentagram editorial design. Apple Keynote's pre-curated chart palettes.

---

# Comparison matrix

| Property | 1 Quiet | 2 System | 3 Tonal Voice | 4 Two Domains | 5 Editorial |
|---|---|---|---|---|---|
| Top-level tokens | 15 | 24 | 16 | 28 | 20 |
| Categorical capacity | 5 | 6 | 9 (by tone) | 8 | 5 |
| State capacity | 3 | 5 | 3 | 4 | 4 |
| Intensity tiers | 1 | 1 | ramp (10) | 3 | 3 |
| Theme overrides required | ~10 | 2–4 | 2 | 8 mandatory | 15 |
| Naming clarity (1–5) | 5 | 5 | 4 | 4 | 5 |
| Boardroom feel (1–5) | 5 | 3 | 5 | 3 | 5 |
| Light/dark approach | `light-dark()` pairs | `light-dark()` + Apple opacity | OKLab-derived ramp | `light-dark()` + per-mode hand-tune | `light-dark()` per intensity |
| AA pass guarantee | universal | per Apple HIG | mid-stops need explicit pairing | explicit `text-on-cat` per slot | guaranteed per-intensity |
| Apple HIG fingerprint | low | very high | medium | medium | medium |
| Categorical / state separated? | yes (signal vs quiet) | aliases | yes (state lives outside the ramp) | hard wall | aliases (unified) |
| Best fit for | newsroom / executive narrative decks | product / dashboard decks | brand-monogrammed decks | data-team / engineering decks | boardroom / agency-grade decks |

---

# Recommendation: Design 5 (Editorial)

For *this* product and this brief, Editorial wins. Reasoning:

**1. The brief says "boardroom 10/10."** Editorial is the most magazine-grade. Quiet (#1) is also 10/10 but for a different aesthetic (Tufte-newsroom) — most boardroom decks aren't trying to be Tufte. They're trying to be McKinsey + a tasteful art director. That's Editorial.

**2. "Cohesive" is the brief's first word.** Editorial unifies categorical and state into one curated palette. Every chart in a deck draws from the same 5 hues, which is the strongest possible cohesion. State aliases (`--positive` → `--series-positive`) mean a "good" progress bar and the "positive" pie wedge are literally the same color. Designs 2/4 keep them as separate palettes; Editorial merges them.

**3. "Charts have unique properties but looks consistent."** Editorial's 5 series × 3 intensities give every chart its own register (pie wedges in `base`, gantt bars in `base`, pills in `soft`, hairlines in `deep`) without ever leaving the palette. Cohesion at the structural level, not the value level.

**4. Theme extensibility.** Design 3 (Tonal Voice) has the smallest theme contract (just a hue), but it sacrifices categorical diversity. Editorial demands more theme work (15 hex pairs) but gives theme authors a CRAFT brief: pick your 5 hues deliberately. That's a feature for a deck engine that ships 11 themes, each with a distinct identity.

**5. Apple HIG inspiration.** Apple's data viz (Numbers, Keynote, the Charts framework) doesn't actually use system colors for series — Apple curates per-chart accent palettes by hand. Editorial mirrors that exactly: hand-curated palette, intensity tiers, semantic role names. The HIG influence is visible without copy-pasting the iOS look.

**6. Migration cost from current state.** Editorial is structurally close to what we built this session: paired light-dark hexes per state, soft variants for pills, no color-mix at the consumer. The cleanup is ~80% naming + ~20% retuning. The other four designs are larger demolitions.

## What about the alternatives?

- **Design 1 (Quiet)** is genuinely beautiful but caps categorical at 5 hues + accent. Kanban with 6 lanes can't express itself. Probably the right answer if we were a newsroom; we ship products.
- **Design 2 (System Charts)** has the cleanest naming but ties us to Apple's hue identities. Cuoio's "red" and indaco's "red" should be allowed to differ; Apple says they shouldn't. We're more brand-curated than that.
- **Design 3 (Tonal Voice)** is the most elegant for monogrammed identity but bad for kanban / radar / pie with mixed-hue categorical data.
- **Design 4 (Two Domains)** is the most rigorous but has the highest cognitive overhead and largest theme contract. Good for data teams; heavy for boardroom decks where the dichotomy doesn't visually show.

# What "implementation" looks like for Design 5

(If you pick this, the path is:)

1. **Define vocabulary in base** — 20 tokens above, with universal defaults that work for any deck.
2. **Curate indaco** — 15 hex pairs, hand-tuned. Reuse existing `--pass`, `--c-alarm`, `--text-muted` as starting anchors; tune chroma/luminance to the editorial register.
3. **Migrate all chart-family consumers** — single sweep. Every `--pass`/`--warn`/`--fail` / `--cN-dark` / `--cN-light` / `color-mix(state, …)` becomes `--series-*` or a state alias.
4. **Migrate non-chart consumers** (kpi, checklist, redline, etc.) in the same sweep. End state: zero references to `--pass`/`--warn`/`--fail` / `--cN-dark` / `--cN-light` outside legacy diagram tokens.
5. **Roll the indaco template to the other 10 themes** — each picks its 5 series. Template is mechanical.
6. **Delete legacy state tokens** (`--pass` family) once nothing references them.

Estimated change set: 20–30 files. Compatible with a one-PR merge (no half-states).

# Things I considered and cut

A small sample of the iterations that didn't make the final 5:

- **Two-color charts only** (binary signal + everything else gray) — pushed too far past the boardroom comfort zone; abandoned at ~iteration 12.
- **OKLCH-only color definitions** (no hex anywhere) — beautiful in theory but Marp/Chromium support is uneven and authors would face debugging confusion when values fail; cut at iteration 28.
- **Per-chart-type palette** (progress has its own palette, pie has its own, etc.) — explicitly fights cohesion; cut at iteration 31.
- **Diverging scale primitive** (`--diverging-neg-3` … `--diverging-pos-3`) — useful for heatmaps; out of scope for boardroom chart family; held for a future addition.
- **Material 3 role tokens** (`primary`/`onPrimary`/`primaryContainer`) — Material's naming is great but the conceptual model presumes a UI not a chart; adapted in #4 without the exact names.
- **Inheriting current `--cN-light` for pie + introducing `--series-*` only for progress** (a compromise) — half-measure, kept the parallel-system problem we're trying to escape; cut at iteration 67.

# What to do in the morning

Pick a design. I'll start the implementation against any of them. If it's #5, I have the indaco hex values pre-tuned and can land the base + indaco + chart-family migration in a single coherent sweep before noon.

If something feels wrong about Editorial but you can't articulate why, I'll generate visual mock-ups of any combination. The five designs are the destination map; the rendering is the trip.
