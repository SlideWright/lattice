---
marp: true
theme: indaco
paginate: true
header: "Lattice · map"
---

<!-- _class: title silent -->

# map

`Evidence · Spatial · Series`

A US-states basemap that fills regions by value (choropleth) or category (highlight) so the audience leaves knowing where.

---

<!-- _class: map -->
<!-- _footer: "Default · map" -->

## Grant dollars reached every region — unevenly.

- California `48.2`
- Texas `36.4`
- New York `31.0`
- Florida `27.5`
- Illinois `19.3`
- Ohio `14.1`
- Georgia `11.8`
- Washington `9.6`


---

<!-- _class: map highlight -->
<!-- _footer: "highlight · map highlight" -->

## The four regions we serve.

- California `West`
- Texas `South`
- Illinois `Midwest`
- New York `Northeast`


---

<!-- _class: map -->
<!-- _footer: "Stress test · map" -->

## A wide spread across fifteen states.

- California `512`
- Texas `438`
- New York `390`
- Florida `301`
- Pennsylvania `188`
- Illinois `164`
- Ohio `142`
- Georgia `121`
- North Carolina `98`
- Michigan `76`
- Arizona `54`
- Tennessee `41`
- Colorado `33`
- Oregon `22`
- Maine `9`


---

<!-- _class: map dark -->
<!-- _footer: "Composition: dark · map dark" -->

## Grant dollars reached every region — unevenly.

- California `48.2`
- Texas `36.4`
- New York `31.0`
- Florida `27.5`
- Illinois `19.3`
- Ohio `14.1`
- Georgia `11.8`
- Washington `9.6`


---

<!-- _class: map compact -->
<!-- _footer: "Composition: compact · map compact" -->

## Grant dollars reached every region — unevenly.

- California `48.2`
- Texas `36.4`
- New York `31.0`
- Florida `27.5`
- Illinois `19.3`
- Ohio `14.1`
- Georgia `11.8`
- Washington `9.6`


---

<!-- _class: map accent -->
<!-- _footer: "Composition: accent · map accent" -->

## Grant dollars reached every region — unevenly.

- California `48.2`
- Texas `36.4`
- New York `31.0`
- Florida `27.5`
- Illinois `19.3`
- Ohio `14.1`
- Georgia `11.8`
- Washington `9.6`


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · map" -->

## When NOT to reach for map.

- **A map as decoration.** If the regions aren't the comparison — you just want a US-shaped graphic behind some numbers — drop the basemap. An `image` scrim or a `stats` row carries headline figures without implying the geography is the message.
- **Too many shades to read.** A choropleth past a dozen distinct values asks the eye to rank colours it can't separate. Bucket the values, switch to `highlight` for a categorical read, or lead with a `progress` ranking and keep the map as support.
- **Sub-state precision the basemap doesn't have.** v1 draws states only — counties, districts, and city pins are out of scope. If the story lives below the state line, a labelled `image` of the real map serves better than forcing it onto a states basemap.

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `progress` — the regions are really a ranking — labelled bars compare magnitudes faster than shades
- `stats` — a few headline figures with no geography to place them on
- `piechart` — regional shares of a single whole rather than a value per place
- `image` — the geography needs detail (counties, cities, routes) the states basemap can't draw
