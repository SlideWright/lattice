# Executive KPI system — v1

Earlier rounds shipped disconnected layouts. This round is **one
cohesive base** with **five use-case modifiers**, designed against
what an executive audience actually needs from a KPI slide.

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

## The system

One base class `kpi-sys` defines the shared primitives:

- **Eyebrow** — h3 mono small caps: `DOMAIN · PERIOD`
- **Headline** — h2 Playfair serif, one statement per slide
- **Number** — Playfair Display, tabular figures, status-colourable
- **Pill** — trailing inline `` `code` `` on a list item (lattice
  universal convention; deny-list opt-in via per-layout override).
  Status pill is the first trailing code; subsequent codes are
  neutral audience/period pills
- **Flagship ornament** — `✦` four-point star on critical / hero card
- **Status palette** — `--pass / --warn / --fail` (existing tokens)
- **Authoring contract** — one structure across all five layouts:

  ```markdown
  <!-- _class: kpi-sys kpi-{briefing|ops|compliance|trajectory|spotlight} -->

  ### Domain · Period
  ## Headline statement.

  1. **$2.4B**
     - Total revenue
     - target $2.2B · +9% `On plan` `Board`
  2. ...
  ```

## Five modifiers

| Modifier | Use-case | Layout | Pill story |
| --- | --- | --- | --- |
| `kpi.briefing` | Board / financial | Hero left (accent-soft, ✦, watermark numerals) + 3 hairline supports right | Status + audience: `On plan` `Board`, `Audit`, `Investor` |
| `kpi.ops` | SLO / SLA | 2×2 grid, slipping metrics rendered in `--warn`, breach in `--warn` text | Verdict + owner: `On track` `SRE`, `At risk` `Platform`, `Breaching` |
| `kpi.compliance` | Legal / regulatory | Vertical list, binary-state pills, source footnote | Framework state + owner: `Compliant` `Auditor`, `Remediating` `DPO` |
| `kpi.trajectory` | Investor / period | 4-up cards with categorical top stripes, content-centred, no stretch | Growth: `YoY +28%` `Investor`, `YoY +3pp` |
| `kpi.spotlight` | Single hero metric | Hero left with watermark + body copy + ✦, three small supports right | `Headline` + audience: `Board`, `Investor` |

All five share the same:
- Type ladder
- Pill design and color mapping
- Eyebrow + headline format
- `--pass / --warn / --fail` palette
- `✦` flagship ornament
- `accent-soft` for hero fill

What differs is **composition** (grid shape, card chrome, number tier).

## Authoring example

```markdown
<!-- _class: kpi-sys kpi-briefing -->

### Financial · Q4 2026
## Revenue ahead of plan; margin and cash both expanded.

1. **$2.4B**
   - Total revenue
   - target $2.2B · +9% vs plan `On plan` `Board`
2. **42%**
   - Gross margin
   - +2pp QoQ `On plan` `Audit`
3. **$1.1B**
   - Cash & equivalents
   - +$180M QoQ `On plan` `Investor`
4. **+18%**
   - YoY revenue growth
   - vs 14% prior year `Ahead` `Board`
```

Pills emerge from trailing inline code; the first pill on each row
carries the status colour (driven today by `nth-child` cycle in each
modifier; production should swap this for a per-li class hint).

## Inspection

```sh
node lattice-emulator.js \
  docs/notes/2026-05-12-kpi-candidates.md \
  out.pdf
```

Six slides: title → briefing → ops → compliance → trajectory →
spotlight. All five share the system DNA; each one demonstrates a
distinct executive use-case.

## What's still open

- **Per-item status hint** — production needs an author-level way to
  mark a row as `warn` / `fail` / `pass`. Demo hardcodes via
  `nth-child`. Most idiomatic candidate: a trailing italic word in
  the target line (`*at risk*` / `*on track*`) read by CSS `:has()`.
- **Kpi deny-list** — the universal pill rule in `lattice.css`
  excludes `kpi` (single-message). The new system would need to be
  opted back into the allow list, or `kpi-sys` added as a sibling
  family that's allowed by default.
- **Source line styling** — `kpi-compliance > p:last-of-type` is
  defined but the default `<p>` cascade is winning. Needs a more
  specific selector or a different element.
