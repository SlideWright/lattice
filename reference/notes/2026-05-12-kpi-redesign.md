# Executive KPI system — shipped

The shipped `kpi` layout (categorical rainbow stripes, bg-alt rounded
cards, fs-display centred numerals) was replaced wholesale. The new
`kpi` is one cohesive base with five layout modifiers, designed
against what executives actually need from a KPI slide.

## What executives need

| Domain | Audience | What the slide must do |
| --- | --- | --- |
| Financial | Board / investors / audit committee | Revenue, margin, cash — versus plan and prior period. |
| Operations | SRE / service owners / ops review | SLA/SLO posture, latency, error budget — versus contract. |
| Legal / compliance | Risk committee / regulators | Finding counts, remediation status, framework verdicts. |
| Investor / period | Investor relations / steering | Trajectory: QoQ / YoY / TTM growth on the key levers. |
| Headline / flagship | Any audience, "the number" | One monumentalised metric with context. |

Every one of those needs four things on the slide:

1. **The figure.**
2. **The benchmark** it's compared to (target / plan / prior).
3. **The verdict** (on plan / at risk / breach / compliant).
4. **The audience** (who cares: board / SRE / investor / DPO).

That last one is what **pills** do. Without a pill, the slide is just
numbers floating; with a pill the slide *names the verdict and names
the audience*. Pills are first-class.

## What shipped

| Class | Use-case | Notes |
| --- | --- | --- |
| `kpi` (bare) | Default — board / financial briefing | Resolves to the briefing layout: hero left + 3 hairline supports. |
| `kpi briefing` | Same as bare; explicit | Same as bare. |
| `kpi ops` | SLO / SLA review | 2×2 grid; slipping metrics in `--warn`. |
| `kpi compliance` | Legal / regulatory | Vertical list with binary-state pills + source footer. |
| `kpi trajectory` | Investor / period | 4-up cards with categorical top stripes. |
| `kpi spotlight` | Single hero metric | Watermark + serif italic body copy. |
| `kpi attention` | (compose with any) | Recolours the hero card to `--warn` when the headline metric is slipping. |

## Shared primitives (the cohesion)

- **Eyebrow** — h3 mono small caps `DOMAIN · PERIOD`
- **Headline** — h2 Playfair serif, one statement
- **Number** — Playfair display, tabular figures, status-colourable
- **Pill** — trailing inline `` `code` `` becomes a pill; first pill on
  each row carries the status colour
- **Flagship ornament** — `✦` four-point star on critical / hero card
- **Status palette** — `--pass / --warn / --fail` (existing tokens)
- **Source footnote** — optional trailing `<p>` in `kpi.compliance`

## What was retired

- The old `section.kpi { ... }` block in `lattice.css` (categorical
  rainbow top-stripes on rounded bg-alt cards).
- The `kpi.target` modifier (target/trend is now part of the natural
  authoring flow as the second nested bullet, with pills).
- The `:not(.kpi)` deny-list entry stays — kpi uses its own pill rule
  (any `<code>` inside a kpi section becomes a pill), which is broader
  than the universal trailing-code rule.

## Migration

- `lattice.css` — old block replaced.
- `examples/gallery.md`, `gallery-guide.md`, `gallery-jargon.md` —
  three deck slides migrated. The 94%/8 ms/0/3.2× sample data now
  carries `On plan` / `At risk` / audience pills.
- `examples/gallery.pdf` and `examples/mermaid-gallery.pdf` — rebuilt
  in the same commit; page counts unchanged.
- `reference/engineering/templates.md` — kpi entry rewritten with the new
  modifier table and authoring example.

## Inspection

```sh
node lattice-emulator.js \
  reference/notes/2026-05-12-kpi-candidates.md \
  out.pdf
```

Six-slide deck: title → bare `kpi` (briefing default) → `kpi ops` →
`kpi compliance` → `kpi trajectory` → `kpi spotlight`. The candidates
deck now uses the production CSS — no inline `<style>` overrides.

## Still open

- **Per-row status hint** beyond `attention` — production needs more
  expressive author-level overrides for ops/compliance rows. Likely a
  trailing italic word in the target line (`*at risk*` / `*on plan*`)
  read by CSS `:has()`, but deferred until first-use shows what's
  actually needed.
- **Source line** (`section.kpi.compliance > p:last-of-type`) renders
  but cascade is wrong — the universal `<p>` style wins. Needs a
  more specific selector or a per-paragraph class. Cosmetic.
