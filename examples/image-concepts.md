---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · Image Layout Concepts"
---

<!-- _class: title -->
<!-- _paginate: false -->

# Five Image Layout Concepts

`Lattice · Image Layout Prototypes`

Five distinct visual identities for half-canvas and full-bleed image slides — each iterated to its sharpest form.

---

<!-- _class: divider -->
<!-- _paginate: false -->

`Concept 01 · image-razor`

## The Argument / Evidence Pair.

---

<!-- _class: image-razor -->

`Architecture · Signal Pipeline`

## The signal-to-decision gap is 14 days. It should be three.

Between intake and the decision log, signals sit unscored in a shared document that no one owns. The pipeline collapses that gap to a single weekly cadence.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image-razor mirror -->

`Architecture · Signal Pipeline`

## Four stages. One owner per stage. Zero handoff ambiguity.

The hairline marks the argument on the left and the evidence on the right. Mirror it when the image carries the primary claim and the text is the annotation.

![bg left](sample-image-landscape.svg)

---

<!-- _class: image-razor contain -->

`Architecture · Codebook Schema`

## The codebook model has seven required fields and two optional ones.

Contain mode letterboxes the asset on a clean matte — use it for schematics and diagrams where crop destroys meaning. The hairline still marks the join.

![bg right](sample-image-portrait.svg)

---

<!-- _class: image-razor full -->

## From intake to decision — the complete signal arc.

Four stages, one weekly cadence, one accountable owner per node. The pipeline has no optional steps.

![bg](sample-image-landscape.svg)

---

<!-- _class: image-razor dark -->

`Architecture · Signal Pipeline`

## Dark canvas. The hairline reads as accent against the dark field.

The `--accent` token auto-resolves to the palette's dark-mode accent — the hairline stays legible without any additional rule.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image-razor full dark -->

## Signal without structure is noise with ambition.

The pipeline converts that noise into decisions that can be audited, reproduced, and improved.

![bg](sample-image-landscape.svg)

---

<!-- _class: divider -->
<!-- _paginate: false -->

`Concept 02 · image-brief`

## The Executive Brief. Formal document authority.

---

<!-- _class: image-brief -->

`Phase Readiness · Q3 2025`

## Phase 1 readiness across four workstreams — on track for August close.

The 4px accent strip at the top of the text panel signals formal document status. Use image-brief when the slide is a status report or executive summary, not a narrative moment.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image-brief mirror -->

`Phase Readiness · Q3 2025`

## Mirrored: the strip follows the text panel to the right slot.

The strip is produced by a stacked background gradient — it never requires a pseudo-element and never breaks across render paths.

![bg left](sample-image-landscape.svg)

---

<!-- _class: image-brief contain -->

`Delivery · Milestone Tracker`

## Milestone tracker: three of five gates cleared as of week 22.

Contain mode on image-brief gives the asset a clean --bg-alt matte, consistent with the document register of the layout. The strip remains at 4px — no heavier in contain mode.

![bg right](sample-image-portrait.svg)

---

<!-- _class: image-brief full -->

## Governance model: three tiers, one escalation path.

The full-bleed variant places a solid --bg panel on the left 40% of the canvas with a 4px --accent left border. Executive register, maximum readability.

![bg](sample-image-landscape.svg)

---

<!-- _class: image-brief dark -->

`Phase Readiness · Q3 2025`

## Dark brief. The accent strip intensifies on a dark surface.

The strip colour resolves through `--accent` — on dark themes it picks up the palette's dark accent without any additional overrides.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image-brief full dark -->

## Four workstreams. One sponsor. No ambiguity on accountability.

Dark full-bleed brief: the solid panel becomes the dark surface, the accent border frames the entry point. Authority without drama.

![bg](sample-image-landscape.svg)

---

<!-- _class: divider -->
<!-- _paginate: false -->

`Concept 03 · image-museum`

## The Editorial Plate. Image mounted like a print.

---

<!-- _class: image museum -->

`Codebook Architecture · Visual Reference`

## The codebook architecture, visualised as a dependency graph.

The image is inset 20px from the top, right, and bottom of its panel, flush only at the split line. A 1px inset border frames it like a mounted print. The --bg-alt matte is the signature.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image museum mirror -->

`Codebook Architecture · Visual Reference`

## Mirror: the mount opens to the left, flush at the right split.

The inset reverses — 20px on left, top, and bottom; flush at the right edge where the image meets the text. The framing reads consistently in both orientations.

![bg left](sample-image-landscape.svg)

---

<!-- _class: image museum contain -->

`Signal Schema · Field Reference`

## Schema diagram: seven required fields, two optional, one derived.

Contain on image-museum keeps the same inset mount geometry but letterboxes the asset — ideal for technical diagrams where the full extent matters.

![bg right](sample-image-portrait.svg)

---

<!-- _class: image museum full -->

## The full signal archive — six months, visualised.

Full-bleed museum centres the asset on a generous --bg-alt matte with uniform 40px inset on all four sides. The image breathes. The border frames it as an object, not a wallpaper.

![bg](sample-image-landscape.svg)

---

<!-- _class: image museum dark -->

`Codebook Architecture · Visual Reference`

## Dark museum: the matte resolves to the dark --bg-alt surface token.

The 1px border and matte both auto-switch through their respective tokens. No additional dark-mode overrides required.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image museum full dark -->

## Architecture review. Every dependency made visible.

Dark full-bleed museum: --bg-alt resolves to its dark value, the border holds. The mounted-plate register survives theme inversion intact.

![bg](sample-image-landscape.svg)

---

<!-- _class: divider -->
<!-- _paginate: false -->

`Concept 04 · image-anchor`

## The Left Anchor. Decisive, structural, committed.

---

<!-- _class: image -->

`Strategic Direction · Q3 2025`

## Ship the codebook model. This quarter. Not next quarter.

The 6px --accent left border is the anchor. It pins the text to the left edge of the canvas, signals commitment, and creates a visual entry point that a hairline or strip cannot match.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image mirror -->

`Strategic Direction · Q3 2025`

## Mirror: the anchor moves to the right border. Text goes right.

When the image is on the right and the text is on the left, the anchor stays on the outer edge of the text panel — always the edge that meets the slide boundary, never the split.

![bg left](sample-image-landscape.svg)

---

<!-- _class: image contain -->

`Technical Reference · Pipeline Spec`

## The pipeline specification, rendered without crop.

Anchor with contain: the image letterboxes on --bg-alt, the 6px border still anchors the text panel. The layout stays decisive even in contain mode.

![bg right](sample-image-portrait.svg)

---

<!-- _class: image full -->

## One model. One owner. Ship it.

Full-bleed anchor: the 6px border runs the full height of the left edge, a solid --bg text column covers 42% of the canvas. Maximum commitment framing.

![bg](sample-image-landscape.svg)

---

<!-- _class: image dark -->

`Strategic Direction · Q3 2025`

## Dark anchor. The --accent border intensifies against a dark field.

The 6px border picks up the dark-mode accent from `--accent`. On high-contrast dark themes it becomes a vivid structural element — use deliberately.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image full dark -->

## This is the decision. The evidence is behind you.

Dark full-bleed anchor: --bg text column resolves to dark surface, border to dark accent. The frame is still 6px — the commitment reads the same in any colour scheme.

![bg](sample-image-landscape.svg)

---

<!-- _class: divider -->
<!-- _paginate: false -->

`Concept 05 · image-chamber`

## The Tonal Split. Depth without decoration.

---

<!-- _class: image-chamber -->

`Signal Archive · Six Months`

## Six months of signal, distilled into a single decision framework.

The text panel carries --bg-alt. No border, no strip, no hairline — the tonal shift between the chamber and the image IS the divider. Atmospheric, not architectural.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image-chamber mirror -->

`Signal Archive · Six Months`

## Mirror: the chamber moves to the right, the image breathes on the left.

The tonal split reverses naturally. The --bg-alt gradient flips direction; the image fills the left half cleanly. No divider required either way.

![bg left](sample-image-landscape.svg)

---

<!-- _class: image-chamber contain -->

`Signal Schema · Intake Reference`

## The intake schema in full — every field, every constraint.

Contain on image-chamber places the same --bg-alt matte on both sides — text panel and image matte are tonally identical, creating a very unified, quiet register for technical assets.

![bg right](sample-image-portrait.svg)

---

<!-- _class: image-chamber full -->

## The archive does not forget. Eighteen months of decisions, fully logged.

Full-bleed chamber: a --bg-dark column occupies 42% of the canvas, hard-edged against the image. No gradient — the tonal contrast is abrupt, intentional, cinematic.

![bg](sample-image-landscape.svg)

---

<!-- _class: image-chamber dark -->

`Signal Archive · Six Months`

## Dark chamber. The --bg-alt panel deepens on a dark scheme.

In dark mode --bg-alt resolves to a deeper surface than --bg, so the chamber becomes a well rather than a highlight. Atmospheric intensity increases without any additional rules.

![bg right](sample-image-landscape.svg)

---

<!-- _class: image-chamber full dark -->

## Six months of signal. One conclusion. Act on it.

Dark full-bleed chamber: --bg-dark resolves to its deepest dark value. The hard edge between chamber and image reads as a tonal cliff, not a design element.

![bg](sample-image-landscape.svg)

---

<!-- _class: closing -->
<!-- _paginate: false -->

`Lattice · Image Layout Concepts`

## Five concepts. Thirty slides. One visual grammar.

razor — brief — museum — anchor — chamber
