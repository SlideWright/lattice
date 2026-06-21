---
status: shipped
summary: The state-chart read as a dashboard, not a flow — per-node status text pills widened the column and collided the spine edge-labels with the nodes (worst in the vertical `curved` variant). Decision — "cut the fat": status folds into the top-right index numeral (the index becomes a colour-coded badge — number + status in ONE element), decoded by a legend band (journey-style); the D3-style edge router is untouched. Authoring unchanged.
last-updated: 2026-06-20
companion:
  - ../../lib/components/chart/state-chart/state-chart.transform.js
  - ../../lib/components/chart/state-chart/state-chart.styles.css
---

# Simplifying the state-chart — status as a dot, not a pill

**Date:** 2026-06-20 · **Status:** shipped.

## Symptom

On a small (mobile-preview) container, the state-chart's transition edge-labels
overlapped the state nodes — egregiously in the vertical `curved` variant, where
`submit` / `approve` / `publish` / `archive` crashed into the node column. It
"looked nice" but read as cluttered: a state chart should be *simple*.

## Root cause — content load, not the router

The browser-measured D3-style edge router (gutters, ports, bow-packing,
curved/orthogonal) is sound. The problem was **too much on the chart**: every
state carried a wide `chart-status` **text pill** (`on-track`, `live`, …). Those
pills widened the node column, pushed the gutters, and — in the tight vertical
rhythm of `curved` — left no room between nodes, so the spine labels collided.
Three text layers (label · status pill · edge labels) fought for one narrow
column.

## The axes considered

1. **On-chart content (the "fat")** — status pills · a label on every arrow · index.
2. **Spacing** — gap floors, label clearance, curved reach.
3. **The canonical samples** — how loud the examples are.
4. **Small-container fit.**

## Decision — cut the fat (status → dot + legend)

Chosen over "spacing-only" (a band-aid that leaves the dense case tight and risks
overflow) and a "full rethink" (unnecessary — the router is good):

- **Status folds into the top-right index numeral.** Rather than add a separate
  dot, the index badge does double duty: the numeral is the state's ID, its
  colour is the status (`.state-index[data-s]`), so a status-bearing node carries
  both in ONE corner element and a status-less node keeps a quiet plain numeral.
  The badge and the legend swatch share `.chart-status`'s AA-vetted fill recipe
  (pass/warn/fail/info/mute), **decoded by a compact legend band** below the
  chart — the journey glyph-in-a-disc + legend pattern (Hard Rule #15: reuse the UI).
- **Edge labels stay** (they're the state-machine semantics); with the node
  column narrowed by the dot, they no longer collide.
- **Samples trimmed** to use *distinct* tones, so the legend is a real key (the
  tone palette maps several keywords to one hue — e.g. on-track/done/live all
  read green — so same-tone dots are only disambiguated by the legend label;
  samples avoid relying on that).
- **Router untouched.** Authoring grammar unchanged (same status keywords).

## Result

Verified by rendering the gallery (landscape PDF) on light + dark: `curved`,
default `lr`, and the dense `tb` stress chart all read clean — narrow nodes,
dots on the relevant states, edge labels clear on the spine, a legend band
below. The dashboard noise is gone; the flow is the read.

## Note for the Tier-2 detail work (#466)

This lands *before* adding interactive per-mark detail to state-chart: a clean,
uncluttered state-chart is the right baseline for that grammar work.
