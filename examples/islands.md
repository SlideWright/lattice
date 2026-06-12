---
marp: true
theme: cuoio
paginate: true
header: "Lattice · Islands"
footer: "SlideWright · Islands Phase 2"
meta: "Q2 FY26 · Board Pack | Owner · S. Aden"
---

<!-- _class: title silent -->

# Slides as Islands

`Composition Model · Phase 2 — the masthead bay`

A slide is a sea plus a fixed set of berths. Phase 1 lifted the title into a named band; Phase 2 docks the meta and status islands into the band's reserved bay — additive, palette-blind, across every render path.

---

<!-- _class: content islands confidential -->

`Context · The Lift`

## The masthead is now a band, not the top of a flow.

The `islands` modifier wraps the eyebrow and the title into a dedicated masthead band with a hairline rule and a reserved right bay. Everything below this rule is the slide body — a clean, separately-addressable region.

Authoring is unchanged: you still write a backtick eyebrow and a `## title`. The transform does the lifting across all three render paths.

---

<!-- _class: cards-grid islands -->

## The band composes with components untouched.

- Body stays a section child
  - Cards, lists, charts, and tables remain direct children of the section, so every `section.X > …` selector keeps matching. Nothing about the component changes.
- Only the masthead moves
  - The eyebrow and the first heading lift into the band; the rest of the slide is left exactly where the author put it.
- One opt-in token
  - Add `islands` to any content layout. It is incompatible only with `math` and `compare-code`, which drive their own title grid.

---

<!-- _class: stats islands -->

`Evidence · Same Engine, Three Paths`

## The lift is identical across every render path.

`marp-cli, the emulator, and the runtime all dispatch one registry-wired transform.`

1. 3
   - render paths
2. 1
   - opt-in token
3. 0
   - components broken

---

<!-- _class: content islands wip -->

`Takeaway · What Phase 2 Adds`

## The bay now docks meta and status islands.

The masthead bay — empty in Phase 1 — now carries the `meta:` island (a deck-wide date · owner · classification line) and a status chip that re-docks the slide's state marker (this slide is `wip`) from a corner stamp into the bay.

With the band in place, Phase 2 can drop the meta, logo, and status islands into the reserved bay, and Phase 4 can turn the body into a concrete, centred stage — without re-litigating where the title lives.

> Key insight: name the regions once, and every later island has a berth to dock at.

---

<!-- _class: closing silent -->

# The bay is populated.

`Next · Phase 2b — progress · watermark islands`

Inspect this deck against the model in engineering/decisions/2026-06-11-islands.md.
