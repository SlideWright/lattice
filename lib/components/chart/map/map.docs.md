# map

> A US-states or world-countries basemap that fills regions by value (choropleth) or category (highlight) so the audience leaves knowing where.

**Function** evidence · **Form** spatial · **Substance** series

**Tags** `metric` · `proportion` · `overview` · `visual`

Use when the story is geographic — program reach, service territories, where the grants landed, the pilot states, the regions you operate in. Author a value per named region (full name, postal/ISO code, or a common alias); choropleth shades each region on a single-hue ramp (low→high), while `highlight` gives each named region its own categorical colour. Add `world` for the country basemap, where you can also name a continent, a bloc (`European Union`, `ASEAN`), or a stated category (`Global South`, `Global North`, `Global South — Africa`) and the kernel fills every member. Because the term is contested, two sourced views of the Global South ship: `Global South` (G77 + China) and `Global South — Brandt Line` (the 1980 North–South divide) — pick the framing your deck argues. Regions the basemap can't match are reported in the legend, never silently dropped.

## When to use

- **The story is geographic.** Reach for a map only when WHERE is the point — coverage areas, jurisdictions, service territories, where the grants or pilots landed. If the geography is incidental and the comparison is really between named things, a `progress` or `stats` row reads faster than a basemap.
- **Choropleth for magnitude, highlight for membership.** Use the default choropleth when each region carries a number and the audience needs the gradient — how much, where. Use `highlight` when the named regions are a set (the eight pilot states, the four regions we serve) and there is no magnitude to rank.
- **Name regions any common way.** Full name, postal code, or a usual abbreviation all resolve case-insensitively (`California` / `CA` / `Calif.`). A name the basemap can't bind is reported as a muted ‘?’ row in the legend and stamped on the figure — fix the spelling, don't ignore the gap.

## When NOT to use

- **A map as decoration.** If the regions aren't the comparison — you just want a US-shaped graphic behind some numbers — drop the basemap. An `image` scrim or a `stats` row carries headline figures without implying the geography is the message.
- **Too many shades to read.** A choropleth past a dozen distinct values asks the eye to rank colours it can't separate. Bucket the values, switch to `highlight` for a categorical read, or lead with a `progress` ranking and keep the map as support.
- **Sub-region precision the basemap doesn't have.** The basemaps draw US states and world countries — not counties, districts, sub-national regions, or city pins, and the world cut (110m) omits the smallest city-states. If the story lives below that line, a labelled `image` of the real map serves better than forcing it onto the basemap.

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
| `regions` | `ul > li` | yes | One li per region (or group). Lead with the name — US: full (`California`), postal (`CA`), or abbreviation (`Calif.`); world: full (`Brazil`), ISO (`BR`), alias (`Burma`), or a group (`European Union`, `Sub-Saharan Africa`, `Global South`) that expands to its members — then a trailing inline-code value: `Brazil \`4.2\``. In choropleth the value drives the ramp; in highlight it's an optional legend label. Names the basemap can't resolve surface as muted ‘?’ legend rows. |

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

### `world` — world

The world-countries basemap, Equal Earth projection (area-preserving, the default — the Global South reads at its true size). Same authoring — one country per li — with ISO codes and common aliases resolving alongside full names.

```markdown
<!-- _class: map world -->

## Where our field offices operate.

- United States `42`
- Brazil `31`
- Nigeria `27`
- Kenya `24`
- India `38`
- Indonesia `19`
- Germany `22`
- Australia `12`
```

### `grouped` — grouped

On the world map, naming a continent or bloc fills every member; `grouped` clusters the legend by continent. For coverage told at bloc scale.

```markdown
<!-- _class: map world highlight grouped -->

## Coverage by economic bloc.

- European Union `Tier 1`
- ASEAN `Tier 1`
- Sub-Saharan Africa `Tier 2`
- Latin America `Tier 2`
```

### `robinson` — robinson

Swaps the default Equal Earth projection for Robinson — the familiar boardroom compromise. Same authoring; only the world basemap's shape changes. Equal Earth (default) preserves relative area; Robinson trades a little area fidelity for the silhouette many audiences expect.

```markdown
<!-- _class: map world robinson -->

## Where our field offices operate.

- United States `42`
- Brazil `31`
- Nigeria `27`
- Kenya `24`
- India `38`
- Indonesia `19`
- Germany `22`
- Australia `12`
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
