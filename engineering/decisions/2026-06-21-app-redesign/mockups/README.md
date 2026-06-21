# Studio redesign — mockups (v1 + v2)

High-fidelity visual specs for [`../../2026-06-21-app-redesign.md`](../../2026-06-21-app-redesign.md).
Built from the **real** Lattice indaco tokens (mirrored from
`docs/src/styles/lattice-tokens.generated.css`) + the real type stack — Outfit
(body), Playfair Display (wordmark), JetBrains Mono (code) — and lucide-style
icons, so palette, type, and density are faithful. **These are zero-behavior
visual specs, not shipped code** (PM-12) — the real surfaces carry ~30 modules of
state behind these pictures.

## v1 vs v2 — what differs (it's only the shell chrome)

Two options for the intent switch (the open fork **PM-5**). **Only the chrome that
switches intents and carries the brand differs** — the editor, live preview, Deck
Inspector, Architect, and every other surface are identical between the two.

| | **v1 — Activity rail** (`v1-rail/`) | **v2 — Top tabs** (`v2-tabs/`, recommended) |
|---|---|---|
| Intent switch | Left vertical rail, 66px, icon + label (VS Code-like) | Horizontal top tabs with an underline (lighter, web-like) |
| Header | One bar (rail + a single AppBar) | Two rows: global topbar (brand · tabs · chrome) + a context bar (deck switcher · intent actions) |
| Brand | Small “L” tile on the rail | Playfair “Lattice” wordmark + an account avatar |
| Left-edge cost | Permanent 66px rail | 0px — the work area reaches the edge |
| Scales to more intents | Better (holds 6+) | Fine for 3; crowds past ~5 |
| **Mobile intent switch** | rail collapses into a top **hamburger → drawer** | a thumb-friendly **bottom intent bar** |
| Everything else | — identical — | — identical — |

### Full mobile (390×844)

Each version has a complete mobile set (Present is identical across both):

| File | v1-rail | v2-tabs |
|---|---|---|
| `mobile-compose.png` | Preview + hamburger/drawer (drawer shown open) | Preview + bottom intent bar |
| `mobile-edit.png` | Markdown editor + Architect bar (hamburger) | Markdown editor + Architect bar (bottom bar) |
| `mobile-present.png` | reader: read-aloud highlight · lens chip · play/scrub dock | (identical) |

(`mobile.png` is the earlier short single-screen Compose, kept for history.)

See [`compare/compare-compose.png`](./compare/compare-compose.png) for the
annotated side-by-side. **The red-team (PM-5) recommends v2 / top-tabs**: for three
intents a rail copies the VS Code *look* without the load that justifies its tax.
Keep v1 / the rail only if a 4th/5th intent is foreseen.

## The screens (v2-tabs is the current recommendation)

| File | Shows |
|---|---|
| `compose` | Architect aside · editor + live preview · Deck Inspector (Look / Read / **Lenses**) |
| `fabricate` | **Workbench / Theme Studio** — pick 4 core colours → engine-derived 18-token contract → live WCAG audit → live specimen + auto dark *(v2 only)* |
| `present` | the reader — **read-aloud with synchronized highlight**, reader-facing **lens switch**, play/scrub dock (dark) |
| `share` | the Share sheet — hand off the **deck** vs hand off the **source** (both print targets) |
| `settings` | **Workspace Settings** (“your setup”) — tier · OpenRouter · spend/budget — distinct from the deck Inspector (“this deck”) |
| `mobile` | mobile Compose — bottom intent bar · pane tabs · icon-only chrome (390px) |

## Rebuild (`src/`)

```bash
cd src
node build.js   # assembles *.body.html → *.html (inlines the shared sprite + head)
# then screenshot from the repo root, e.g. the v2 Compose:
node tools/screenshot.js "file://$PWD/engineering/decisions/2026-06-21-app-redesign/mockups/src/compose.html" out.png --width 1440 --height 900 --delay 1500
```

`src/` produces **both** shells: `compose.body.html` is the v2 top-tabs version;
`compose-rail.body.html` is the v1 rail version. The v1 `present/share/settings`
shots predate the tab refactor and are kept as the rail reference.
