---
status: in-progress
summary: Promote the Playground-only debug bounding-box overlay into a first-class, deck-carried feature. A `debug` front-matter key (and per-slide `_debug`) turns on layout debugging across all five preview surfaces; it is PREVIEW-ONLY — the engine stamps `data-debug` for the previewers' overlay agent but render() strips it by default so exported PDF/PPTX/HTML bytes are unchanged (owner decision: preview-only, stripped from export). The value is a configurable set of "levers" (identity / size / layout / class / box), not just on/off. Each box gains an inside-corner label drawn by a JS overlay mirror layer (a pointer-events:none sibling of the deck) so it adds zero layout box — never `position:relative`+`::after`, which reflows absolutely-positioned descendants and CANNOT read computed size anyway. Outline color is recolored to encode layout mode (grid/flex/flow), WCAG-AA and CVD-safe, retiring the redundant 11-hue-by-tag rainbow. Slices: engine directive (done), export strip (done), overlay agent, wire five surfaces, session-override toggle, docs/demo.
---

# Debug bounding boxes — front-matter `debug` config + inside-corner labels

**Date:** 2026-07-01
**Status:** Design agreed (three forks confirmed with the owner); implementation in slices.
**Related:** `docs/src/playground/bbox-overlay.js` (today's feature),
`lib/engine/directives.js` (directive allowlist),
`engineering/decisions/2026-06-22-the-fit-spine.md` (the measurement agent we reuse),
`engineering/decisions/2026-06-16-colour-blindness-accessibility.md` (CVD palette we mirror),
`engineering/decisions/2026-06-29-component-transformer-threat-model.md` (§5.1, the #22 sink rule).

---

## 1. Why this exists

Today you can outline every element in a slide to eyeball layout — but only in the
**Playground**, only as a **device-local toggle** (`localStorage['lattice-bbox']` +
a toolbar button), and it draws a fixed **11-hue-by-HTML-tag** rainbow with **no
labels**. It is invisible to Drawing Board and Studio, it does not travel with the
deck, and once boxes are on you still have to *guess* what each box is, how big it
is, or how it lays out its children.

The ask: make debug a **first-class deck setting** (`debug:` in front matter) that
works across the previewers, and give each box an **inside-corner label** that says
something *useful* — without the label ever touching layout.

---

## 2. What ships today (verified)

- **Mechanism:** `bbox-overlay.js` injects ONE `<style>` into the preview iframe
  (`applyBbox()`), scoped to `.lattice`. Pure `outline` (zero layout box),
  `outline-offset:-1px`. Never in `lattice.css`, never exported.
- **Reach:** called from exactly one place — `PlaygroundApp.tsx`. Drawing Board and
  Studio show **no** boxes today. "Make it work in all three" is *net-new wiring*,
  not sharing an existing cross-surface feature.
- **Surfaces that build a preview frame — there are FIVE, not three**
  (`SANCTIONED_PREVIEW_BUILDERS`, `tools/check-ownership.js`):
  `deck-preview.js` (Playground + Drawing Board filmstrip),
  `single-slide-render.ts` (Studio), `presenter-window.js`,
  `drawing-board-practice.js`, `drawing-board-focus.js`.
- **Two render models:** the filmstrip CSS-scales **each `<section>`**
  (`transform:scale(w/1280)`); the single-slide path scales the **iframe element**.
  A `getBoundingClientRect`-driven label must account for scale to report real px.
- **Directive plumbing:** front matter → `lib/engine/directives.js` allowlists →
  `slides.js:160-176` stamps `data-<kebab>` (and `--<kebab>`, except `build`) on
  each `<section>`. Adding a key here is a one-liner.

---

## 3. The three forks (owner decisions)

| Fork | Decision | Consequence |
|---|---|---|
| **Export safety** | **Preview-only, stripped from export.** | `debug` is a real front-matter key, but the export pipeline strips it so exported PDF/PPTX/HTML bytes are *identical* whether debug is on or off. Keeps boardroom decks clean and stays OUT of the export sign-off gate. |
| **Label content** | **Configurable "levers", not a fixed string.** | `debug` takes a *config* selecting which facets show (identity / size / layout / class / box). This is also the "variants we support". |
| **Outline color** | **Must mean something AND pass WCAG AA.** | Color encodes **layout mode** (grid / flex / flow), not HTML tag; hues + label chips verified AA over light and dark, CVD-safe. |

These override the independent checker's "don't put it in front matter at all"
recommendation — the checker's export concern is real but *solved* by stripping on
export (its own fallback suggestion), so we keep the deck-carried key the owner asked for.

---

## 4. The `debug` config grammar (the levers)

Front-matter (deck-wide) **and** per-slide comment form:

```md
---
debug: on            # whole deck, default profile
---

<!-- _debug: size -->   # THIS slide only, just the size facet
<!-- _debug -->         # THIS slide only, default profile (bare flag)
<!-- _debug: off -->    # mute THIS slide when the deck is debugging
```

**Value = a profile keyword OR a space/comma list of facet tokens.**

Base (the "variants we currently support"):
- `off` / `false` / `no` / absent → disabled
- `on` / `true` / `yes` / empty → **default profile**
- `all` → every facet

Facets (the levers — each can be listed explicitly, e.g. `debug: identity size`):

| token | label shows | source |
|---|---|---|
| `outline` | the box outline itself | implied by every profile |
| `identity` | semantic name — component (`_class` / root class) › Form › tag | element class list, prettified via `dist/docs/components.json` |
| `size` | intrinsic (un-scaled) `W×H` in px | `getBoundingClientRect` ÷ section scale |
| `layout` | display mode `grid` / `flex` / `flow` (+ gap, track count) | `getComputedStyle` |
| `class` | raw CSS class list | `attr(class)` |
| `box` | padding + gap values | `getComputedStyle` |

Profiles: **`on` = `outline identity size layout`** (the useful triad — *what* the
box is, *how* it arranges children, *how big* it is). **`all` = everything.**

Example label: `comparison-grid · grid · 720×360`.

Unknown facet tokens are a lint **warning** (not an error), listed by
`lint-core.js`, mirroring how `finish` / `mode` / `split` vocab is validated.

---

## 5. Architecture — preview-only, stripped from export

**Engine (`lib/engine/directives.js` + `slides.js`):**
- Add `debug` to `KNOWN_DIRECTIVES` and `FLAG_DIRECTIVES` (so bare `<!-- _debug -->`
  works), and to `APPLIED_DIRECTIVES` (so it stamps `data-debug="<config>"`).
- **Keep `debug` OUT of `GLOBAL_ONLY`** → per-slide `_debug` is allowed (the single
  strongest lever against a "wall of noise"; a debugger usually wants *one* slide).
- **Suppress the `--debug` custom prop** — extend the `key !== 'build'` guard at
  `slides.js:166,175` to also exclude `debug`. Nothing reads a CSS var for debug;
  it would just be dead bytes to strip later.

**Export strip (single choke point in the export pipeline):**
- Strip `data-debug` from every `<section>` before emitting bytes. Because the outline
  CSS and label overlay live ONLY in the preview builders (never in `lattice.css` /
  engine output), stripping the now-inert attribute makes exports **byte-identical**
  regardless of `debug`. That is what keeps this change off the export sign-off gate.
- *Rejected alternative:* don't stamp at all; return debug config in render metadata.
  Loses per-slide granularity and forces every one of the five builders to re-parse
  front matter. Stamp-then-strip is uniform and the builders already read section attrs.

**Preview (the shared "debug overlay agent"):**
- One runtime agent, injected into all five preview srcdocs **alongside the FIT
  agent**, replaces the Playground-only `bbox-overlay.js`. It reads
  `section[data-debug]`, parses the config, draws outlines + labels.
- **The existing localStorage/toolbar toggle becomes a session override:** front
  matter is the deck's *default*; the toggle forces debug on/off for *this viewer,
  this session*, winning over the front-matter value. (Studio's settings copy
  changes from "stored on this device" to "overrides the deck's `debug:` for this
  session".)

---

## 6. The corner label — zero flow, guaranteed

The label must not be part of the flow. The tidy CSS route (`position:relative` on
content boxes + `::after`) is **rejected**: it re-anchors absolutely-positioned
descendants (badges, focus rings, pagination), reorders paint, and risks the
FIT/measuring layouts (#20). And CSS `content:` cannot read computed size anyway.

**Technique: a JS overlay mirror layer.**
- The agent appends ONE overlay container as a **sibling of `.lattice`**
  (`position:absolute; inset:0; pointer-events:none;` own stacking context). It is
  *outside* the measured content tree, so it adds zero layout box and cannot reflow a
  slide or corrupt FIT (#20).
- For each labeled box it computes `getBoundingClientRect` (relative to the overlay)
  and places a label chip at the box's **inside** corner. **Fixed font-size** (not
  scaled) so labels stay legible at any filmstrip scale; **intrinsic size** =
  rect ÷ section-scale.
- **Re-draw** piggybacks on FIT's existing `ResizeObserver` + backstop timers +
  `patchSections`; the overlay holds no per-node state, so a node swap just triggers a
  full re-render (no orphaned labels).
- **Both render models** are handled because the overlay lives *inside* each iframe in
  that iframe's own coordinate space; the only per-model detail is the scale factor for
  intrinsic size (filmstrip: per-section `scale()`; single-slide: 1 inside the frame).

**Anti-clutter (the inversion "make it useless" guardrails):**
- **Labels only on structural boxes by default** (section, component roots, form
  regions, grid/flex containers) — never every leaf, or a 6×4 grid becomes mush.
  Outlines stay on all boxes (lines are cheap).
- **Hover a box → isolate it** (reveal its label + immediate children, dim the rest).

**#22 compliance:** labels are first-party chrome appended by the agent *after*
`sanitizeSlideHtml`, never merged into the untrusted `html` string. Text pulled from
deck content (identity/class) is inserted via `textContent`, never `innerHTML`.

---

## 7. Color — meaningful + AA

Outline hue encodes **layout mode**, the single most useful fact for layout debugging:

| mode | role |
|---|---|
| `grid` | display:grid containers |
| `flex` | display:flex containers |
| `flow` | normal block/inline flow |

- Outlines are non-text UI → target **≥3:1** contrast against both light and dark
  preview backgrounds.
- Label **chips use a solid background** with foreground text at **≥4.5:1** (chosen
  black/white per hue), so text is readable regardless of the slide behind it.
- **CVD-safe:** reuse the palette approach from
  `2026-06-16-colour-blindness-accessibility.md`; three modes are easy to keep
  distinguishable under deuteranopia/protanopia, and the label carries the mode name as
  a redundant (non-color) encoding.
- The old 11-hue-by-tag rainbow is retired — once the label states identity, per-tag
  hue was redundant noise.

---

## 8. Implementation slices

1. **Engine directive** — recognize `debug`, stamp `data-debug`, suppress `--debug`,
   allow per-slide + bare flag. Unit tests mirror `focus`/`build`. Lint: warn on
   unknown facet tokens.
2. **Export strip** — remove `data-debug` in the export choke point; test that export
   bytes are identical with debug on vs off.
3. **Debug overlay agent** — config parse, layout-mode AA/CVD palette, corner-label
   overlay (zero flow), depth gating + hover-isolate. Extend
   `bbox-overlay.test.js` for the CSS/DOM contract and config parser.
4. **Wire the surfaces** — `deck-preview.js` (Playground + Drawing Board) and
   `single-slide-render.ts` (Studio) first (the three named), then
   `presenter-window.js`, `drawing-board-practice.js`, `drawing-board-focus.js`.
5. **Toggle = session override** — front-matter default; toolbar/localStorage overrides
   for the session. Update DeckSetupSheet + Studio settings copy.
6. **Docs + changelog + demo** — this doc, an engineering page section, `CHANGELOG`
   `## Unreleased`, and a demo deck `examples/debug.md` (+ committed PDF) per #9.

---

## 9. Open questions / risks

- **Export choke point:** confirm the exact module for the strip (candidate:
  `lib/core/marp-bundle.js` / the pipeline). Locate during slice 2.
- **Identity prettification:** components are class-based (no `data-component`); the
  agent derives the name from the class list, prettified via `dist/docs/components.json`.
  Heuristic — refine if names read poorly.
- **Perf on huge decks:** only label *rendered* sections (the filmstrip already
  lazy-renders via `content-visibility`); the agent must not walk off-screen slides.
