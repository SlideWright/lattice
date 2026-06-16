---
title: Authoring decks
description: How a Lattice deck is structured — front matter, slide separators, layouts, and the authoring contract.
---

A Lattice deck is one Markdown file. You compose it from **named
layouts**, one per slide, and the engine assembles each slide against
the deck's palette. You never set fonts, colors, or positions by hand.

## Anatomy of a deck

```markdown
---
marp: true
theme: indaco       # palette (see Themes & palettes)
paginate: true
header: "Quarterly Review"
---

<!-- _class: title -->

# Deck title

`Category · Date or audience`

One-line subtitle that frames the deck.

---

<!-- _class: cards-grid -->

## Three pillars

- Reliability
  - 99.95% uptime across the quarter.
- Velocity
  - Lead time down 40% since Q1.
- Cost
  - Unit economics improved 12%.
```

Three things to notice:

1. **Front matter** selects the palette (`theme:`), the deck's finish
   (`finish:`), and global chrome (`paginate`, `header`, `footer`).
2. **Headings** separate slides by default — each `##` starts a new one (and a
   `---` still works too). Set `split: rule` for separators-only (see The
   `split:` key below).
3. **`<!-- _class: NAME -->`** picks the layout for that slide. The
   layout decides the structure; your Markdown fills the slots.

## Picking a layout

Each layout has a contract: which headings, lists, and slots it expects,
and what it's for. The layouts are organized into twelve buckets by the
job they do — anchor, statement, inventory, comparison, progression,
evidence, imagery, plus the substance buckets (chart, diagram, math,
code) and the legal domain set.

The fastest way to choose is the **[component reference](/components/)**:
an interactive catalog of every layout with its slots, variants, when to
reach for it, and when not to — and you can preview the whole thing in
any Lattice palette. The same content is also available as a single
[Markdown document](https://github.com/slidewright/lattice/blob/main/reference/components.md).

## The card-style nesting rule

Card-style layouts (`cards-grid`, `cards-stack`, `featured`,
`decision`, `verdict-grid`, and others) expect **nested** list items,
not inline bold titles:

```markdown
- Title
  - body text continues here
```

Not `- **Title.** body text` — the autobold rule on those layouts would
make the body inherit the title's weight. The component reference flags
this per layout, and the repo's commit-time validator catches it across
every deck.

## Modifiers

Any layout accepts universal modifiers appended to the class —
`dark`, `compact`, `loose`, `accent`, state markers, and treatments.
For example `<!-- _class: cards-grid dark -->` renders the grid on the
dark canvas. The catalog of modifiers lives in the design system
reference in the repository.

## The `split:` key — your outline divides the slides

**By default, your headings split the deck.** The first `#` is the lead slide
and every `##` after it opens a new one, so the body is clean Markdown with no
separators to remember:

```markdown
---
theme: indaco
---

# Deck title          ← the lead slide

`Category · Date`

## First topic         ← a new slide

…body…

## Second topic        ← another slide
```

A slide's `<!-- _class: NAME -->` directive and its eyebrow are written *above*
the heading (so the eyebrow renders above the title) and **stay with that
slide** — the break is pulled back over them, never orphaning onto the slide
before. The default is also **hybrid**: an explicit `---` still forces a break,
which is how you give a slide no heading at all (an image slide) or split two
slides under one idea.

To opt back into the classic behaviour — split **only** on `---`, never on a
heading — set `split: rule` in front matter:

```markdown
---
split: rule    # separators only; headings never split
---
```

`split:` takes exactly two values — `headings` (the default) and `rule` — and a
misspelling is caught by the deck linter (`unknown-split`) rather than silently
falling back to the default.

## The `finish:` key — a hand-drawn deck

A **finish** is the deck's type-and-geometry voice, separate from its
palette. Set it once in front matter and every slide inherits it:

```markdown
---
theme: carta        # palette — still owns the colours
finish: sketch      # finish — the whole-deck voice
---
```

`finish:` takes one of three values:

- **`boardroom`** — the clean baseline. The default when you omit the key.
- **`sketch`** — a hand-drawn register: felt-tip headings, a hand-sans for
  prose, and every card/box redrawn as a sketched frame.
- **`sketch-clean`** — hand headings and boxes, but a clean body font for
  text-dense slides.

The finish is **palette-blind** — it wobbles type and geometry, never
colour, so it pairs with any theme. It also **composes** with per-slide
layouts: `finish: sketch` plus `<!-- _class: cards-grid -->` renders a
hand-drawn grid with no extra markup. A misspelled value (`finish: sketchh`)
is caught by the deck linter rather than silently rendering the baseline.

## Autocomplete in the Drawing Board

The **[Drawing Board](/drawing-board/)** is the in-browser editor. It
completes the deck vocabulary as you type, from the same catalog the component
reference and the linter use. Every suggestion is deterministic and offline;
`Ctrl-Space` summons any of them on demand.

- **`theme:` in front matter** — the registered palette names. An unknown one
  renders an unstyled white deck, so the name stays valid.
- **`finish:` in front matter** — the finish-register names (`boardroom`,
  `sketch`, `sketch-clean`), the same set the linter validates, so a typo can't
  slip through. The **Deck setup** drawer also exposes Finish as a picker.
- **`split:` in front matter** — the two split modes (`rule`, `headings`), again
  linter-validated. The **Deck setup** drawer exposes it as the Slide-splitting
  picker.
- **Inside `<!-- _class: … -->`** — layout names (tagged by bucket), then the
  modifiers that layout accepts, its own variants first and the universal ones
  after.
- **On an empty slide** — a `skeleton` completion drops the layout's slot
  scaffold already in the correct nesting, so a card-style slide starts from
  the `- Title` / `  - body` shape rather than the inline-bold trap above.
- **Other slide directives** — `_paginate`, `_header`, `_footer`, and friends
  inside an HTML comment, plus `_paginate`'s `true` / `false` / `skip` values.
- **Fence languages** — the language id after ` ``` `, including the
  `mermaid` and `chart` blocks Lattice renders.
- **Inside a `mermaid` block** — the Mermaid diagram and flow keywords.
- **Inside a `map` slide's list** — the country, state, and group names the
  basemap resolves, including blocs and categories like `European Union` or
  `Global South`, so the spelling matches on the first try.

### Type-ahead — suggestions open on their own

By default the popup opens **the moment your cursor enters a `<!-- _class: … -->`
directive**, before you type anything — so the layout list is right there, and
picking a layout then pressing space cascades straight into its modifiers. Deck
directives (`theme:`, `finish:`, fence languages, …) stay quiet until you type or
press `Ctrl-Space`, so front matter doesn't pop a menu in your face. **Settings →
Workspace → "Open suggestions automatically"** changes the reach: *Components
only* (the default), *Everywhere* (every context opens on entry), or *Off* (the
popup opens only on typing / `Ctrl-Space`).

## Deck setup (front matter without the YAML)

The Drawing Board's **Deck setup** drawer — the sliders button beside the
settings chip — edits the deck's front matter through plain controls, so you
never hand-write the `---` block and the Markdown body stays content-only. It
covers the whole-deck settings: **theme**, slide **size** (16:9 / 4K / 4:3),
**page numbers**, running **header** / **footer**, and a few advanced ones
(a default slide **class**, **math** renderer, document **language**). The
controls are pre-filled from whatever front matter the deck already has, and
each change writes a minimal block back to the top of the source — so the
values persist across refreshes and travel with an exported `.md`. A deck with
nothing configured carries no front matter at all.

**Theme is one value in three places.** The top-bar palette picker, the Deck
setup drawer's theme select, and the editor's `theme:` line are kept in sync:
pick a palette in either control and it's written into the deck (and the
preview + page recolor); type a valid `theme:` in the editor and the picker
follows. Only a registered palette is applied — a typo stays in your source so
you can fix it, but the deck keeps rendering in the last valid palette rather
than going unstyled, and the drawer flags it.

## Where to go next

- [Themes & palettes](/guides/themes/) — choose or author a palette.
- [Component reference](/components/) — every layout's
  authoring contract.
- [Drawing Board](/drawing-board/) — author a full deck in the
  browser (autocomplete, live linting).
- [`reference/skill.md`](https://github.com/slidewright/lattice/blob/main/reference/skill.md)
  in the repo — the full deck-authoring contract.
