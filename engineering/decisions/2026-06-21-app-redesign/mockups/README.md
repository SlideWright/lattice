# Studio redesign — mockups

High-fidelity visual specs for `../../2026-06-21-app-redesign.md`. Built from the
**real** Lattice indaco tokens (mirrored from
`docs/src/styles/lattice-tokens.generated.css`) + Outfit / JetBrains Mono +
lucide-style icons, so palette, type, and density are faithful — not shipped code.

## Rebuild

```bash
node build.js            # assembles *.body.html → *.html (inlines the shared sprite + head)
# then screenshot from the repo root:
node tools/screenshot.js "file://$PWD/engineering/decisions/2026-06-21-app-redesign/mockups/compose.html" out.png --width 1440 --height 900 --delay 1300
```

| Page | Shows |
|---|---|
| `compose` | rail · slotted AppBar · Architect aside · editor + preview · Deck Inspector (Look / Read / Lenses) |
| `present` | reader: read-aloud with synchronized highlight · reader-facing lens switch · play/scrub dock (dark) |
| `share`   | Share sheet — hand off the deck vs hand off the source (both print targets) |
| `settings`| Workspace Settings ("your setup") — tier · OpenRouter · spend/budget |
| `mobile`  | mobile Compose — bottom intent bar · pane tabs · icon-only chrome (390px) |

Pre-rendered PNGs in `shots/`.
