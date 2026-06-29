---
status: shipped
summary: The lattice-asset zip share contract for saved themes + components — one manifest.json envelope (mirroring the .lattice deck format), a live-rendered theme showcase.pdf, and lossless re-import into the unified Studio Library. Records the engine gap that a DERIVED theme omits the `--chart-cat-N-hue` tokens piechart/quadrant/progress need standalone, so the showcase uses a `journey` chart (which reads the `--chart-catN` series tokens the derivation does emit).
---

# The lattice-asset share format — portable themes + components

**Closes #54/#55/#56** (G5 of the Studio polish backlog,
`2026-06-28-studio-polish-backlog.md`). Reconciles the "share a theme/component
via zip" ask with the deck-level [`2026-06-16-lattice-export-format.md`](2026-06-16-lattice-export-format.md):
the asset zip carries the SAME `manifest.json` envelope idea, scoped to a saved
theme or component rather than a deck.

## The contract

One envelope, three shapes — single theme, single component, or a mixed bundle:

```
<slug>.lattice-theme.zip      manifest.json · <slug>.css · <slug>-showcase.pdf · README.md
<slug>.lattice-component.zip  manifest.json · <slug>.css · <slug>.skeleton.md · README.md
lattice-assets.zip            manifest.json · themes/<slug>/… · components/<slug>/… · README.md
```

`manifest.json` is `{ format: "lattice-asset/1", kind: "theme"|"component"|"bundle",
items: [...] }`; each item records its kind + the in-zip paths of its parts, so
**pack and unpack are symmetric for all three layouts** (the unpacker reads file
paths from the manifest, not a fixed layout). Import re-hydrates straight into the
shared asset store (`asset-store.js`) — the same shelf Fabricate saves into — so a
shared theme/component lands in the unified **Library** ready to apply/insert.

Code: `docs/src/components/studio/asset-bundle.ts` (pure pack/unpack + the
showcase deck), `Library.tsx` (the drawer), `share-export.ts#renderThemeShowcase`
(the live PDF), `drawing-board-export.js#renderPdfBlob` (PDF → bytes, extracted
from `exportPdf`). Roundtrip-tested in `asset-bundle.test.ts`.

## The theme showcase.pdf

A theme zip ships a **live-rendered** deck so the file *shows off* the look, not
just the tokens: title → KPIs → a **journey** chart → a **Mermaid** flow →
split-panel → closing, rendered in the theme via the same Share→PDF path
(`renderThemeShowcase` → `renderPdfBlob`). The Studio threads its locally-vendored
Mermaid (`mermaidUrl`) through the export so the showcase's diagram renders from
our own origin, not jsdelivr — offline / strict-CSP safe (and it fixes Mermaid in
every Share→PDF, not just the showcase).

## Known gap — derived themes lack `--chart-cat-N-hue` (off-path)

`piechart` / `quadrant` / `progress` / `timeline-list` / `word-cloud` fill from
`--chart-cat-N-fill`, which `lattice.css` defines as a `color-mix` of
`--chart-cat-N-hue`. A **built-in** palette ships those hue tokens; a **derived**
theme (`serializeTheme`) does NOT — it emits `--chart-catN` (series) + `--cat-N-fill/mark`
instead. So a *standalone* derived theme renders those charts uncoloured (the
live Studio preview only looks right because it borrows the hues from the
underlying `data-palette`). The showcase sidesteps this by using `journey` (reads
`--chart-catN`). The real fix — have `serializeTheme` emit a complete
`--chart-cat-N-hue` set so a derived theme is self-contained for every chart — is
an engine change tracked separately, out of scope for this docs-Studio feature.
