# map

> A US-states basemap that fills regions by value (choropleth) or category (highlight) so the audience leaves knowing where.

**Function** evidence · **Form** spatial · **Substance** series

**Tags** `metric` · `proportion` · `overview` · `visual`

Use when the story is geographic — program reach, service territories, where the grants landed, the pilot states. Author a value per named region (full name, postal code, or common abbreviation); choropleth shades each region on a single-hue ramp (low→high), while `highlight` gives each named region its own categorical colour. Regions the basemap can't match are reported in the legend, never silently dropped.

## When to use

- **The story is geographic.** Reach for a map only when WHERE is the point — coverage areas, jurisdictions, service territories, where the grants or pilots landed. If the geography is incidental and the comparison is really between named things, a `progress` or `stats` row reads faster than a basemap.
- **Choropleth for magnitude, highlight for membership.** Use the default choropleth when each region carries a number and the audience needs the gradient — how much, where. Use `highlight` when the named regions are a set (the eight pilot states, the four regions we serve) and there is no magnitude to rank.
- **Name regions any common way.** Full name, postal code, or a usual abbreviation all resolve case-insensitively (`California` / `CA` / `Calif.`). A name the basemap can't bind is reported as a muted ‘?’ row in the legend and stamped on the figure — fix the spelling, don't ignore the gap.

## When NOT to use

- **A map as decoration.** If the regions aren't the comparison — you just want a US-shaped graphic behind some numbers — drop the basemap. An `image` scrim or a `stats` row carries headline figures without implying the geography is the message.
- **Too many shades to read.** A choropleth past a dozen distinct values asks the eye to rank colours it can't separate. Bucket the values, switch to `highlight` for a categorical read, or lead with a `progress` ranking and keep the map as support.
- **Sub-state precision the basemap doesn't have.** v1 draws states only — counties, districts, and city pins are out of scope. If the story lives below the state line, a labelled `image` of the real map serves better than forcing it onto a states basemap.

## Authoring

```markdown
<!-- _class: map -->

## Where the program runs.

- California `4.2`
- Texas `3.1`
- New York `2.8`
- Florida `2.2`
```

## Slots

| Slot | Selector | Required | Description |
|---|---|---|---|
| `title` | `h2` | yes | Slide heading — name the geography and the takeaway (‘Where the program runs’). |
| `regions` | `ul > li` | yes | One li per region. Lead with the region name — full (`California`), postal (`CA`), or a common abbreviation (`Calif.`) — then a trailing inline-code value: `California \`4.2\``. In choropleth the value drives the ramp; in highlight it's an optional legend label. Names the basemap can't resolve surface as muted ‘?’ legend rows. |

## Variants (layout-specific)

### `highlight` — highlight

Categorical mode — each named region takes its own --catN colour and unnamed regions stay neutral. For ‘which ones’, not ‘how much’.

```markdown
<!-- _class: map highlight -->

## The four regions we serve.

- California `West`
- Texas `South`
- Illinois `Midwest`
- New York `Northeast`
```

## Universal modifiers

This layout accepts all universal variants (`dark`, `compact`, `loose`, `accent`, state markers, treatments). See [design/design-system.md §6.5](../../../../design/design-system.md#65-universal-variants--three-tiers) for the catalog.

## Related components

- [`progress`](../../chart/progress/progress.docs.md) — the regions are really a ranking — labelled bars compare magnitudes faster than shades
- [`stats`](../../evidence/stats/stats.docs.md) — a few headline figures with no geography to place them on
- [`piechart`](../../chart/piechart/piechart.docs.md) — regional shares of a single whole rather than a value per place
- [`image`](../../imagery/image/image.docs.md) — the geography needs detail (counties, cities, routes) the states basemap can't draw

## Demo deck

See [map.gallery.light.pdf](./map.gallery.light.pdf) for rendered examples of every variant.
