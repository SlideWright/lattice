<!-- _class: title silent -->

# comparison

`10 components`

Comparison — how two or more options differ.


---

<!-- _class: before-after -->

## What the manifest refactor produced.

- Before.
  - 35 layouts scattered across one 10,382-line lattice.css monolith. Per-layout rules grepped, not folder-located. No central metadata.
- After.
  - 45 components self-contained at lib/components, one folder each with manifest plus styles plus example plus README. Bundler concatenates per-component CSS; loader exposes the catalog via JSON.

---

<!-- _class: compare-code -->

`Before & after · Component manifest loading`

## Flat-file lookup versus folder-shape lookup.

`Before · flat file`

```js
const fs = require('node:fs');
const path = require('node:path');

function loadOne(name) {
  const p = path.join(
    __dirname, 'lib', 'components',
    `${name}.json`
  );
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const cards = loadOne('cards-grid');
```

`After · folder shape`

```js
const fs = require('node:fs');
const path = require('node:path');

function loadOne(name) {
  const p = path.join(
    __dirname, 'lib', 'components',
    name, 'manifest.json'
  );
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const cards = loadOne('cards-grid');
```

---

<!-- _class: compare-prose -->

## Two options, equal weight, head-to-head.

- First option
  - Two-sentence description of the first option, including the strongest argument for it. Equal-density prose lets the audience compare line by line.
- Second option
  - Two-sentence description of the second option, including the strongest argument for it. The `chosen` or `decision` modifier marks the verdict when one has been made.

---

<!-- _class: compare-table -->

## Where the four substance contracts come from.

| Substance | Author writes | Renderer | Output |
| --- | --- | --- | --- |
| prose | headings, paragraphs, lists | Marp markdown → semantic HTML | DOM |
| structure | nested lists with conventions | lib/*.js post-processor | DOM |
| series | tabular DSL (axes + datapoints) | chart-family kernel | SVG |
| graph | external graph language | external CLI (mmdc, future d2) | SVG |

---

<!-- _class: decision -->

## What we are doing.

- Chosen path.
  - Self-contained per-component folders at lib/components, one folder per component. Holds manifest plus styles plus optional transform plus example plus README.
- Rejected option.
  - Flat files alongside each other in lib/components. Defeats the self-contained goal and leaves transform.js scattered.

---

<!-- _class: matrix-2x2 -->

## Where each component substance lives.

- **Author-driven · DOM output.**
  - prose — headings + paragraphs
  - structure — nested lists
- **Author-driven · SVG output.**
  - series — tabular DSL
  - graph — external language
- **Data-driven · DOM output.**
  - (Lattice does not target this cell)
- **Data-driven · SVG output.**
  - chart-family kernels — radar, quadrant, piechart, gantt, kanban, progress, timeline-list

---

<!-- _class: obligation-matrix -->

## Privacy obligations across regimes — neutral grid.

| Regulation | Notice | Consent | Retention | Breach | DSAR  |
| ---------- | :----: | :-----: | :-------: | :----: | :---: |
| GDPR       | [x]    | [x]     | [x]       | [x]    | [x]   |
| CCPA/CPRA  | [x]    | [-]     | [x]       | [x]    | [x]   |
| LGPD       | [x]    | [x]     | [x]       | [x]    | [x]   |
| PIPEDA     | [x]    | [x]     | [-]       | [x]    | [-]   |
| HIPAA      | [x]    | [x]     | [x]       | [x]    | [-]   |
| GLBA       | [x]    | [-]     | [-]       | [x]    | [ ]   |

Filled = applies, half = partial, empty = exempt. Neutral ink — data first.

---

<!-- _class: redline -->

## SB-362 rewrote the opt-out link rule.

`Cal. Civ. Code §1798.135 · amendment SB-362 (2024)`

> A business that <del>collects</del> <ins>collects, sells, or shares</ins> consumers' personal information shall provide <del>two or more</del> <ins>at least one</ins> designated method for submitting requests to opt-out, <ins>including, at minimum, a clear and conspicuous link on the homepage titled "Your Privacy Choices,"</ins> for use by consumers to <del>opt out of the sale of</del> <ins>direct the business not to sell or share</ins> their personal information.

- **Why this matters.** SB-362 collapses sale and sharing into one duty and pins a uniform link title — homepage chrome and DSAR workflows both need a uniform UX.

---

<!-- _class: split-compare -->

`Decision Required`

## Build the data layer or buy it?

Both paths are viable. The difference is where we spend the next 18 months.

- Build in-house
  - Full control over schema and roadmap
  - 2–3 engineer-quarters to reach feature parity
  - Ongoing maintenance burden stays internal
- Buy + configure
  - Ship in 6 weeks, not 9 months
  - Engineering capacity redirects to product-layer features
  - Exit risk manageable — data export contractually guaranteed

> Buy the infrastructure. Build the differentiation. Revisit in 24 months.

---

<!-- _class: verdict-grid -->

## Which option meets the criteria.

- **Folder shape.**
  - [x] Self-contained per component
  - [x] Familiar pattern from other libraries
  - [x] Tests can live with their component
- **Flat files.**
  - [x] Less restructuring upfront
  - [-] Per-component grouping by filename only
  - [ ] No room for transform.js or example.md
- **Hybrid.**
  - [-] Manifest stays flat, other files in subfolder
  - [ ] Splits the component across two locations
  - [ ] Defeats the self-contained goal
