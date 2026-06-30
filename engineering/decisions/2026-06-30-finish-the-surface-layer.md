---
status: proposed
summary: Finish — the surface artifact of the existing Finish axis, a single family that UNIFIES four shipped-but-scattered surface capabilities rather than building new ones. A finish has a NATURE — parametric (token-driven, recolors with the theme) or asset-backed (a brought-in file, identity-preserving) — and a ZONE — field (fills the canvas) or mark (a placed emblem). The shipped pieces already ARE finishes: `tint-*` washes + `mark-*` textures (parametric fields), `![bg cover]` images (asset-backed field), `logo:` brand marks (asset-backed mark). The one genuine hole is curated, token-recolorable PARAMETRIC backdrops; the secondary one is reusing brought-in assets (logos/photos) from a library instead of per-deck. Finish subsumes tint/mark (umbrella, not beside); the picker writes the EXISTING mechanisms underneath — no new `background:` front-matter key. Corrects a first draft whose "three missing things" gap analysis was factually wrong (cover and logo both ship) and whose "mask-based cover is export-safe" claim was backwards (full-bleed masks are the exact PDFKit failure treatments avoid; a real section background is the safe path). First slice: Phase-0 picker over what already ships + one parametric token-gradient set. Carries inversion-derived invariants (export sign-off, required contrast scrim, brand-fidelity for assets, AA across themes, embedded serialization, data:-materialization through the findCssExfil gate).
---

# Finish — the surface layer designers have been missing

**The ask (a creative-designer's-eye review of the Studio).** Lattice is strong
at *structure* (Form) and *palette* (the color half of Finish) but feels thin on
*atmosphere and identity*. The two moves that make a deck feel like *theirs* — a
distinctive backdrop and their brand mark — are harder than they should be.

**What this doc is.** A design model, written before any CSS/transform work
(CLAUDE.md "design-before-code"). It is a **second draft**: the first draft
claimed full-bleed covers and a brand-mark slot were *missing*; a red-team +
independent assessment found **both already ship** (and a third claimed-missing
piece was a misread). This draft is built on what the engine *actually* does
today. The honest problem is not "four missing facets" — it is **"four
shipped-but-scattered surface capabilities with no shared concept, and one real
hole."**

## The model — nature × zone

A finish is the surface layer of a slide, applied over its structure and palette.
It has two independent attributes:

**Nature — how it gets its pixels:**

- **Parametric** — defined by tokens + parameters, palette-blind, and therefore
  **recolors automatically** with the theme and `dark`. (washes, textures,
  gradient/SVG backdrops)
- **Asset-backed** — a file the designer *brings in* (SVG / PNG / photo),
  identity-bearing, and therefore **preserves its own appearance** by default
  (optionally *treated* — e.g. the logo's grayscale watermark is a treatment
  applied to an asset, never imposed). (logos, photo covers)

The brand logo is the flagship *asset-backed* finish — "special" precisely
*because* it is asset-backed, which is the same reason it must never be
force-recolored.

**Zone — where it sits:**

- **Field** — fills the canvas behind content (washes, textures, covers).
- **Mark** — a placed emblem in a corner or region (the logo/stamp).

These two attributes organize everything: a vignette is a *parametric field*, a
blueprint backdrop is a *parametric field*, a photo cover is an *asset-backed
field*, a logo is an *asset-backed mark*.

## Everything we already ship IS a finish

We are naming a family, not inventing one. The four human-facing facets map onto
shipped code:

| Facet (zone) | Ships today as | Nature | Sourced today | The genuine hole |
|---|---|---|---|---|
| **wash** (field) | `tint-*` treatments (`lib/base/base.treatments.css`) | parametric | pick (preset) | parametric *generation* |
| **texture** (field) | `mark-*` treatments (same) | parametric | pick (preset) | parametric *generation* |
| **cover** (field) | `![bg cover\|contain\|fit]` (`lib/engine/background-image.js`, kernel `lib/core/bg-image.js`) | asset-backed | bring-your-own image | **curated token-recolorable backdrops** (parametric covers) |
| **stamp** (mark) | `logo:` + `logo-style: auto\|brand` + `logo-on: all\|title` (`lib/base/_logo/`) | asset-backed | bring-your-own asset | **library reuse** + per-section placement |

So the program is:

1. **Unify** these four under one `finish` family with a shared picker and
   vocabulary (the umbrella decision — see next section).
2. **Fill the one real hole**: curated, **parametric**, token-recolorable
   *backdrops* — the only facet with no shipped representative.
3. **Promote brought-in assets** (logos, photos) from per-deck imports to a
   reusable library, so a brand mark is set once and reused everywhere.

The two `![bg left/right]` directional splits are a *partial* shipped feature
(basic mode collapses them to full-bleed; the inline-SVG split is a later
milestone per `background-image.js`); the **full-bleed `![bg cover]` is fully
shipped and prints** (`section` carries `print-color-adjust:exact`,
`base.elements.css:27`).

## Finish subsumes tint/mark — it is the umbrella, not a sibling

The sharpest design question the first draft dodged: does `finish` *subsume* or
*sit beside* the mature `tint-*`/`mark-*` subsystem (Tier-1 universal variants
with a placement axis `at-*`, the `--_bg-radial`/`--_bg-linear` compositor slots,
and a build-time validator)?

**Decision: subsume.** `finish` is the umbrella concept; `tint-*`/`mark-*` become
the *implementation* of the wash/texture facets. The Studio picker and the
authoring surface speak "finish"; under the hood they **write the existing
classes and front matter**. This honors the unification intent ("they're all the
same concept — wax/polish/patina") and obeys the strict `§2.5` "one concept, one
name" rule: a designer never has to learn *both* `tint-vignette` *and* a separate
"finish" that does the same pixels. The `tint-*`/`mark-*` classes remain the
stable engine primitive (and the gate keeps guarding them); "finish" is the human
register above them.

**No new `background:` front-matter key.** The first draft proposed one; that
would be a *fourth* way to set a backdrop alongside `![bg]`, the
`backgroundImage:` directive, and a class — the top inversion failure mode below.
Instead, a finish **writes the existing mechanisms**: a parametric/asset *field*
emits the `![bg]`/`backgroundImage:` background or a `tint-*`/`mark-*` class; an
asset *mark* writes the shipped `logo:` directives. The only genuinely new
authoring token is a class for *parametric covers*, and it **cannot be `cover`**
— that name is a registered chart-family variant guarded by 16 `:not(.cover)`
rules in `chart-family.css`. Proposed: `bleed` (full-bleed), to be confirmed
against a prototype before it freezes.

## Sourcing — pick · fabricate · bring-your-own

One family, three ways to get a finish — mirroring the two existing Fabricate
faculties (`input → optional AI → live gate/derive → save to Library → export
zip`):

- **Pick** — choose a curated finish (parametric washes/textures/backdrops, or a
  library asset). Baked, palette-blind, zero cost.
- **Fabricate** — generate a fresh **parametric** finish: deterministic controls
  (gradient stops/angle, pattern density, vignette strength) → token-driven CSS.
  Palette-blind by construction. AI "describe it" is a *later* front door, as the
  Theme Studio added AI atop a deterministic kernel
  (`2026-06-29-studio-theme-ai.md`). *Asset-backed finishes are never fabricated
  — they are brought in.*
- **Bring-your-own** — upload a backdrop image or a brand mark. This is where the
  asset plumbing is needed; note it is **proposed, not shipped**
  (`2026-06-09-drawing-board-asset-import.md` is explicitly *"Not canonical…
  no shipped behaviour yet"*). BYO covers/logos work *today* only via a path
  relative to the deck source; a reusable library is real new work, not "existing
  plumbing."

Saved finishes land in the unified **Library** and share via the established
**lattice-asset** zip (`2026-06-29-lattice-asset-share.md`) as a new
`kind: "finish"`.

## Invariants (derived by inversion — "assume it failed; what killed it?")

These are not nice-to-haves; each is the avoidance of a concrete failure mode.

| The failure that would kill it | The invariant it forces |
|---|---|
| Became a *fifth* way to set a backdrop; nobody knew which to use | **Subsume, don't add.** Finish is the one front door; it writes the existing mechanisms. No parallel grammar. |
| Brand logos auto-grayscaled (or recolored when they legally must not) | **Asset-backed finishes preserve identity by default**; treatment is opt-in. (The shipped `logo-style: auto\|brand` already encodes this — honor it.) |
| Beautiful on screen, solid blocks in the PDF | **Covers are a real section `background-image`, never a full-bleed mask** (masks drop in Apple PDFKit at full-bleed — the exact failure the cropped-bbox treatments architecture avoids; `engineering/treatments.md`). **Export sign-off in dark + light** is part of every facet's definition. |
| Covers killed text legibility — amateur boardroom decks | A token-driven **contrast scrim is REQUIRED** for covers, gated by the WCAG audit the Theme Studio already runs — not an open question. |
| Token-recoloring went muddy on some themes | Every curated finish is **AA-audited across all 14 themes × light/dark**. |
| Shared decks broke — a finish name didn't resolve on another machine | Finishes **serialize embedded** in `.lattice` (like themes), with a defined missing-asset fallback. |
| A fabricated/BYO finish exfiltrated deck content via a `url()` beacon | **All paths go through `data:`-materialization and clear `findCssExfil`** (`lib/layout/gate.js`, #616); inline-SVG + AI deferred behind the threat model (HARD RULE #22, `2026-06-29-component-transformer-threat-model.md`). The "no XSS surface" claim was wrong — *any* path emitting `url()` is in scope. |
| Too much engine work for a "nice to have" → half-shipped (a broken window) | **Phase-0 on shipped plumbing first**; each slice banks standalone value (HARD RULE #18). |

## Sequencing — Phase-0 first, value banked each slice

**Phase 0 (the chosen first slice) — a picker over what already ships, plus one
parametric set.** Expose the existing `![bg]` covers, `logo:` marks, and the six
Tier-1 `tint-*`/`mark-*` treatments through a Studio picker (the Inspector "Look"
section) that writes the existing front matter / classes — **and add one new
curated *parametric* token-gradient backdrop set** (strategy: pure `color-mix` of
`var(--token)` composited into the existing `--_bg-radial`/`--_bg-linear` slots —
no SVG, no transform, no new security surface). This delivers ~80% of the brief —
"pick a distinctive backdrop + place my brand mark" — on **shipped, export-safe,
palette-blind plumbing**, with the required contrast scrim, and zero engine
transform.

Then, earn-it-later, each behind real usage:

1. **Curated token-recolorable SVG backdrops** — extends Phase-0's parametric
   covers from gradients to single-token *masked* motifs **sized small enough to
   survive PDFKit** (the cropped-bbox discipline), and gradient covers for
   full-bleed. (A `data:` SVG can't read `var(--token)`; single-token motifs use
   the mask technique, washes use gradients.)
2. **Asset library for marks + covers** — promote brought-in logos/photos to a
   reusable, embeddable Library tier; per-section stamp placement + suppression
   over busy covers (extending the shipped `logo:` feature, not rebuilding it).
3. **Finish Studio faculty + `kind:"finish"` share** — the third Fabricate
   faculty, once the picker proves the model.
4. **Multi-token inline-SVG backdrops + AI generation** — the only facet needing
   a transform (string + DOM parity, HARD RULE #1), DOMPurify-safe injection, and
   export materialization. **Last**, because it carries the new security surface.

Note the honest tension: the *safe-first* order (gradients/masks first) and the
*value-first* order disagree — the most differentiated backdrops (two-color
blueprints, topo lines) are the multi-token inline-SVG ones, which land last.
Phase-0 mitigates this by making *parametric gradient covers + the existing
treatments* feel like a real win immediately.

## Gates each slice must honor

- **#1** two-path parity for any transform-bearing facet (`applyToHtml` +
  `applyToDom`, parity-tested).
- **#3** every parametric finish color is `var(--token)`; no hex.
- **#9** a per-feature demo deck (+ committed PDF).
- **#10 / #6** CHANGELOG + the canonical Finish docs (`design-system.md`,
  `lib/base/base.docs.md`, `lib/base/_logo/logo.docs.md`,
  `engineering/treatments.md`, `design/theming.md`) updated in the same change.
- **#20** no `margin` in any full-bleed layer (it must measure cleanly for the
  Fit Spine).
- **#22** any inline-SVG / brought-in HTML reaches the preview frame only through
  `sanitizeSlideHtml`.
- **Export sign-off (Quality Bar)** — any slice that alters exported bytes
  renders a representative demo in dark + light for inspection before it's done.

## Open questions (resolve at build time / prototype-first)

- **`dark` × finish** — does `dark` *swap* a finish or just recolor it? A
  parametric finish recolors via tokens; an asset cover may need an alternate or a
  stronger scrim when inverted.
- **The `bleed` modifier name** — confirm a non-colliding word for per-slide
  parametric covers against a prototype before freezing it.
- **Curated library size & taxonomy** — start small and boardroom-grade
  (blueprint / topo / grid / dot / wash families?); expand on real use.
- **Finish serialization in `.lattice`** — embedded vs referenced, and the
  missing-asset fallback (prototype-first, like the transform-DSL doc insisted).
