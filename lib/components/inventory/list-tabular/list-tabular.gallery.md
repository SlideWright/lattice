---
marp: true
theme: indaco
paginate: true
header: "Lattice · list-tabular"
---

<!-- _class: title silent -->

# list-tabular

`Inventory · Ledger · Structure`

Hairline-ruled ledger of items — name on the left, body on the right.

---

<!-- _class: list-tabular -->
<!-- _footer: "Default · list-tabular" -->

## The five workstreams carrying the transformation.

1. Framework
   - The scoring model, the signal taxonomy, and the weights nobody quite agrees on.
   - _Two analysts · ships Q3_
2. Adoption
   - Onboarding every team to the weekly ritual and the decision log.
   - _One enablement lead · ships Q3_
3. Governance
   - The operating rhythm, the review cadence, and the escalation path.
   - _One chief of staff · ships Q4_
4. Tooling
   - The intake form, the dashboards, and the exports for the board.
   - _One PM · ships Q4_
5. Change
   - Comms, exec sponsorship, and the people who preferred the old way.
   - _One comms partner · ships Q4_


---

<!-- _class: list-tabular def -->
<!-- _footer: "Editorial (def) · list-tabular def" -->

## The four layers of the design system.

1. Function `Purpose`
   - Why the slide exists — the communication job it does. Seven families.
2. Form `Composition`
   - The spatial shape the slide takes. Eleven shapes.
3. Substance `Data`
   - The kind of content that fills the shape. Four contracts.
4. Finish `Treatment`
   - The palette, typography, and chrome applied last. Theme-controlled.


---

<!-- _class: list-tabular metric -->
<!-- _footer: "Tile (metric) · list-tabular metric" -->

## Renderer parity — current scoreboard.

1. Marp CLI build path `334 / 334`
2. lattice-emulator inline path `334 / 334`
3. marp-vscode runtime DOM path `327 / 334`
4. Cross-renderer page-count parity `pass`


---

<!-- _class: list-tabular spec -->
<!-- _footer: "Technical key (spec) · list-tabular spec" -->

## Environment flags the build path reads.

1. `LATTICE_THEME` `string`
   - Override the deck's declared theme at build time. Default: theme from front-matter.
2. `LATTICE_CACHE` `0 | 1`
   - Toggle the render helper's hash-keyed cache. Default: 1 locally, 0 on CI.
3. `LATTICE_TRACE` `0 | 1`
   - Emit per-slide transform timing to stderr. Default: 0.


---

<!-- _class: list-tabular register -->
<!-- _footer: "Tagged pill (register) · list-tabular register" -->

## Active components — release status.

1. cards-grid `stable`
2. split-brief `stable`
3. radar-chart `beta`
4. quadrant-chart `beta`
5. kanban-board `alpha`


---

<!-- _class: list-tabular def rule -->
<!-- _footer: "def + rule · list-tabular rule" -->

## The four layers of the design system.

1. Function `Purpose`
   - Why the slide exists — the communication job it does. Seven families.
2. Form `Composition`
   - The spatial shape the slide takes. Eleven shapes.
3. Substance `Data`
   - The kind of content that fills the shape. Four contracts.
4. Finish `Treatment`
   - The palette, typography, and chrome applied last. Theme-controlled.


---

<!-- _class: list-tabular metric solid -->
<!-- _footer: "metric + solid · list-tabular solid" -->

## Quarterly headline metrics.

1. Net new ARR `$4.2M`
2. Logo retention `94%`
3. Time-to-value (median) `11d`
4. Pipeline coverage `3.2x`


---

<!-- _class: list-tabular spec stacked -->
<!-- _footer: "spec + stacked · list-tabular stacked" -->

## API endpoints exposed by the deck-server.

1. `GET /decks/:id` `200 | 404`
   - Returns the rendered deck metadata, slide manifest, and signed PDF URL.
2. `POST /decks/:id/render` `202 | 409`
   - Enqueues a re-render. 409 if a render is already in flight for this deck.
3. `DELETE /decks/:id/cache` `204 | 404`
   - Evicts the cached PDF and forces a cold re-render on the next read.


---

<!-- _class: list-tabular register outline -->
<!-- _footer: "register + outline · list-tabular outline" -->

## Active components — release status.

1. cards-grid `stable`
2. split-brief `stable`
3. radar-chart `beta`
4. quadrant-chart `beta`
5. kanban-board `alpha`


---

<!-- _class: list-tabular dark -->
<!-- _footer: "Composition: dark · list-tabular dark" -->

## The five workstreams carrying the transformation.

1. Framework
   - The scoring model, the signal taxonomy, and the weights nobody quite agrees on.
   - _Two analysts · ships Q3_
2. Adoption
   - Onboarding every team to the weekly ritual and the decision log.
   - _One enablement lead · ships Q3_
3. Governance
   - The operating rhythm, the review cadence, and the escalation path.
   - _One chief of staff · ships Q4_
4. Tooling
   - The intake form, the dashboards, and the exports for the board.
   - _One PM · ships Q4_
5. Change
   - Comms, exec sponsorship, and the people who preferred the old way.
   - _One comms partner · ships Q4_


---

<!-- _class: list-tabular compact -->
<!-- _footer: "Composition: compact · list-tabular compact" -->

## The five workstreams carrying the transformation.

1. Framework
   - The scoring model, the signal taxonomy, and the weights nobody quite agrees on.
   - _Two analysts · ships Q3_
2. Adoption
   - Onboarding every team to the weekly ritual and the decision log.
   - _One enablement lead · ships Q3_
3. Governance
   - The operating rhythm, the review cadence, and the escalation path.
   - _One chief of staff · ships Q4_
4. Tooling
   - The intake form, the dashboards, and the exports for the board.
   - _One PM · ships Q4_
5. Change
   - Comms, exec sponsorship, and the people who preferred the old way.
   - _One comms partner · ships Q4_


---

<!-- _class: list-tabular accent -->
<!-- _footer: "Composition: accent · list-tabular accent" -->

## The five workstreams carrying the transformation.

1. Framework
   - The scoring model, the signal taxonomy, and the weights nobody quite agrees on.
   - _Two analysts · ships Q3_
2. Adoption
   - Onboarding every team to the weekly ritual and the decision log.
   - _One enablement lead · ships Q3_
3. Governance
   - The operating rhythm, the review cadence, and the escalation path.
   - _One chief of staff · ships Q4_
4. Tooling
   - The intake form, the dashboards, and the exports for the board.
   - _One PM · ships Q4_
5. Change
   - Comms, exec sponsorship, and the people who preferred the old way.
   - _One comms partner · ships Q4_


---

<!-- _class: list -->
<!-- _footer: "Anti-patterns · list-tabular" -->

## When NOT to reach for list-tabular.

- **Three or fewer rows.** The ledger needs density to justify its shape. For two to four items, reach for cards-stack — the rows get the room to breathe.
- **Long per-row prose.** Each row is a name plus a sentence. If the description runs two or three sentences, move to cards-stack or split across slides.
- **Stacking two primary variants.** `def`, `metric`, `spec`, and `register` are mutually exclusive. Pair each only with its secondary modifier (def+rule, metric+solid, spec+stacked, register+outline).

---

<!-- _class: closing silent -->

## See also.

`Related components`

- `glossary` — term/definition pairs with auto-derived range pill
- `cards-stack` — two or three richer items, not a ledger
- `actors` — the left column is a named person, not a key
- `list` — rows are bullets without a label-plus-description shape
