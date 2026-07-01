---
status: proposed
summary: Finish — the surface artifact of the existing Finish axis, a single family that UNIFIES four shipped-but-scattered surface capabilities rather than building new ones. A finish has a NATURE — parametric (token-driven, recolors with the theme) or asset-backed (a brought-in file, identity-preserving) — and a ZONE — field (fills the canvas) or mark (a placed emblem). The shipped pieces already ARE finishes: `tint-*` washes + `mark-*` textures (parametric fields), `![bg cover]` images (asset-backed field), `logo:` brand marks (asset-backed mark). The one genuine hole is curated, token-recolorable PARAMETRIC backdrops; the secondary one is reusing brought-in assets (logos/photos) from a library instead of per-deck. Finish subsumes tint/mark (umbrella, not beside); the picker writes the EXISTING mechanisms underneath — no new `background:` front-matter key. Corrects a first draft whose "three missing things" gap analysis was factually wrong (cover and logo both ship) and whose "mask-based cover is export-safe" claim was backwards (full-bleed masks are the exact PDFKit failure treatments avoid; a real section background is the safe path). First slice: Phase-0 picker over what already ships + a parametric token-gradient set AND one distinctive masked-motif. Carries inversion-derived invariants, two of them CORRECTED after a second inversion red-team caught them pointing at the wrong mechanism: the `![bg]`/`backgroundImage:` sinks Finish reuses bypass `findCssExfil` today (component-gate only) so Phase-0 must wire a url-guard or scope to local/data: URLs; and the Theme Studio WCAG audit reads token PAIRS, not backdrop luminance, so a cover needs an opaque token scrim (or new sampled-luminance work), not "the audit covers it". Also: export sign-off spans BOTH export engines (CLI vector-PDF AND Studio html-to-image raster); the finish→class subsumption needs a gated single-source map or it rots; the AA surface is 32 theme files (14 base palettes, most with dark variants, + 5 a11y) not "14 light themes"; "done" requires a differentiated backdrop family, not just picker+gradients.
---

# Finish — the surface layer designers have been missing

> **REDESIGN (2026-06-30, after PR #631 review) — finishes are STACKED LAYERS,
> not one register value.** PR #631 shipped a single-value `finish:` register
> (one backdrop wins per slide), which made it **either/or** — a wash *replaced*
> a mark instead of layering with it — and left the existing `tint-*`/`mark-*`
> gradients stranded. That contradicts this doc's own premise ("finishes compose
> and stack"). The corrected model is below; it supersedes the single-value
> `finish:` mechanism for the `field` zone.
>
> ## A finish is a z-index stack of layers
>
> Each finish composites up to four palette-blind layers behind the content,
> summed by the painter's algorithm (low alpha so they read together):
>
> | z | Layer | Mechanism | Examples |
> |---|---|---|---|
> | z1 | **wash** | `background-image` gradient slot | corner-glow, duotone, spotlight |
> | z2 | **texture** | `background-image` gradient slot | grid, dots, hatch, contour |
> | z3 | **mark** | `::before` (positioned) | monogram, rings, registration tick |
> | z4 | **edge** | `::after` / inset shadow | vignette, scrim, margin rule |
> | z5 | content | (untouched) | — |
>
> Implementation: each layer writes a **CSS custom property** (`--fin-wash`,
> `--fin-texture`, `--fin-mark`, `--fin-edge`); ONE compositor rule on
> `section.finish` blends them. So **any** combination — a named preset, a custom
> stack, or an AI-proposed recipe — flows through the same mechanism. The existing
> `tint-*`/`mark-*` treatments become **layer ingredients** in this stack (restored,
> now composable), not a parallel either/or system.
>
> **Export-safe stacking (the PDFKit lesson, again):** layers fade via **stacked
> `var(--bg)`-colored gradients overlaid on the pattern**, NEVER `mask-image`
> (full-bleed masks drop in Apple PDFKit). e.g. Atrium = uniform grid + a
> `var(--bg)` radial overlay that hides the grid where content sits + an accent
> corner glow — all gradients, both export engines safe.
>
> ## Deck-wide AND per-slide — the existing cascade
>
> Set deck-wide in front matter (every section gets the finish); override per slide
> with `_class:` (Halo on the title/section/closing, Atrium on content, `none`
> behind a dense chart). This is the `plugins.js` finish/class propagation we
> already have — a per-slide class wins over the deck-wide default. A finish may
> even carry different layers for **bookend vs content** slides (the engine knows
> each slide's role).
>
> ## The 5 starter presets (mockups locked, `.scratch/finish-mockups/`)
>
> All palette-blind, each a layer composition: **Atrium** (glow+grid+rule),
> **Meridian** (duotone+contour+monogram), **Strata** (bands+dot-matrix+tick),
> **Halo** (spotlight+rings+vignette — a title treatment), **Ledger**
> (ruled+margin-bar+fold).
>
> ## The Finish faculty — a real right-panel designer (like Theme/Component)
>
> Center: live preview specimen. **Right panel: the layer stack** (wash / texture /
> mark / edge), each with type + intensity + placement controls. Top: an AI
> **"describe a finish"** command bar. Header: **name + Save + Export** — and Save
> is wired to the library this time (the consumption loop PR #631 deferred).
>
> ## AI generation — safe by construction
>
> The AI proposes a **structured finish recipe** (layers + params from the closed
> vocabulary above), which the deterministic generator turns into palette-blind
> CSS/SVG — mirroring the Theme Studio AI (model proposes within a contract, code
> disposes). This delivers "converse to generate" and real CSS/SVG output **without**
> letting model text reach the same-origin preview frame (HARD RULE #22 intact). A
> sanitized raw-SVG motif channel (DOMPurify, no `url()`/`@import`) is a documented
> follow-up if the recipe vocabulary proves too narrow.
>
> **Build order:** (1) engine layered compositor + the 5 presets (export-safe,
> palette-blind, deck/slide cascade) + tests; (2) the right-panel layer designer +
> name/Save/Export with the consumption loop wired; (3) the AI recipe door. Each
> slice banks standalone. Merge + export sign-off remain human gates.

> **FOLLOW-UP (2026-07-01) — placed layers are freely SIZED / MOVED / TILTED, plus a
> movable brand logo.** Feedback: the ghost marks were "huge" and corner-locked. The
> fix makes a placed layer a *continuously* placed object, not a snapped one:
> - **Marks** (monogram/numeral) gain `scale` / `x` / `y` / `angle` on the recipe
>   (`finish-generate.ts`), emitted as `--fin-mark-fs` + `--fin-mark-transform`
>   (`translate((x-50)%,(y-50)%) rotate(deg)`) and consumed by the `section.finish::before`
>   in `base.finish.css`. Face-INVARIANT (identical placement in screen + export). The
>   default ghost dropped 40cqi → 30cqi. `coerceRecipe` fills the axes from the coarse
>   `placement`/wash-hotspot fields and clamps them.
> - **Single-source washes** (corner-glow, spotlight) gain a movable hotspot (`x`/`y`)
>   and a `spread`; directional/multi-source washes ignore it (`washHasHotspot`).
> - **Brand logo** gains `logo-x`/`logo-y`/`logo-scale` front-matter → `--logo-*` custom
>   props on `img.deck-logo`, emitted identically by `plugins.js` (engine + emulator) and
>   `runtime/index.js` (3-path parity, clamped numeric-only, no style injection). Defaults
>   reproduce the original top-right corner.
> - **Controls:** a reusable CSS-3D velocity **Joystick** (`Joystick.tsx`) + drag-on-canvas
>   handles over the live preview + exact numeric/keyboard fields, all in the Finish Studio.
> - **Overflow-probe fix (`overflow-probe.js`):** a mark/logo is *meant* to bleed past the
>   edge; raw `scrollHeight/Width` counted that bleed as content overflow (false ring /
>   export-warning / autosplit). The section base now measures overflow from FLOWED children
>   (skipping out-of-flow decorative layers — the same rule already used for cells), so real
>   content overflow is still caught but a decorative bleed is not. *No section-level CSS
>   (`overflow:clip`/`contain`) clamps a transformed pseudo's scroll contribution in Chromium
>   — verified empirically — so the fix must live in the probe.*
> - **Deferred (design fork):** an in-Studio **joystick for the logo** needs a brand/logo
>   Inspector section (there's no logo-source UI today) and a debounced front-matter commit
>   (a 60fps joystick can't rewrite deck source per frame). Surfaced for a follow-up. The
>   engine capability ships now; authors set `logo-x/y/scale` in source today.

**The ask (a creative-designer's-eye review of the Studio).** Lattice is strong
at *structure* (Form) and *palette* (the color half of Finish) but feels thin on
*atmosphere and identity*. The two moves that make a deck feel like *theirs* — a
distinctive backdrop and their brand mark — are harder than they should be.

**What this doc is.** A design model, written before any CSS/transform work
(CLAUDE.md "design-before-code"), hardened by two rounds of independent
maker-checker. **Round 1** (red-team + assessment) caught the first draft's gap
analysis as factually wrong: full-bleed covers (`![bg]`) and a brand-mark slot
(`logo:`) **both already ship**, and "mask-based cover is export-safe" was
backwards. **Round 2** (a Munger-inversion red-team + an independent checker on
this rewrite) confirmed those corrections held but caught two *invariants* that
named the right failure and pointed at the wrong mechanism — both now corrected
and marked ⚠ in the invariant table. This draft is built on what the engine
*actually* does today. The honest problem is not "four missing facets" — it is
**"four shipped-but-scattered surface capabilities with no shared concept, and
one real hole."**

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

These two attributes organize the four facets: a vignette is a *parametric
field*, a blueprint backdrop is a *parametric field*, a photo cover is an
*asset-backed field*, a logo is an *asset-backed mark*. They are not a strict
partition — a *treatment* (e.g. the logo's grayscale watermark) is an orthogonal
modifier applied *on top of* an asset-backed finish, never imposed. So "nature"
is the finish's *default*, treatment-overridable; it is not a hard type.

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
stable engine primitive (and the gate keeps guarding them); "finish" is the
*family* register above them.

**Which §2.5 register "finish" occupies — be precise.** The Finish axis already
has its two words: system **Finish**, human **Style** (`design-system.md:105`).
"finish" here is the **system-side family name** (matching the axis and the
`kind:"finish"` share), *not* a new author-facing synonym for **Style** — author
copy and the picker still say *Style*. Two caveats this exposes, both honest:
(1) the word "finish" is now carrying axis + family + share-kind; acceptable
because all three are the *system* register, but it must never leak into
author-facing copy as a rival to "Style". (2) The shipped Studio Inspector group
is literally labeled **"Look"** (`StudioShell.tsx:708`) — the one word
`design-system.md:107` *legislates against*. That is a pre-existing §2.5 broken
window (HARD RULE #18), not something to lean on: the finish picker is seated in
the **Style** surface, and re-labeling that inspector group "Style" is a tracked
cleanup this work should land, not inherit.

**A subsumption that isn't gated will rot (the maintenance failure).** "Picker
speaks finish, writes the classes underneath" is a *translation table* (finish
name → `tint-*`/`mark-*`/`![bg]`/`logo:`) living in the Studio while the engine
primitives evolve below it. Nothing today forces the two to stay in sync — the
gate guards the *classes*, not the *mapping*. The repo's precedent for exactly
this is the shared catalog extraction (`or-catalog.js`, HARD RULE #1/#15). So the
finish→primitive map must be a **single committed source of truth with a
build-time check** that every finish resolves to a live class/directive and every
Tier-1 `tint-*`/`mark-*` has a finish entry (or is deliberately excluded).
Without that gate, "subsume" is two layers to sync forever — the entropy it set
out to avoid.

**No new `background:` front-matter key.** The first draft proposed one; that
would be a *fourth* way to set a backdrop alongside `![bg]`, the
`backgroundImage:` directive, and a class — the top inversion failure mode below.
Instead, a finish **writes the existing mechanisms**: a parametric/asset *field*
emits the `![bg]`/`backgroundImage:` background or a `tint-*`/`mark-*` class; an
asset *mark* writes the shipped `logo:` directives. The only genuinely new
authoring token is a class for *parametric covers*, and it **cannot be `cover`**
— that name is a registered chart-family variant guarded by 16 `:not(.cover)`
rules in `chart-family.css`. **Decided: `backdrop`** — verified free (no
`.backdrop` class/modifier exists; the CSS `backdrop-filter` property and
`::backdrop` pseudo are not class-name collisions). It is the per-slide keyword
for a full-bleed parametric background, and reads plainly for authors (`bleed`,
the print term, was rejected as jargon).

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

These are not nice-to-haves; each is the avoidance of a concrete failure mode. An
independent inversion red-team found that two of the first draft's invariants
named the right failure but **pointed at a mechanism that does not cover the
case** — a *false* invariant is worse than none (it ships unguarded behind a
"handled" label). Those two are corrected below and marked ⚠.

| The failure that would kill it | The invariant it forces |
|---|---|
| Became a *fifth* way to set a backdrop; nobody knew which to use | **Subsume, don't add.** Finish is the one front door; it writes the existing mechanisms. No parallel grammar — *and* the finish→primitive map is a single gated source of truth (above), or "subsume" rots. |
| Brand logos auto-grayscaled (or recolored when they legally must not) | **Asset-backed finishes preserve identity by default**; treatment is opt-in. (`logo-style: auto\|brand` is shipped and real — `logo.docs.md:41`. **The picker must default brand marks to `brand`, not the engine default `auto`.**) |
| Beautiful on screen, solid blocks in export | **Covers are a real section `background-image`, never a full-bleed mask** (masks drop in Apple PDFKit at full-bleed — the exact failure the cropped-bbox treatments architecture avoids; `engineering/treatments.md`). ⚠ **There are TWO export engines**: the CLI/Chromium vector-PDF path *and* the Studio `html-to-image` `toPng` raster path (`drawing-board-export.js:12`). A `color-mix` gradient can serialize differently in the rasterizer, so **export sign-off renders every finish through BOTH engines, dark + light** — naming only one would verify the wrong one. |
| ⚠ Covers killed text legibility — amateur boardroom decks | The Theme Studio WCAG audit (`contrast.js auditVars/auditBoth`) checks **token-pair** ratios over a token map — it **structurally cannot see a backdrop image/gradient's local luminance**, so it cannot gate cover legibility. Therefore: a cover ships with **an opaque-enough token-color scrim** such that *text-vs-scrim* is a token pair the existing audit DOES cover (this caps how much backdrop bleeds through) — *or*, to let more backdrop show, sampled-luminance checking on the rasterized backdrop is built (new work, sequenced). Never claim the theme audit covers a raw image. |
| Token-recoloring went muddy on some themes | Every curated finish is **AA-audited across the real theme surface — the 14 base palettes (13 with paired `-dark` variants + carbone) plus the 5 a11y palettes, 32 theme CSS files in all** — not just "14 light themes." With a stated budget: representative-theme sampling + the #19/#21 ratchet pattern, and a curated-library size cap tied to it (this and the library-taxonomy open question are one decision). |
| Shared decks broke — a finish name didn't resolve on another machine | Finishes **serialize embedded** in `.lattice` (like themes), with a defined missing-asset fallback. *(The fallback is still an open question below — until it is designed, this invariant is a requirement, not a settled mechanism.)* |
| ⚠ A fabricated/BYO finish exfiltrated deck content via a `url()` beacon | **Today `findCssExfil` runs ONLY in the component-authoring gate** (`gateCss`→`gateComponent`, `gate.js:422/453`). The render sinks Finish reuses **bypass it**: `![bg]` (`bg-image.js:54` passes remote/scheme URLs through untouched) and the `backgroundImage:` directive (`slides.js:182` sets the value raw) — a remote `url()` beacons today, **pre-existing, ungated**. So Phase-0 must NOT inherit that hole while claiming it closed: it **either wires those two sinks through `findCssExfil` (or a shared `urlIsLocal` guard), or hard-scopes finish-set backgrounds to deck-relative + `data:` URLs and bars BYO-remote** until the guard lands. Pure gradient/class finishes (no `url()`) are genuinely safe; the `url()`-bearing cover path is the one to guard. Inline-SVG + AI stay deferred behind the threat model (HARD RULE #22). |
| Too much engine work for a "nice to have" → half-shipped (a broken window) | **Phase-0 on shipped plumbing first**; each slice banks standalone value (HARD RULE #18). **But "done" for Finish = at least one *differentiated* backdrop family shipped** (masked-motif or multi-token), not "picker + gradients" — see Sequencing. Standalone-value banking is exactly what lets a team stop after the cheap slice; guard against it by definition-of-done. |
| Strategic collision — Finish fights the in-flight Studio backlog over the same surface | Finish **extends G5's shipped Library** (not a parallel one); the picker lands as a **named sub-section of the existing Style/Look inspector group** (one owner, per `2026-06-28-studio-polish-backlog.md`); the AI "describe-it" door is sequenced **after** the backlog's G7 AI work, not contending for the same key. |

## Sequencing — Phase-0 first, value banked each slice

**Phase 0 (the chosen first slice) — a picker over what already ships, plus the
first *distinctive* finish.** Expose the existing `![bg]` covers, `logo:` marks,
and the six Tier-1 `tint-*`/`mark-*` treatments through a Studio picker, seated as
a sub-section of the **Style** inspector group (the group ships today mislabeled
"Look" — `StudioShell.tsx:708` — which this work re-labels; see §2.5 above). The
picker writes the existing front matter / classes. Add **two** new finishes, not
one:

- a curated **parametric token-gradient** backdrop set (`color-mix` of
  `var(--token)` into the existing `--_bg-radial`/`--_bg-linear` slots) — pure
  CSS, no `url()`, no transform; and
- **one single-token *masked-motif* backdrop** (the cropped-bbox mask technique
  treatments already use, sized to survive PDFKit). It is gradient-adjacent in
  risk but actually *distinctive* — a gradient wash of the accent the theme
  already paints is not personality (the adoption failure mode). Shipping one
  real motif in Phase-0 is what makes the brief — "feels like theirs" — true on
  day one.

Two honesty corrections to the first draft's Phase-0:

- **Not "zero new security surface."** The gradient finish is `url()`-free and
  safe, but *exposing the existing `![bg]`/`backgroundImage:` covers through the
  picker* surfaces the pre-existing ungated remote-`url()` sink (invariant table
  ⚠). Phase-0's scope therefore **includes** wiring those two sinks through
  `findCssExfil`/`urlIsLocal`, or hard-scoping picker-set backgrounds to
  deck-relative + `data:` URLs. This is in Phase-0, not deferred.
- **The scrim is real, not audit-gated.** Phase-0's cover ships with the opaque
  token-color scrim (so text-vs-scrim is an auditable token pair), since the
  theme WCAG audit cannot see backdrop pixels (⚠).

This still delivers the brief on shipped, export-safe, palette-blind plumbing with
modest, scoped new work.

Then, earn-it-later, each behind real usage:

1. **Curated token-recolorable SVG backdrops** — widen Phase-0's single motif to a
   *family* of single-token masked motifs + gradient covers. (A `data:` SVG can't
   read `var(--token)`; single-token motifs use the mask technique, washes use
   gradients.)
2. **Asset library for marks + covers** — promote brought-in logos/photos to a
   reusable, embeddable Library tier **(extending G5's shipped Library, not a
   parallel one)**; per-section stamp placement + suppression over busy covers
   (extending the shipped `logo:` feature, not rebuilding it).
3. **Finish Studio faculty + `kind:"finish"` share** — the third Fabricate
   faculty, once the picker proves the model.
4. **Multi-token inline-SVG backdrops + AI generation** — the only facet needing
   a transform (string + DOM parity, HARD RULE #1), DOMPurify-safe injection, and
   export materialization. **Last**, because it carries the new security surface;
   the AI door sequences after the backlog's G7 AI work.

**Definition of done (against the process failure).** Standalone-value sequencing
is exactly what lets a team stop after the cheap slice with a clear conscience —
and the project's whole justification is *differentiated* backdrops, which live in
the later slices. So "Finish is done" means **at least one differentiated
backdrop family has shipped** (the Phase-0 motif counts as the seed, slice 1 as
the family) — not "picker + gradients." If we ever decide picker-plus-gradients is
the whole deliverable, we rename the project "Finish picker" and drop the
differentiated-backdrop motivation honestly — we do not sell the hole and then
sequence it into never.

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
  renders a representative demo in dark + light through **both** export engines
  (CLI vector-PDF *and* Studio `html-to-image` raster) before it's done.

## Open questions (resolve at build time / prototype-first)

- **`dark` × finish** — does `dark` *swap* a finish or just recolor it? A
  parametric finish recolors via tokens; an asset cover may need an alternate or a
  stronger scrim when inverted.
- *(resolved — the per-slide keyword is `backdrop`, verified free; see the
  subsume section.)*
- **Curated library size & taxonomy** — start small and boardroom-grade
  (blueprint / topo / grid / dot / wash families?). This is the *same decision* as
  the AA-audit budget (invariant table): library size × theme matrix sets the
  test burden, so cap them together.
- **Finish serialization in `.lattice`** — embedded vs referenced, and the
  missing-asset fallback (prototype-first, like the transform-DSL doc insisted).
- **Scrim depth vs backdrop visibility** — the opaque-scrim invariant makes the
  cover auditable but caps how much backdrop shows; if designers want fuller
  photo bleed, that needs sampled-luminance checking (real new work). Decide the
  default scrim opacity against real decks.

> Resolved out of "open" by Round 2 and folded into the invariant table: the
> contrast-scrim mechanism (was "gated by the WCAG audit" — it can't be), the AA
> theme count (16 families/32 files, not 14), the security sink-gating, the
> dual-export sign-off, and the finish→class mapping source-of-truth.
