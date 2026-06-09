---
marp: true
size: 4K
theme: indaco
paginate: true
header: "Lattice · map"
---

<!-- _class: title silent -->

# Show them where.

`New component · evidence · spatial · series`

The first layout on the new **spatial** form — regions placed by real-world geography, not by a grid or an axis. Author a value per named state; the basemap fills it. For program reach, service territories, jurisdictions, and where the money landed.

---

<!-- _class: content -->

## One basemap, two reads.

A US-states map answers a geographic question two ways, and the variant picks which.

- **Choropleth** (default) shades each named state on a single-hue ramp — *how much, where*. Author the value as trailing inline-code: `- California \`48.2\``.
- **Highlight** (`map highlight`) gives each named state its own colour and leaves the rest neutral — *which ones*. For a set, not a ranking.
- Name a state any usual way — `California`, `CA`, or `Calif.` all resolve. A name the map can't place is reported in the legend, never dropped silently.

---

<!-- _class: map -->

## Where the recovery grants landed.

- California `48.2`
- Texas `36.4`
- New York `31.0`
- Florida `27.5`
- Illinois `19.3`
- Pennsylvania `17.6`
- Ohio `14.1`
- Georgia `11.8`
- Washington `9.6`

---

<!-- _class: map highlight -->

## The eight states in the pilot.

- Washington `Cohort A`
- Minnesota `Cohort A`
- Michigan `Cohort A`
- New York `Cohort A`
- Colorado `Cohort B`
- Texas `Cohort B`
- Georgia `Cohort B`
- North Carolina `Cohort B`

---

<!-- _class: map -->

## Active volunteers by chapter — postal codes work too.

- CA `1,240`
- TX `980`
- FL `760`
- NY `715`
- IL `540`
- AZ `410`
- CO `355`
- OR `290`
- ME `120`

---

<!-- _class: content -->

## What it doesn't do — yet.

The spatial form is built to grow; v1 keeps a tight, provable boundary.

- **States only.** Counties, districts, and city pins are out of scope for v1 — the form supports them later behind another basemap.
- **One country.** US states ship first (the strongest gov / public-sector fit); a `world` basemap is the next swap once the asset boundary is proven.
- **No magnitude in highlight.** If you need both *which* and *how much*, lead with choropleth and name the set in the prose.

---

<!-- _class: closing silent -->

## Geography is the argument.

`map`

When *where* is the point — coverage, reach, jurisdiction — a basemap says it in one glance that a table of state names never will. When it isn't, reach for `progress` or `stats` instead.
