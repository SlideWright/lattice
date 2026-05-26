# overflow

Authoring-time diagnostic. When a slide's content exceeds the 1280×720
budget, the renderer adds `class="overflow"` to the section so CSS can
draw a red warning ring around the slide.

The ring is meant to be impossible to miss during deck review and
trivial to fix (delete content, shorten prose, switch to `compact`).
Shipped decks should never have overflow rings.

---

## How it fires

- `lattice-runtime.js` measures rendered slide height against the
  720px budget. If overflow is detected, it adds `.overflow` to the
  section at runtime.
- `lattice-emulator.js` produces an analogous static check during PDF
  build. Decks with overflow sections produce a red-ring PDF and a
  warning line in stdout.

The `.overflow` class is the contract. Anything that detects overflow
and wants the ring just adds the class.

---

## How to silence

There is no "silence" — by design. If the ring is on the slide, the
slide is broken; the fix is to make the content fit.

Common remedies:

- **Switch to `compact`** (`<!-- _class: <layout> compact -->`):
  tightens spacing scale ~25%; usually buys back one card of room.
- **Split the slide.** Two cards-grid slides at 4 items each beat one
  cards-grid at 6.
- **Trim prose.** Per the editorial rule, content slides go past ~40
  words become walls of text the audience stops reading anyway.
- **Switch component.** If `cards-grid` is bursting, `cards-stack`
  uses the full slide width per card. If `compare-prose` is bursting,
  the `vertical` modifier stacks the cards.

---

## Where the CSS lives (current)

The `section.overflow` rule currently lives in
`lib/base/base.modifiers.css` (alongside other cross-cutting modifiers).
A planned cleanup will extract it into `lib/helpers/overflow/overflow.styles.css`
to live next to this doc — the rule is a helper, not a modifier, and
this folder is its proper home. The extraction is straightforward but
out of scope for the Phase 5 docs refactor; see commit history when
the move lands.

---

## Other helpers (future)

This folder is the home for diagnostic and authoring-time helpers.
Anticipated additions:

| Helper | Purpose |
|---|---|
| Slot tracer | Highlight which DOM element each manifest-declared slot resolved to. Tier-1 debugging aid when a layout looks broken. |
| Debug grid | 1280×720 overlay with safe-area markers. |
| Token swatches | Render every palette token on a single slide for theme calibration. |
| A11y inspector | Outline focus order, contrast warnings, alt-text gaps. |

Each lands as its own subfolder: `lib/helpers/<name>/<name>.docs.md`
+ `<name>.styles.css` + optionally `<name>.transform.js`. Same pattern
as `lib/helpers/overflow/`.

---

## See also

- `lib/base/base.docs.md` — the rest of the cross-cutting chrome
  conventions (eyebrow, subtitle, key insight, etc.).
- `reference/engineering/audit.md` — the deck audit workflow that the
  overflow ring feeds into.
