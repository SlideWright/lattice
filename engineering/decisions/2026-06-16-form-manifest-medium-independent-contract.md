# Form — the manifest as a medium-independent contract (A, not trim)

**Status:** decided 2026-06-16. Resolves the open **keep-vs-trim** question the
implementation ADR left for #356 (`2026-06-15-form-implementation.md` §6/§8 — "make
the geometry manifest-driven … OR trim the manifest to load-bearing-only"). The
decision is **A: keep and grow the manifest** — treat `lib/forms/` as the
medium-independent composition contract, with the 2D CSS as its *first renderer*,
not as the only home for the model. This note owns the **direction**; the
execution increments land under #356 referencing it. `design/forms.md` still owns
the **model**; `2026-06-15-form-implementation.md` owns the **B-now→A-later**
execution arc this slots into.

---

## 1. Where this comes from

The #356 self-containment work made each Form noun own its folder, in slices:

- **Tiles** — manifest + CSS + kernel co-located (`watermark` PoC, then
  `meta`/`progress`/`status`).
- **Cell CSS** (#370) — the Form chrome moved out of `base.variants.css` into
  `lib/forms/cell/<id>/<id>.css` (`stage` · `masthead` · `masthead-lede` ·
  `masthead-bay` · `footer`).
- **masthead Cell transform** (#372, in flight) — the kernel co-located beside its
  Cell, mirroring the component kernel→adapter split.

That left one honest gap the implementation ADR flagged: the `lib/forms/`
**manifest is ~90% descriptive**. Only `id` + `exemptFromChrome` are read at render
time (they derive `FORM_TOGGLE_SKIP`); `form`, `kind`, `cells`, `suppresses`, `z`,
`geometry`, `fill` are catalog data — validated for referential integrity and
emitted into `dist/docs/forms.json`, but never consulted by the render pipeline.
The ADR posed two ways to close the gap: **grow** the manifest into the source of
truth (the OCP win) or **trim** it to the load-bearing minimum.

## 2. What settled it — the medium question

Trimming optimizes for the medium we ship today: one flat, 2D, CSS renderer. The
question that broke the tie was *"would a Frame ever have CSS — say, on an Oculus
headset?"* Following it through reframes the whole catalog:

- **A Frame owns the relationship *between* Cells.** In 2D that relationship is
  degenerate — Cells stack top-to-bottom on a rectangle, so each Cell can express
  its own box alone and the Frame collapses to pure data ("include these Cells,
  suppress those"). That is *why* a Frame has no CSS today.
- **A spatial medium makes it non-degenerate.** The *same* Cell set can be carved
  onto a flat quad, a curved cylinder section, depth-layered floating panels, or
  room-scale surfaces. No single Cell can own that topology — a Cell knows its own
  box, not the global arrangement. The inter-Cell carving is irreducibly a
  **Frame** concern, and it is expressible in CSS that already exists
  (`transform-style: preserve-3d`, `perspective`, per-region `translateZ()` /
  `rotateY()`).
- **The model is already spatial-ready.** Every Cell/Tile manifest declares a `z`
  plane (`0 canvas · 1 atmosphere · 2 content · 3 chrome · 4 annotation`). In 2D
  those flatten to `z-index`/`isolation`; in a spatial renderer they become
  *literal depth*. The abstraction anticipated more than one medium.

So "Frame = no CSS" is an **artifact of the medium being flat**, not a law. Trimming
the manifest would burn the seam a second renderer plugs into; keeping it treats
the manifest as the contract every medium obeys. We choose to keep it.

## 3. Decision — A, at the **light** coupling degree

Adopt the manifest as the **medium-independent composition contract**. The 2D CSS
is its first **renderer**, not a casualty:

```
                 lib/forms/  manifest            ← the contract
                  (cells · z · fill · geometry refs · suppresses)
                   /                       \
        2D renderer (CSS)            VR renderer (CSS 3D / WebXR)   ← future
   flex · grid · padding · z-index    transforms · translateZ · perspective
```

"Manifest-driven" has a dial. We take the **light** rung now:

| Degree | Manifest owns | 2D CSS owns | 2D CSS hand-written? |
|---|---|---|---|
| **Light (chosen)** | the *facts*: which cells, `z`, `fill`, geometry **token refs** | the draw (flex/grid/padding) **and** the token *values* | ✅ fully |
| Medium | facts + geometry **values** | the draw; values become generated `:root` vars | mostly |
| Heavy | facts + values + emits rule structure | almost nothing | ❌ generated |

**Light** makes the manifest genuinely load-bearing **without changing a single
rendered pixel** and **without generating CSS**: you keep authoring the 2D Cell
sheets by hand; the manifest just becomes the contract they may not silently
diverge from. We deliberately do **not** jump to Medium/Heavy — generating CSS
geometry from data is a real machine (build-time emitter or runtime injection) that
deserves its own ADR if/when a second renderer actually lands. Light is the rung
that captures the decision and the VR-readiness at near-zero risk.

## 4. What "load-bearing at the light rung" concretely means

The seam already half-exists: Cell manifests reference CSS token *names*
(`"geometry": { "size": "--masthead-h", "inset": "--frame-x" }`) while the *values*
live in the Cell CSS. Light coupling tightens that into an enforced contract — a
validator (extending `lib/forms/index.js` integrity + the `check:ownership` /
`build-forms` gate, HARD RULE 15: reuse, don't clone) that fails the build when the
manifest and the 2D renderer drift:

1. **Every `cells` entry has a real Cell** *and*, if that Cell carries layout, a
   co-located `<id>.css` exists (today: 5 of 9 Cells have CSS; the 4
   token/coordinate-only Cells are exempt and declared so).
2. **Every `geometry` token ref resolves** to a CSS custom property actually
   defined in the bundle (`--masthead-h`, `--frame-x`, `--footer-*`). A renamed
   token can no longer leave a manifest pointing at nothing.
3. **`z` agrees** between a Tile/Cell manifest and any `z-index` its CSS sets (the
   plane is the contract; the 2D `z-index` is one projection of it).
4. **`suppresses` is honest** — a sovereign Frame's suppressed chrome Cells are the
   ones the toggle actually skips (`FORM_TOGGLE_SKIP`), closing the loop the ADR
   already started for `exemptFromChrome`.

None of this emits or rewrites CSS; it asserts the hand-written CSS and the
manifest tell the same story. Output stays byte-identical — the same gate the Cell
slices used (`tools/pixel-check.js` / rasterize-diff = 0 changed pixels).

## 5. Frames, explicitly

- **In the 2D renderer a Frame is CSS-less by nature** — it is realized by composing
  Cells (whose CSS is co-located) plus, for sovereign frames, an existing
  **component** (`divider`, `title`, `split-panel`, … each owning its own CSS in its
  component folder). A `lib/forms/frame/<id>/<id>.css` in 2D would be empty, or — worse
  — would force component CSS out of its rightful home. So we do **not** add 2D Frame
  stylesheets.
- **A spatial renderer is the case that grants a Frame CSS** — topology/transform
  context, per-Cell-region placement, the `z`-plane→depth mapping. That stylesheet
  is a *second renderer's* artifact, not a 2D one; the folder shape already permits
  it (`frame/<id>/`) without any model change.

This is the asymmetry, made intentional: **Tile** owns pixels+logic
(`manifest+css+transform`); **Cell** owns a slot's layout (`manifest+css[+transform]`);
**Frame** owns composition (`manifest` now; `+css` only under a spatial renderer).

## 6. Staged plan (under #356)

1. **Light enforcement** (next increment): the manifest↔CSS consistency gate of §4.
   Behaviour-preserving, 0-pixel, makes the catalog load-bearing. This is the
   concrete "A" deliverable.
2. **Docs sync**: `design/forms.md` §11 + the implementation ADR §6/§8 record that
   keep-vs-trim is decided (A), and that Frames are CSS-less in 2D / contract-bearing
   for spatial.
3. **(Deferred, own ADR) Medium/Heavy coupling** — generate geometry from the
   manifest — *only* if a second renderer or designer/AI-authored Frames
   (`forms.md` §7) actually demand it.
4. **(Deferred, separate) section-as-grid (A-later)** — the gated 242-direct-child
   migration (`2026-06-15` §4) is **orthogonal** to this decision and unaffected.
5. **(Speculative) spatial renderer** — the WebXR/CSS-3D second renderer that would
   first exercise Frame CSS. Out of scope; named only to fix the direction.

## 7. Non-goals / what this does NOT commit to

- **Not building VR.** Oculus is the *thought experiment* that fixed the direction;
  no spatial renderer is scheduled.
- **Not generating CSS now.** Light rung only — 2D CSS stays hand-authored.
- **Not touching section-as-grid.** That gate stands; this is a different axis.
- **Not deleting the descriptive manifest fields** — the opposite of trim.

## 8. Relationships

- **Supersedes** the keep-vs-trim open question in `2026-06-15-form-implementation.md`
  §6/§8 (resolved: A).
- **Builds on** `2026-06-15-manifest-css-audit.md` (the audit that surfaced the
  manifest↔CSS drift this gate would catch).
- **Independent of** #372 (masthead transform co-location, in flight) and the
  A-later section-as-grid migration.

## 9. Gates (for the §6.1 increment when it lands)

Manifest↔CSS gate green; `tools/pixel-check.js` 0 changed pixels on
`examples/form.md` + `design/forms.gallery.md` (the gate adds no render change);
lint · `build:check` · unit · integration green; maker-checker (inspection +
assessment).
