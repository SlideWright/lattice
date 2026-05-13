---
status: exploration-failed, handoff-for-next-agent
version: 1
supersedes: none
related:
  - ../../lattice.css (.image.full at line 1465; the shipping precedent)
  - ../../examples/universal-fullwidth-modifier.md (final exploration deck on branch claude/universal-fullwidth-modifier-OhO3l)
---

# Universal `.full` modifier — handoff

> **Status.** Seven iterations on this branch did not produce a visual
> treatment the user accepted. The exploration is paused. This note
> captures what's salvageable so the next agent (likely a different
> LLM) can pick it up without repeating the dead-ends.

## Goal

Generalise `.image.full`'s "content claims the canvas" vocabulary to
any content shape — cards, code, mermaid, prose — so that a single
`.full` modifier hides deck chrome, lets the body bleed to canvas
edges, and anchors the slide's title + trailing source in a coherent
typographic block.

## Reference: `.image.full`

The shipping precedent lives at `lattice.css:1465-1507` (commit
`e95e349`, 2026-05-09). Pattern: section padding 0, a 6px `--accent`
border on the left edge, h2 absolutely positioned in a 42% column on
the left over the image, trailing paragraph at the top of the column.
`.mirror` flips sides. Works because the image is decorative — losing
half of it behind the accent column is fine.

The **open design question** is how to translate this anchor for
content that is _not_ a decorative image. Bottom rails, translucent
overlays, and a literal port of the vertical accent stripe were all
rejected. The right answer is still open.

## Salvageable infrastructure

### 1. Chrome suppression

```css
section.full header,
section.full footer { display: none !important; }
section.full::after { display: none !important; }
section.full { border-top: none !important; }
```

The pagination is on `::after`. Lattice's spectrum top border is on
`border-top` (or, in `section.dark`, on `background-image` — see
`lattice.css:2031-2035`). Both need killing.

### 2. Body bleed depth (orthogonal modifier)

```css
section.bleed-hard  { --body-bleed-x: 0;            --body-bleed-y: 0; }
section.bleed-soft  { --body-bleed-x: 12px;         --body-bleed-y: 12px; }
section.bleed-inset { --body-bleed-x: var(--sp-md); --body-bleed-y: var(--sp-md); }

section.full {
  padding: var(--body-bleed-y, 12px) var(--body-bleed-x, 12px) !important;
}
```

Stackable with any `.full` variant. The user never explicitly endorsed
or rejected this — keep it on the table.

### 3. Theme adaptation

Use only `light-dark()`-bound tokens for the visible material:
`--bg`, `--bg-alt`, `--accent`, `--text-heading`, `--text-body`,
`--text-muted`, `--border`. `section.dark` flips `color-scheme: dark`
and every token swaps. Never use fixed brand hex literals like
`--brand-blue-mid` for visible material — they don't adapt.

Demo'd successfully in v4–v7 dark-theme slides.

### 4. Front-matter `style: |` injection

The emulator (`lattice-emulator.js:773-794`) reads a YAML
block-scalar `style:` directive from the deck's front-matter and
injects it verbatim into the rendered HTML head — AFTER `lattice.css`,
so the cascade works in the author's favour. This is the right escape
hatch for in-deck experiments without polluting `lattice.css`.

**Gotcha.** An inline `<style>` element inside the markdown body
gets its contents mangled — the emulator's markdown pipeline wraps
each blank-line-separated block in `<p>` tags, making the CSS inert.
Always use the front-matter form.

### 5. Authoring conventions (lattice-wide)

```markdown
`Eyebrow text`        <- inline-code paragraph BEFORE h2 = eyebrow
                         (lattice.css:333-360, already styled as
                         uppercase mono small-caps in --text-muted)

## Heading

- bullets...

_Trailing italic_     <- AFTER the list becomes .below-note via the
                         emulator's transform
```

**Critical gotcha.** Only italics _after_ the list are wrapped as
`.below-note`. An italic between `h2` and the list stays as a bare
`<p><em>` and won't match `.below-note` selectors. If the visual
needs the caption immediately under the title, position the
`.below-note` with `flex: order` or absolute positioning — don't try
to author it between h2 and the list.

### 6. Eyebrow selector

```css
/* This works: */
section.full > p:has(> code:only-child):has(+ h2) { ... }

/* This does NOT work: */
section.full > p:has(> code:only-child):first-child { ... }
```

The section's first child is `<header>` (the deck chrome wrapper),
not the eyebrow. Use `:has(+ h2)` to match a code-only paragraph
that precedes the heading.

### 7. Mirror modifier

Already proven on `.image.full` (`lattice.css:1496-1507`). Same
authoring pattern (`.mirror` class) should carry over to `.full`.

### 8. Cross-content stress test

A `.full` candidate is only universal if it survives all four:

- `cards-grid` (the emulator transforms `<ul>` into `.cards-grid-inner > .card` divs — selectors that target raw `<ul>` won't match)
- `code` (the panel has its own `<pre>` styling; section padding affects it)
- `diagram` (mermaid renders as an SVG inside `<pre class="mermaid">` then post-processed)
- `content` (prose / bullets; the body extends naturally to bottom)

The exploration deck on the branch demonstrates the pattern for each.

## Three-renderer parity

Any authoring transform has to land in **all three** paths or they
drift (see `CLAUDE.md` and `docs/references/workflow.md`):

1. `lattice-emulator.js` — build-time CLI; inline implementations
2. `marp.config.js` → `lib/*.js` — the marp-cli path
3. `lattice-runtime.js` — DOM transforms for marp-vscode preview

Pure-CSS `.full` (which is what the exploration aimed at) only
touches `lattice.css` and avoids this constraint. The moment you
add a markdown-to-DOM transform you owe all three.

## What didn't work

Brief, so the next agent doesn't repeat:

- **Horizontal bar at top or bottom of canvas** (v1–v5) — read as
  too thick, no soul. Tried solid `--bg-alt`, accent stripes,
  translucent vellum, frost, spectrum washes, half-mask, inset
  panels. None landed.
- **Translucent overlays** (v4, v5) — body bleeds under, rail floats
  over with `color-mix(--bg-alt 82%, transparent)`. Read as washy.
- **Vertical accent stripe ported from `.image.full`** (v6) — 6px
  `--accent` on left, 36% column with h2 + caption pinned to the
  floor. The user said the empty material above the title-block
  reads as wasted space when the body isn't a photo. The same
  shape that works for images doesn't work for cards.
- **Five named editorial layouts** (v7) — hero / signature / plate /
  keynote / sidebar. Each a different recognisable register (annual
  report, op-ed, museum plate, Apple keynote, editorial spread).
  Heroic typography (fs-3xl display serif). Rejected.

## Useful references on the branch

- `examples/universal-fullwidth-modifier.md` — v7 deck (last commit
  `7a6af37`); five named moves with the CSS, eyebrow + caption
  bindings, dark-theme demos. Read the front-matter `style: |` block
  to see how all five variants are implemented as scoped overrides.
- Earlier iterations are accessible by commit SHA in git history:
  v1 `b462786`, v2 `15cc012`, v3 `4ca9899`, v4 `39647b6`,
  v5 `8c6c4de`, v6 `d83a970`, v7 `7a6af37`. The PDFs are committed
  alongside the markdown for each.

## Suggested brief for the next agent

> Generalise `.image.full` to any content shape. The body must claim
> the canvas (deck chrome hides, content bleeds). The title + trailing
> source need an anchor that does NOT read as a bar, a panel, a
> translucent overlay, or a literal port of the `.image.full` accent
> column. Heroic typography alone (v7) was also rejected. The right
> answer is open. Study `.image.full` carefully, look at how Apple
> Pages, Keynote, Notion, and Linear handle the "full-bleed slide
> with metadata anchor" problem, and propose a single direction
> before coding.
