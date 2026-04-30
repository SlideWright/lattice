# Marp Slide Deck Pipeline — Lattice Skill

## What This Skill Covers

Instructions for creating, rendering, and auditing Lattice presentation decks. Marp-flavored Markdown is the single source of truth; output formats are PDF, HTML, PPTX, and PNG sets.

**`lattice.css` is the source of truth for visual output.** All rendering modes must produce output faithful to the CSS spec. When output deviates, the CSS wins — not the renderer.

---

## Load the Right Reference

Open the relevant file before starting work. Only load what the current task needs.

| Task | Load |
|------|------|
| Writing or editing slide content | [references/design.md](./references/design.md) + [references/templates.md](./references/templates.md) |
| Choosing a layout class or template | [references/templates.md](./references/templates.md) |
| Adding a Mermaid diagram | [references/mermaid.md](./references/mermaid.md) |
| Running the render pipeline (PDF/HTML/PPTX) | [references/pipeline.md](./references/pipeline.md) |
| Comparing lattice.js vs marp-cli output | [references/audit.md](./references/audit.md) |

**Do not load all files at once.** Load only what the task requires.

---

## Rendering Modes (quick reference)

Three modes, same `.md` source file — no source changes needed.

| Situation | Use |
|-----------|-----|
| VS Code preview / quick export | Mode 1 — Marp Extension |
| Final PDF/HTML/PPTX for delivery | Mode 2 — Marp CLI (preferred) |
| LLM environment without Marp CLI | Mode 3 — lattice.js emulator |
| Verifying layout spec compliance | Mode 2 preferred, Mode 3 acceptable |

**Check for Marp CLI first:**
```bash
npx @marp-team/marp-cli --version   # use this if it returns a version
marp --version                       # or this
```
Only fall back to `lattice.js` when both commands fail.

**Mode 2 — Marp CLI:**
```bash
npx @marp-team/marp-cli deck.md --theme-set themes/indaco.css lattice.css --pdf --output output.pdf
npx @marp-team/marp-cli deck.md --theme-set themes/indaco.css lattice.css --images png --output output/
```

**Mode 3 — lattice.js:**
```bash
node lattice.js examples/gallery.md lattice.css output.pdf indaco
# produces output.html alongside the PDF
```

Full rendering pipeline (Mermaid, PPTX, image conversion): see [references/pipeline.md](./references/pipeline.md).

---

