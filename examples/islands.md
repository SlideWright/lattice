---
marp: true
theme: cuoio
paginate: true
header: "Lattice · Islands"
footer: "SlideWright · Islands Phase 2b"
meta: "Q2 FY26 · Board Pack | Owner · S. Aden"
---

<!-- _class: title silent -->

# Slides as Islands

`Composition Model · Phase 2b — the bay + the progress rail`

A slide is a sea plus a fixed set of berths. The masthead band holds the title and a populated bay; the footer now carries a section progress rail. Additive, palette-blind, across every render path.

---

<!-- _class: divider -->

`Section 01`

## The Lift

---

<!-- _class: content islands confidential -->

`Context · The Lift`

## The masthead is now a band, not the top of a flow.

The `islands` modifier wraps the eyebrow and title into a dedicated masthead band with a hairline rule and a reserved right bay. Everything below the rule is the slide body — a clean, separately-addressable region. Authoring is unchanged.

---

<!-- _class: cards-grid islands -->

## The band composes with components untouched.

- Body stays a section child
  - Cards, lists, charts, and tables remain direct children of the section, so every `section.X > …` selector keeps matching.
- Only the masthead moves
  - The eyebrow and first heading lift into the band; the rest is left exactly where the author put it.
- One opt-in token
  - Add `islands` to any content layout. Incompatible only with `math` and `compare-code`.

---

<!-- _class: divider -->

`Section 02`

## The Bay

---

<!-- _class: stats islands -->

`Evidence · Same Engine, Three Paths`

## The lift is identical across every render path.

`marp-cli, the emulator, and the runtime dispatch one registry-wired transform.`

1. 3
   - render paths
2. 1
   - opt-in token
3. 0
   - components broken

---

<!-- _class: content islands wip -->

`Takeaway · The Bay`

## The bay docks the meta and status islands.

> Key insight: the `meta:` line and a status chip (this slide is `wip`) now ride the bay the masthead reserved in Phase 1.

---

<!-- _class: divider -->

`Section 03`

## Orientation

---

<!-- _class: content islands -->

`Footer · The Progress Rail`

## The footer now orients the audience.

The progress island reads the deck's `divider` slides as sections and stamps a dot-rail into the footer centre of every `islands` slide — current section elongated and accented, labelled with the divider title. You are on dot three of three.

---

<!-- _class: closing silent -->

# The bay and the rail have landed.

`Next · Phase 2c — the watermark island`

Inspect this deck against the model in engineering/decisions/2026-06-11-islands.md.
