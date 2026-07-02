---
status: in-progress
summary: Replace the preview's `transform: scale()` down-scaling with CSS `zoom`. The transform-scaled iframe is the root of the iOS interaction tax — touch isn't delivered into a transform-scaled iframe (the debug-overlay saga's parent-hosted capture surface), external link taps navigate the frame (the video-poster blank), and every interactive layer carries ÷scale coordinate math. `zoom` is a REAL geometry scale, so hit-testing and touch land at displayed coordinates. A fidelity spike proved the blocking unknown — `container-type: size` + cqi/cqh resolve identically under zoom (a cqi/cqh-heavy slide diffed zoom-vs-transform is layout-identical, differing only on text anti-alias) at both desktop (0.56×) and mobile (0.30×) scales. Rollout is staged: prototype the shared filmstrip (deck-preview.js FIT agent) first for on-device iOS confirmation, then migrate the other four builders + retire the ÷scale coordinate math in debug-overlay/chart-interact. The link guard stays regardless — link navigation is orthogonal to scale.
last-updated: 2026-07-02
companion:
  - ./2026-07-01-debug-bounding-boxes.md
  - ./2026-07-02-preview-iframe-vs-shadow-dom.md
---

# Preview down-scaling: `transform: scale()` → CSS `zoom`

**Date:** 2026-07-02
**Status:** In progress — filmstrip prototype landed for on-device iOS confirmation; full migration gated on that.
**Prompted by:** the owner, after the video-poster iOS blank: "it's a yucky solution. I wonder if we really need transform-scaled to begin with — maybe if we solve that we solve all these problems."

---

## 1. The problem

A slide must lay out at its intrinsic `@size` box (1280×720) — `section { container-type: size }` and every `cqi`/`cqh` unit resolve against that box, and "preview === export" depends on it. The preview pane is narrower, so the slide is down-scaled. Today that is `transform: scale(w/1280)`, which scales the **paint** but leaves the **layout box** at full size. That single choice is the root of a recurring class of iOS bugs:

- **Touch isn't delivered into a transform-scaled iframe** (iOS Safari). The whole parent-hosted capture surface + `elementsFromPoint` mapping in the debug-overlay work (`2026-07-01-debug-bounding-boxes.md`) exists to work around this.
- **Every interactive layer carries `÷scale` coordinate math** — debug-overlay label placement, chart-interact hit-testing — to undo the transform.
- **The negative-margin trick** (`marginBottom = SH*sc − SH + GAP`) and the `overflow: clip` dead-space fix in the FIT agent both exist only because the layout box stays full-size.

The owner's intuition: retire `transform: scale()` and this class dissolves.

**One caveat up front — the link-tap blank is NOT in this class.** Tapping an in-slide `<a href>` navigates the *iframe* to the external site, which frame-blocks → blank. That happens at scale 1.0 too; it's a navigation-policy issue, fixed by the preview link guard (`deck-preview.js linkGuardAgent`), and stays regardless of what we do about scaling.

---

## 2. The candidate: CSS `zoom`

`zoom` is a **real geometry** scale — it changes the used box size, not just the paint. So:

- Hit-testing and touch land at the **displayed** coordinates → no capture surface, no `÷scale` math.
- No negative-margin compensation (the box shrinks for real) and no `overflow: clip` dead-space fix.
- `getBoundingClientRect` returns the displayed rect directly.

It is now universally supported (Safari always, Chrome always, Firefox 126+).

**The blocking unknown was fidelity:** does `container-type: size` + `cqi`/`cqh` stay faithful when the container is `zoom`-scaled rather than paint-scaled?

---

## 3. The fidelity spike (verified)

Rendered a `cqi`/`cqh`- and text-heavy `stats` slide through the real preview engine (`lib/playground`, `inlineSVG:false` — the same DOM `deck-preview` scales), displayed the same section at the same target width two ways, and diffed:

| Scale | Displaying | Differing px | Where |
|---|---|---|---|
| **0.5625** (desktop pane) | 720×405 | ~6.5k / 292k (2.2%) | glyph edges only |
| **0.305** (mobile pane) | 390×220 | ~1.9k / 86k (2.2%) | glyph edges only |

The diff map lights up **only on text edges** — zero structural shift, no repositioning, no line-break drift. `cqi`/`cqh` resolve identically under `zoom`; the only difference is sub-pixel text rasterization (if anything `zoom` is *crisper*, laid out at target size, and closer to the native-resolution export). Artifacts: `.scratch/spike/` (compare-desktop.png, compare-mobile.png).

**Verdict: `zoom` is viable.** The blocking question is answered.

---

## 4. What is still unproven

The **payoff** — that `zoom` actually fixes the iOS touch class — cannot be verified from the headless sandbox (headless Chromium delivers iframe touch fine; only real iOS Safari doesn't — the same trap as the debug saga). It requires **on-device confirmation** (HARD RULE #23). Hence the staged rollout.

---

## 5. Rollout (staged)

1. **Filmstrip prototype (this change).** Switch the shared filmstrip builder's FIT agent (`deck-preview.js`, used by the Playground + Drawing Board) from `transform: scale()` → `zoom`. Ship it, deploy the Cloudflare preview, and confirm on a real iPhone: (a) it looks right, (b) tapping/interacting works. Unit tests updated; fidelity proven in §3.
2. **On-device gate.** If iOS confirms → proceed. If iOS rejects `zoom` → revert one file, keep the link guard, done cheaply.
3. **Full migration.** The other four preview builders (`single-slide-render.ts` Studio, `presenter-window.js`, `drawing-board-practice.js`, `drawing-board-focus.js`), then **retire the `÷scale` coordinate math** in `debug-overlay.js` and `drawing-board-chart-interact.js` and the parent-hosted capture surface — `getBoundingClientRect` now returns displayed coordinates, so the mapping collapses to identity. Each surface re-verified on-device.

**Known follow-ups (do NOT ship half-migrated as "done"):** while the filmstrip runs `zoom` but debug-overlay/chart-interact still assume transform, their coordinate math is off *for the filmstrip surfaces* — those features (opt-in debug mode, chart hover-detail) get their zoom-aware pass in step 3. The prototype is scoped to the core preview render + interaction, which is what the on-device gate tests.

---

## 6. Decision

**Prototype `zoom` on the filmstrip now; gate the full migration on on-device iOS confirmation.** The fidelity risk is retired; the interaction payoff is real but must be proven on the one surface the sandbox can't reach.
