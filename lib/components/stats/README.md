# stats

> Row of 3–5 stat tiles, each with a big number and a label.

**Function** evidence · **Form** stack · **Substance** structure

## When to use

At-a-glance metric rows — quarterly headline numbers, top-line KPIs,
"here's the impact in three numbers" slides. Each tile reads as Big
Number + uppercase caption.

For ONE focal number, use `big-number`. For value-target-trend per
metric, use `kpi`.

## Authoring

```markdown
<!-- _class: stats -->

## Six months of results.

- **92%**
  - Caption for the first stat
- **3.4×**
  - Caption for the second stat
- **$1.2M**
  - Caption for the third stat
- **−18d**
  - Caption for the fourth stat
```

The list is post-processed into a row of `.stat-item` tiles —
**bold number** as the headline, nested bullet as the caption.

## Slots

| Slot | Selector | Required | Notes |
|---|---|---|---|
| title | `h2` | yes | slide heading |
| subtitle | `p > code` | no | inline-code paragraph after h2 |
| tiles | `ul > li` | yes | one li per stat (number + caption) |

## Variants

Layout-specific: *(none)*. Inherits universals + semi-universals.

## Engine notes

The structure post-processor wraps the list into
`.stats-row > .stat-item > .stat-num + .stat-label`. The same wrapping
happens in all three render paths per the three-renderer rule.
