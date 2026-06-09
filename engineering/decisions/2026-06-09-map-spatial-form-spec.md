# `map` — the spatial form (design spec) — 2026-06-09

> Status: **spec / design model. No code.** Deferred deliberately on the
> coach-industry-coverage branch (2026-06-09): `map` is the one candidate
> component that changes the design-system's **form** taxonomy, so it earns its
> own decision before any kernel is written. Companion to the two shipped gap
> closers (`logo-wall`, `pricing`) and the chart-bucket `funnel`.

## The gap

The coach's archetype audit (`2026-06-08-architect-modes.md`, Appendix A) leans
hardest on **Government / Public** and **Nonprofit / Mission-driven** decks, and
both lean on geography that Lattice can't draw: program reach, jurisdictions,
coverage areas, service territories, where-the-grants-landed. Today the only
move is a flat `image`. Every other industry gap closed on this branch reused an
existing *form*; `map` does not — which is exactly why it's specced, not built.

## Function · Form · Substance

| Axis | Value | Note |
|---|---|---|
| **Function** | `evidence` | the audience leaves knowing *where*, backed by data |
| **Form** | **`spatial`** — NEW | points/regions placed by real-world geography, not by a grid/axis |
| **Substance** | `series` | a value (or category) per named region — the same tabular DSL the charts use |
| **Bucket** | `chart` | it's a data visualisation with an SVG kernel + palette injection, like `funnel` |

### Why a new form

§4 of `design-system.md` lists 11 forms; the closest are `scatter` (points in a
*continuous × continuous* plane) and `matrix` (categorical × categorical). A map
is neither — positions are fixed by **geography**, an external coordinate system
the author doesn't choose. That's a genuinely new spatial primitive, so §4 gains
a 12th row:

> **spatial** — points or regions placed by real-world geography (a basemap). *Used by: Evidence (map).*

This is the one architectural change `map` forces. It should land in the same
change as the component, with the §4 table and the `form` enum
(`manifest.schema.json`, `lib/components/index.js`) updated together.

## Authoring grammar

Mirror the chart-family series DSL — a list of named regions with trailing
values, so it reads like `funnel` / `piechart`:

```markdown
<!-- _class: map us -->

## Where the program runs.

- California `4.2`
- Texas `3.1`
- New York `2.8`
- Florida `2.2`
```

- **Region name** = the li lead; **value** = trailing inline-code.
- The kernel matches each name to a basemap region id (case/alias-tolerant:
  `California` / `CA` / `Calif.`). Unmatched names are reported, not silently
  dropped (a `data-unmatched` attribute the gallery test can assert).
- A `map us` / `map world` token (or front-matter) picks the basemap. Default
  to whichever ships first.

## Two read modes (variants)

1. **Choropleth** (default) — fill each region on a sequential ramp off one
   `--catN-hue`, exactly like `funnel`'s band ramp. Light → dark = low → high.
   For *how much, where*.
2. **Highlight** (`map highlight`) — categorical: each named region takes a
   `--catN` slot, unnamed regions stay neutral. For *which ones* (the eight
   pilot states, the four regions we serve). No magnitude.

A legend/scale reuses the `piechart`-legend + chart-frame caption machinery.

## The kernel

A chart-family kernel module (`lib/components/chart/map/map.transform.js`)
exporting `parseMap` + `buildMap`, registered in the single dispatcher
(`_chart-family/chart-family.js`) and reaching all three render paths through
the registry — same write-once path `funnel` just proved. The kernel:

1. holds the **basemap as baked SVG path data** keyed by region id (the heavy
   asset — see below),
2. binds parsed values to regions, computes the ramp/slot fill,
3. emits `<div class="map-figure"><svg>…</svg>…legend…</div>`; colour stays in
   `map.styles.css` so the kernel is palette-blind.

### The cost — it's the basemap asset

Unlike every other chart, `map`'s geometry is a large fixed dataset:

- **US states**: ~50 `<path>`s. A simplified TopoJSON→SVG basemap is ~30–60 KB
  minified. One basemap, one country, highest value for US gov/public-sector.
- **World countries**: ~200 `<path>`s, ~80–150 KB even simplified, plus the
  naming/alias problem is far worse (exonyms, disputed borders). Better for
  international NGO / multinational decks.

This is the real reason `map` is deferred: it adds a sizeable static asset to
the bundle (`dist/lattice.css`/runtime/emulator all inline the kernel graph),
where every component so far added < 3 KB. The basemap should be **lazy / opt-in**
so decks that don't use `map` don't pay for it — likely a separate kernel file
the bundlers only pull when referenced, which needs a bundler-boundary check
(`build-emulator.js`, `build-runtime`, `build-css` all walk the local graph).

## Recommendation

- **Ship US-states first**, choropleth + highlight. One basemap, the strongest
  audience fit, the alias problem is tractable (50 well-known names + postal
  codes). Validate the spatial form, the lazy-asset boundary, and the
  name-binding UX on it.
- **Add `world`** as a second basemap once the boundary is proven — same kernel,
  swap the path dataset and the alias table.
- **Source** the basemaps from public-domain simplified geodata (Natural Earth /
  US Census cartographic boundaries → TopoJSON → simplified SVG paths), checked
  in as generated data with the generator script recorded, not hand-traced.

## Open questions (resolve at build time)

- **Asset boundary** — can the bundlers tree-shake an unreferenced basemap, or
  does `map`'s kernel always ship? If always, is ~50 KB acceptable in
  `dist/lattice.css`, or does the basemap live in a separate fetched asset
  (breaking the zero-fetch contract)? This is the gating question.
- **Projection** — US: Albers USA (insets AK/HI) vs plain. World: Robinson vs
  equirectangular. Bake one projection into the path data; don't compute at
  render time.
- **Sub-region drill** (counties, congressional districts) — out of scope for
  v1; the form supports it later with another basemap.
- **Points/pins mode** (cities, sites by lat/long) — a third read mode the
  spatial form enables, deferred until there's demand.

## References

- `design/design-system.md` §3–§5 (function/form/substance), §9 (chart bucket).
- `lib/components/chart/funnel/` — the freshest kernel-as-module precedent and
  the single-hue ramp this spec reuses for choropleth.
- `2026-06-08-architect-modes.md` Appendix A — the gov/public + nonprofit
  archetypes that justify the spatial form.
