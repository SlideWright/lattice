---
status: shipped
summary: Surface-aware contrast contract for the inline-code chip, plus the cross-path pill over-match fix
---

# Inline-code chip — surface-aware contrast contract

**Date:** 2026-06-08
**Status:** implemented (branch `claude/inline-code-styling-aGPEA`)
**Scope:** `lib/base/base.elements.css` (the `section code` chip rule),
`lib/base/base.tokens.css` (new `--code-inline-*` token seam),
`lib/base/base.modifiers.css` (per-surface ink rebinds + the pill arm),
all 13 `themes/*.css` (curated chip ink), and
`lib/transformers/pill-tag.js` + registry (the pill over-match fix — the one
non-CSS part). The chip/contrast work is CSS-only; the pill fix adds a shared
transformer across all three render paths.

## Symptom

Inline code chips looked good on some slides and ugly on others, with poor
contrast on dark and light canvases and "pretty terrible" results on accent
surfaces. The same `--accent` token rendered as a glaring near-white box on a
dark bookend, vanished into a card, and read muddy on the key-insight panel —
depending only on *what surface the chip happened to land on*.

## Root cause

Every inline `<code>` was styled by a single, context-blind global
(`base.elements.css`):

```css
section code { background:var(--bg-alt); color:var(--accent); border:1px solid var(--border); … }
```

That trio is curated for exactly one surface — the default canvas (`--bg`) —
and the rule never re-binds for any other. `<code>` plays four roles
(eyebrow/subtitle, pill, chart directive, plain chip); the first three already
carry per-surface overrides, but the plain chip — the literal "just code" case
— was the orphan with zero surface-awareness.

Three concrete failure modes (visual probe in `.scratch/inline-code-probe.md`):

- **A — Dark islands that don't flip `color-scheme`.** `title`/`divider`/
  `closing` bookends and `split-panel .panel-left` paint a dark surface via
  `--bg-dark` but leave `color-scheme` light, so `--bg-alt`/`--accent` resolve
  to their light values → a bright chip on a dark field. (The `.dark` *modifier*
  and fully-dark themes like carbone are fine: they flip `color-scheme`, so the
  light-dark() tokens follow.)
- **B — `--bg-alt`-filled surfaces.** Cards, glossary, citation blockquote, and
  `obligation-matrix.asymmetric` fill with `--bg-alt`; the chip's own fill is
  *also* `--bg-alt`, so the chip background disappears into the surface.
- **C — `--accent-soft` panels.** The KEY INSIGHT blockquote fills
  `--accent-soft`; the chip's grey `--bg-alt` fill clashes and the ink sits on
  an unaudited surface.

Contrast was audited for the wrong pair: themes document `--accent`-on-`--bg`,
but the chip rides `--bg-alt` (darker), costing every theme 0.4–0.8 of ratio.
**mustard** fell to **3.89:1 — below the WCAG AA 4.5:1 floor** — violating
Lattice's "AA throughout" promise. There was no token seam to retune the chip
(`--code-bg`/`--code-text` are reserved for the *fenced block* panel).

## Decision

**1. A currentColor-relative wash, not an opaque surface fill.** The chip's
background and border derive from its own ink via `color-mix(… currentColor …)`,
so they are always a subtle delta from *whatever* surface the chip sits on —
self-adapting to canvas, card, accent-soft, or dark panel with no per-surface
fill rule. This auto-fixes modes B and C.

**2. A three-token override seam** parallel to the block-code pair:

| token | default | role |
|---|---|---|
| `--code-inline-fg` | `var(--accent)` | chip ink — the only value a surface needs to rebind |
| `--code-inline-bg` | `color-mix(in srgb, currentColor 10%, transparent)` | wash fill (optional opaque override) |
| `--code-inline-border` | `color-mix(in srgb, currentColor 22%, transparent)` | hairline (optional override) |

Because bg/border track `currentColor`, **rebinding `--code-inline-fg` alone**
re-tunes the entire chip on any surface.

**3. Rebind the ink on the non-flipping dark islands** (mode A) — the same
enumerated-union pattern the eyebrow/subtitle overrides already use:

```css
section.title code, section.divider code, section.closing code,
section.split-panel:not(.metric) .panel-left code,
section.split-panel.metric .panel-right code { --code-inline-fg: var(--on-dark-primary); }
section.divider.light code { --code-inline-fg: var(--accent); }   /* bright-canvas variant */
```

**4. Curate `--code-inline-fg` per theme — do not settle for the accent
default.** Every palette declares an explicit, AA-audited chip ink (light +
dark), like `--accent` and the state trio. The chip ink is "ink, not fill": a
deeper rendition of the brand hue. Where the raw accent cleared ≥5:1 on the
*worst* surface (the card wash) in both modes it is kept (`var(--accent)`:
ardesia, atelier, carbone, concrete, crepuscolo, onyx); where it fell short the
light ink is deepened toward the brand hue (brina `#386076`, cuoio `#765710`,
indaco `#006599`, laguna `#00636C`, magnolia `#8B404A`, mustard `#6A5112`) or
the dark ink is lifted (burgundy `#CD838E`). Target: ≥5.0:1 on the card wash —
margin over the 4.5:1 AA floor — in both light and dark mode. Ratios are
documented inline in each theme. The wash percentages (10% fill / 22% border)
stay structural and shared; only the ink is a per-theme palette decision.

The audit method (chip ink on a 10% currentColor wash over the surface) and the
full per-theme table are reproducible from the surface tokens; the card surface
(`--bg-alt`) is the conservative worst case (it is darker than `--bg` in light
mode and lighter in dark mode, and `--accent-soft` sits between them).

## Rejected / deferred

- **Keep opaque `--bg-alt` fill, rebind only broken surfaces.** Rejected: the
  currentColor wash is strictly more robust and removes the per-surface fill
  enumeration entirely; the canvas look is preserved (verified visually).
- (none)

## Pill heuristic over-match — fixed (transform layer)

The universal-pill selector `code:has(+ :is(ul,ol))` promoted *mid-sentence*
code to a pill whenever the row had a nested list, because the `+` combinator
skips the intervening text node (confirmed in rendered HTML). CSS cannot
distinguish "code immediately before a nested list" from "code, text, nested
list," so the fix lives in the transform layer: **`lib/transformers/pill-tag.js`**
adds `class="lat-pill"` to a `<code>` whose close tag is immediately followed by
only whitespace then a nested `<ul>/<ol>`, and the CSS arm became
`code:where(:last-child, .lat-pill)`. The kernel runs in all three paths via the
shared registry (`applyToHtml` for marp-cli, `applyToSection` for the emulator,
`applyToDom` for the runtime). The `:last-child` arm is unchanged (it was always
precise). Tagging is generous — it does not check the parent is an `<li>` —
because the universal selector still gates on `… > li > code`, so a stray tagged
node is inert. This is the conflation the "interpreted inline code" proposal can
now build on safely.
