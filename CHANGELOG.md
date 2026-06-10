# Changelog

All notable changes to Lattice are documented here. The project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html) with one explicit
contract: **layouts and palette tokens are stable surfaces.** Breaking
changes to either are major version bumps. New layouts and new themes are
additive minor versions. Mermaid CSS overrides are internal and may change
in patch versions.

> **This file drives the release.** `## Unreleased` is the source of truth
> for the next version. `tools/changelog.js` reads its Keep-a-Changelog
> categories to pick the bump deterministically, and the release workflow
> rolls `## Unreleased` into a dated `## <version> - <date>` section:
>
> | Category in `## Unreleased` | Bump |
> |---|---|
> | `### Removed`, or any `**Breaking:**` bullet / `BREAKING CHANGE` token | **major** |
> | `### Added`, `### Changed`, `### Deprecated` | **minor** |
> | `### Fixed`, `### Security` | **patch** |
>
> Keep entries here current **as changes land** (see `CLAUDE.md`) — an empty
> `## Unreleased` means there is nothing to release. Flag a breaking change
> by leading the bullet with `**Breaking:**` so it counts as major even
> under `### Changed`.

## Unreleased

### Removed

- **Breaking: `split-brief`, `split-metric`, `split-statement`, `split-steps`,
  and `split-list` are removed** — consolidated into a single **`split-panel`**
  component (the featured-left-panel + supporting-right-zone family; they
  differed only in finish). Migrate: `split-brief` → `split-panel` (default),
  `split-metric` → `split-panel metric`, `split-statement` → `split-panel pullquote`,
  `split-steps` → `split-panel steps`, `split-list` → `split-panel watermark`.
  `split-compare` is unchanged (its right zone is a distinct 2-option grid +
  verdict). The family's `form` is corrected from `split` to `panel`. The dead
  `splitPanelCounter` marp plugin (numbered the removed `split-list`) is also
  removed. See `engineering/decisions/2026-06-07-split-family-analysis.md`.
- **Breaking: the `before-after` layout is removed.** It was `compare-prose`
  with an arrow connector and an accent ring on the second ("after") card — the
  same two-card data shape — so it is now the `transition` variant of
  `compare-prose`: migrate `<!-- _class: before-after -->` to
  `<!-- _class: compare-prose transition -->` (write Before / After as the two
  labels; `banner-tag` still composes). The shared corner-tag / banner-tag CSS
  that had been hosted in `before-after.styles.css` moved to
  `compare-prose.styles.css`; `decision` (which also uses it) is unaffected.
  Part of the layout-redundancy consolidation.
- **Breaking: the `timeline` layout is removed.** It was `list-steps` with
  lighter, shorter rows — the same ordered-steps data shape, dots-on-a-spine
  instead of step cards — so it is now the `timeline` variant of `list-steps`:
  migrate `<!-- _class: timeline -->` to `<!-- _class: list-steps timeline -->`
  (`ol` → numbered discs, `ul` → plain dots, same as before). The Mermaid
  `timeline` *diagram* type and the `regulatory-update timeline` variant are
  unaffected. Part of the layout-redundancy consolidation (see
  `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `cards-side` layout is removed.** It was `compare-prose`
  minus the comparison chrome — the same two-co-equal-card data shape (title +
  nested body) — so it is dropped with no alias. Migrate
  `<!-- _class: cards-side -->` to `<!-- _class: compare-prose -->` (identical
  authoring shape: a top-level bullet is the card title, a nested bullet carries
  the body). Part of the layout-redundancy consolidation (see
  `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `tldr` and `principles` layouts are removed.** Both were flat
  one-line-item stacks that differed from `list` only in finish, so they are now
  `list` variants: migrate `<!-- _class: tldr -->` to `<!-- _class: list takeaway -->`
  (and `tldr numbered` to `list takeaway numbered`), and `<!-- _class: principles -->`
  to `<!-- _class: list principles -->` (with `lettered` / `roman` / `bullet` still
  composing: `list principles lettered`). The authoring shape is identical (a flat
  `ul`/`ol` of single-line items). Part of the layout-redundancy consolidation
  (see `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `subtopic` layout is removed.** Its bright-canvas, centered
  sub-section break is now the `light` variant of `divider` — migrate
  `<!-- _class: subtopic -->` to `<!-- _class: divider light -->` (and
  `subtopic numbered` to `divider light numbered`). The slots are identical
  (optional inline-code eyebrow + `h2` heading); only the dark-vs-light canvas
  differed, which is what the variant now carries. Part of the layout-redundancy
  consolidation (see `engineering/decisions/2026-06-07-layout-redundancy-analysis.md`).
- **Breaking: the `cards-wide` layout is removed.** `cards-stack` now covers
  its territory — three or four full-width rows with substantial per-card
  body — so the two no longer overlap. Migrate any `<!-- _class: cards-wide -->`
  slide to `<!-- _class: cards-stack -->`; the authoring shape is identical
  (a top-level bullet is the card title, a nested bullet carries the body),
  and a fourth row fits with the `compact` modifier.

### Changed

- **`journey` and `word-cloud` folded into the chart family.** Both are now
  chart-frame members dispatched by the chart engine
  (`lib/components/chart/_chart-family/chart-family.js`) like every other
  chart, instead of standalone transformers. They render in the shared
  `.chart-frame` skeleton — eyebrow → centered `h2` → body → caption — so a
  `journey` or `word-cloud` slide now picks up the same header rule, caption
  treatment, and opt-in `.canvas` surface panel as `progress` / `radar` /
  `gantt`. `journey` also moves from the `progression` disk bucket to the
  `chart` bucket (its `function` stays `progression`); the authoring class
  names (`<!-- _class: journey -->`, `<!-- _class: word-cloud -->`) and every
  variant are unchanged. `word-cloud`'s bespoke frame-mirroring CSS (its own
  `> h2` rule and `.canvas` panel `::before`) is retired in favour of the real
  skeleton. Decks render identically across all three paths; only the visual
  framing of these two layouts changes.
- **The Drawing Board chat now styles Architect replies as they stream**, not
  only once the stream completes. Each token re-renders the accumulated reply
  through the existing zero-dependency `renderMarkdown` (no `unified`/`remark`
  added), coalesced to one paint per animation frame. A new `renderMarkdownStream`
  wrapper holds back the trailing *incomplete* construct (an open ```` ``` ````
  fence, a half-typed `` `code` `` span, a `[label](partial` link) so partial
  syntax never flashes a block that then unwraps; inline emphasis still degrades
  to literal until its closer arrives. The final render is unchanged and exact.
- **Inline code chips are now surface-aware.** The `section code` chip was a
  single context-blind rule (`--bg-alt` fill + `--accent` ink) tuned only for
  the default canvas, so it read as a glaring near-white box on dark bookends
  and the split-panel rail, vanished into `--bg-alt` cards, and went muddy on
  the key-insight panel. The chip now derives its fill and border from its own
  ink via `color-mix(currentColor)`, so it is always a subtle delta from
  whatever surface it sits on, and a new `--code-inline-fg` / `--code-inline-bg`
  / `--code-inline-border` token seam (distinct from the block-code
  `--code-bg` / `--code-text`) lets a surface or theme retune it by rebinding
  one value. The non-flipping dark islands (`title` / `divider` / `closing`
  bookends, split-panel dark rail) rebind the ink to the on-dark tier.
  **Every theme now curates `--code-inline-fg`** — an explicit, AA-audited chip
  ink per palette (light + dark), deepened toward the brand hue where the raw
  accent fell below 4.5:1 on the card wash (brina, cuoio, indaco, laguna,
  magnolia, mustard) or lifted on the dark card (burgundy); the high-contrast
  achromatic palettes keep the accent. See
  `engineering/decisions/2026-06-08-inline-code-contrast.md`.

- **The `list` component is now an equal-fill ledger.** All three registers
  (default pills, `takeaway`, `principles`) now fill the working area — each row
  takes an equal share of the slide height with its content vertically centred —
  so a slide reads edge-to-edge whether it carries three items or the layout's
  max, instead of a small block floating in the centre. Type steps up to the
  message scale (21pt; `principles` to the 30pt display register) and numbered
  counters share a centreline with their text. Existing `list` decks re-flow
  larger and fuller; no source changes needed.
- **Breaking: the `closing` and `divider` heading slot is now `h2`, not
  `h1`.** A deck has exactly one document `h1` — the `title` slide — so a
  `closing` or `divider` slide emitting a second `#` heading made every deck
  fail markdownlint's single-`h1` rule (MD025) and read as structurally
  invalid Markdown. Both layouts now style `h2` (rendered at the same
  `--fs-h1` size, so the slides look identical), and the dead `h1` rules are
  dropped. Migrate `closing`/`divider` slides from `# Heading` to
  `## Heading`; an unconverted `#` heading now renders unstyled. `title`
  keeps `h1` — it is the deck's one legitimate document heading. All shipped
  galleries, examples, and the baseline deck are converted.

- **`kpi` and `stats` no longer require `**bold**` for their numbers.** Both
  now auto-lift the parent list item's lead (the figure) into the display-type
  `<strong>` via `slotLabelLift`, so authors write `1. $2.4B` / `1. 73%`
  instead of `1. **$2.4B**` / `1. **73%**`; typing the bold is an idempotent
  no-op. **Breaking (stats only):** `stats` moves from the inline
  `1. **73%** faster close` shape to the nested shape every other slot layout
  uses — the caption is now a nested bullet:

  ```
  1. 73%
     - faster close
  ```

  The old emulator-only parse-and-rebuild into `.stats-row` is removed (marp
  and runtime already styled the raw list, so the three render paths now
  agree), and the `:has(.stats-row)` CSS fallback is gone. Migrate any
  `_class: stats` slide to the nested shape. `kpi` is unaffected — its decks
  already used the nested shape, so the de-bold is non-breaking. A new
  `number-slot-bodyless-item` lint warning flags a kpi/stats item authored
  without its nested label (the number won't render in display type). See
  `engineering/decisions/2026-06-07-slot-header-auto-lift.md`.
- **`timeline`, `list-criteria`, and `actors` no longer require `**bold**`
  markdown for their slot headers.** These layouts now auto-lift each
  top-level list item's lead text into the heading via `slotLabelLift` (the
  same mechanism `before-after`, `decision`, `statute-stack`, etc. already
  used), so authors write `1. Pilot` / `- Owns the model \`Owner\`` instead
  of `1. **Pilot**` / `- **Owns the model** \`Owner\``. Existing decks that
  still use the bold markdown render identically — the lift is idempotent,
  so `**…**` is now optional, never wrong. For `actors`, a trailing inline
  `code` actor-name pill is kept a sibling of the lifted heading so its
  right-aligned pill placement is preserved. The shipped samples, galleries,
  and per-component docs drop the bold; stale `compare-prose` / `split-list`
  doc text that told authors to write `**Label.**` is corrected to describe
  the automatic behavior.
- **The `split-brief`, `split-metric`, and `split-statement` right-panel
  titles no longer require `**bold**` either.** Same auto-lift treatment —
  their samples, skeletons, and docs drop the bold and use the nested
  `- Title` / `  - body` shape. A new author-lint rule (`split-bodyless-item`,
  also enforced on manifests) catches the one shape the lift *can't* rescue:
  a right-panel item with no nested body (inline `- Title. body` or a bare
  `- Title`), which renders as flat unhierarchied text because the lift needs
  a nested body to know where the title ends. `npm run lint:deck` now reports
  it as an error with the nested-shape fix.
- **Docs site — component search now persists, and the playground gained the
  reference's search + Group-by.** The component reference remembers your
  search term across a click-through to a component page (and the mobile
  drawer close), restoring and re-running it instead of discarding it
  (per-tab, via `sessionStorage`). The playground's component picker is now a
  searchable, groupable popover (fuzzy search + Family/Function/Substance/A–Z
  Group-by, reusing the reference's engine) in place of the long native
  `<select>`. The toolbar is slimmer: the `Insert example` / `Insert skeleton`
  buttons move into a ⚙ menu (selecting a component inserts its example; the
  menu holds *Reset to example* and *Insert blank skeleton*), and the Component
  trigger + Variant select now have a fixed footprint so a long label truncates
  instead of reflowing the bar to a new row. The toolbar is fully responsive:
  on a phone it splits into two rows — Component + Variant (labels stacked on
  top) above, Edit/Preview grouped at the left with the ⚙ at the right below —
  and the page is an app-shell flex column so the editor/preview split fills
  whatever height the bar takes. Both popovers (picker and ⚙) clamp themselves
  into the viewport so they're never clipped at a screen edge.
- **The browsable component reference is now built into the docs site as
  per-component pages.** Each component gets its own focused page
  (`/components/<bucket>/<name>/`) with a live preview that flips to an
  in-browser editor (CodeMirror — the whole sample, no scroll), a left-nav
  component tree with filter, and the full anatomy / slots / variants /
  when-why documentation — all themable live from the topbar palette and
  light/dark, like the playground. A new `/components/` index lands the
  catalog (searchable cards by name, description, or tag). The old
  single-file `dist/docs/components.html` portal is no longer generated;
  the shipped single-file references are now `dist/docs/components.md`
  (human) and `dist/docs/components.json` (agent catalog), and the
  `Components` link everywhere points at the new pages.

- **`split-compare`'s verdict is now a recommended card with a corner tag.**
  The recommendation bar was restyled from a flat full-accent band into a soft
  accent-container card (`--accent-soft` fill, accent border) with a flush
  top-left "RECOMMENDATION" corner tag (accent fill + `--on-accent` ink),
  matching the cards-grid ordered-list corner-tag pattern. The tag is the
  eye-catcher; the recommendation reads as normal body. The right column's
  bottom padding now clears the footer/pagination chrome so the card never
  bleeds into it.
- **`diagram` dark mode now renders natively per slide (dual-resolve), and the
  dark-flip CSS override layer is collapsed.** The emulator resolves the Mermaid
  `themeVariables` to the palette's *dark* branch and bakes the diagram with that
  set when its slide is dark (nearest `_class: … dark`, or a deck-wide dark
  signal) — instead of baking one light SVG and patching it with CSS. This mirrors
  the runtime, which already resolved tokens per-section via `getComputedStyle`;
  the emulator now matches it (parsing the palette CSS at build time, since mmdc
  has no live DOM). Mermaid bakes themeVariables to literal hex, so a light bake
  can't flip on a `section.dark` slide; baking the correct scheme per slide closes
  that gap natively — including Mermaid's own colour-math (edge labels, edge lines,
  arrowheads, sequence text/lines, gantt section titles, ER entity headers). With
  dark now baked correctly, the redundant dark-flip overrides in `mermaid.css` are
  removed (proven 0-pixel-identical under dual-render). ER dark improves: entity
  headers now show their brand category colour instead of a flat grey level.
  Single-scheme decks are unchanged (no second SVG); `LATTICE_MERMAID_SINGLE=1`
  forces the prior light-bake + overrides path. The only Mermaid CSS overrides
  that remain target surfaces no themeVariable controls: journey/timeline axes and
  `treeView` labels/lines (Mermaid emits literal `black`), ER crow's-foot marker
  fill, the ER zebra-row determinism pin, and mindmap branch-colour saturation.
- **`diagram` journey mood-faces get an on-brand fill; treeView reads in dark.**
  Journey faces fill with `--bg-alt` (eyes/mouth/outline stay on `--c-line`) and
  the dashed task→face connectors are restored. `treeView-beta` labels and tree
  lines now use the flipping ink/line tokens so they are legible on a dark slide.
- **`cards-stack` rebuilt on the nested-list card contract.** The title now
  renders **bold by default** (no `**…**` needed) and the nested-bullet body
  resets to normal weight — matching `cards-grid`/`cards-side`. Previously the
  title inherited body weight and the nested body rendered as a raw bulleted
  sublist. Existing `**Title.**`-wrapped slides keep rendering identically.
- **`cards-stack` supports metadata pills.** A trailing inline `` `code` `` on
  a card's title line now renders as a right-anchored pill, the same contract
  as `cards-grid`/`cards-side`. `cards-stack` graduates off the universal-pill
  deny list.
- **`cards-stack` gains a stronger `compact` modifier.** On top of the generic
  spacing shrink, `compact` now drops card body type to `--fs-body-compact` so
  a fourth card fits without crowding.

### Added

- **Drawing Board: slide-context autocomplete in the editor.** Inside a
  `<!-- _class: … -->` directive the CodeMirror editor now completes component
  names (chip-tagged by bucket) and then the modifiers legal for that component
  — its own declared variants first, the universal modifiers (`dark`, `scale-l`,
  `silent`, treatments, state markers, …) after, with already-applied tokens
  filtered out. Deterministic, offline, zero model calls: the vocabulary is the
  same compact catalog + lint vocab the Architect already lints against, so
  completion and lint agree by construction. The slide-detection logic is now a
  single shared walker (`slide-context.js`), retiring the per-feature
  backward-walkers that had drifted from the grammar. Drawing Board (docs-site)
  only.
- **Drawing Board: slot-skeleton drop-in and a per-component data-source
  registry for the editor's autocomplete.** On the empty body of a classed
  slide, completion now offers a one-shot `skeleton` that inserts the
  component's slot scaffold (its manifest skeleton with the directive line
  stripped) in the correct nesting — the anti-footgun for card-style layouts —
  as plain text, and stays inert once the slide has any content so it never
  clobbers authored body. The map region completer is now one entry in a small
  data-source registry (`data-sources.js`): each completer is gated to its
  component(s) through the shared slide detection, so adding the next
  static-vocabulary data component is a one-line registration. Deterministic,
  offline, zero model calls. Drawing Board (docs-site) only.
- **`q-and-a` — a layout for anticipated questions paired with prepared
  answers** (inventory bucket, `stack` form). The end-of-pitch "what we expect
  to be asked" slide: a few weighty defenses of a recommendation, authored as a
  nested list (`- Question?` with the answer nested one level under). Questions
  are indexed automatically (01, 02, …), so a `ul` and an `ol` render the same.
  Ships with five mutually-exclusive looks: the **editorial ledger** default
  (numbered index + accent rule), `spine` (accent nodes on a vertical spine for
  a sequential walkthrough), `rail` (numbered question/answer columns), `tab`
  (a true accent underline beneath each question), and `grid` (a two-up density
  grid split by a gradient hairline cross, each header reserving two lines so
  rows align). The universal `solo` gives one question/answer the whole slide
  and `compact` tightens the ledger for five-plus pairs; every colour is a
  light-dark() token, so all five looks invert under `dark`. Pure CSS, no
  transform. Distinct from a reference FAQ (many terse look-ups) and from
  `list-criteria` (evaluation criteria + rationale) — q-and-a defends a
  recommendation.
- **Drawing Board: each cloud Architect reply is labelled with the model that
  produced it** — the bubble heading reads "The Architect (DeepSeek V4 Pro)", using
  *our* record of the model we sent the turn to, not the model's self-report (which
  is unreliable — models routinely misname themselves, and a prior identity claim in
  the history gets parroted forward). The label is captured per-message and
  persisted, so older replies keep the model that made them and a mid-conversation
  model switch is visibly applied on the next reply. Drawing Board (docs-site) only.
- **Drawing Board: an OpenRouter model picker accordion, prompt-caching control,
  and standing instructions.** The cramped native model `<select>` (300+ rows) is
  replaced by an in-place accordion in the Cloud AI settings section: collapsed it
  shows the current model + price with a "Tap to change model" hint; expanded it
  offers search, **Featured / Value / Free / All** filter tabs, and a
  vendor-grouped, priced list. (Value = a curated set of strong cost-effective
  models; Free = the catalog's $0 rows.) A
  **Prompt caching** switch lets the user opt out of the cached-prefix billing and
  is gated per-model (disabled with "Not supported by this model" for vendors that
  don't support it). A **Standing instructions** box (≤500 words) is appended to the
  Architect's cached prompt prefix and honored on every turn. Drawing Board
  (docs-site) only.
- **`map` component — a US-states basemap that fills regions by value or
  category** (`evidence · spatial · series`, `chart` bucket), the first layout
  on the new **`spatial`** form. For geographic stories — program reach,
  service territories, jurisdictions, where the grants landed (the gov /
  public-sector and nonprofit archetypes a flat `image` couldn't serve).
  Author one li per region with a trailing inline-code value
  (`- California \`48.2\``); region names resolve case- and
  punctuation-insensitively by full name, postal code, or common abbreviation
  (`California` / `CA` / `Calif.`). Two read modes: **choropleth** (default)
  shades each named region on a single-hue ramp off `--cat1-hue` (low→high),
  anchored on the neutral base so a low value never sinks below an empty region
  on a dark canvas; **highlight** (`map highlight`) gives each named region its
  own `--catN` slot and leaves the rest neutral, for membership rather than
  magnitude. Names the basemap can't place are reported — a muted legend row
  plus a `data-unmatched` attribute on the figure — never silently dropped.
  The basemaps are baked, pre-projected SVG path data generated from
  public-domain geodata via `tools/build-basemap.js` (no geo library ships):
  **US states** (d3.geoAlbersUsa, AK/HI insets, US Census boundaries) and
  **world countries** (`map world`, Natural Earth 110m). They inline into the
  emulator/runtime JS bundles, never into `dist/lattice.css`, preserving the
  zero-fetch contract (the world basemaps are the catalog's largest asset — each
  projection lifts the minified runtime/emulator bundles by ~70 KB of
  well-compressed path data). New chart-family kernel module
  (`map.transform.js`) wired through the single dispatcher, so it reaches all
  three render paths via the registry. Adds the 12th `form` (`spatial`) to the
  taxonomy (`design-system.md` §4, the schema + `index.js` enums).
  - **Regional / continental grouping** (world). A group name is a "fat alias"
    that expands to a set of member countries: name a continent
    (`North America`), a UN subregion (`Sub-Saharan Africa`), a curated
    composite (`Latin America`, `Middle East`), or a dated economic bloc
    (`European Union`, `ASEAN`, `G20`, `BRICS`, `OECD`) and the kernel fills
    every member — in choropleth (one value across the bloc) or highlight (one
    colour per bloc). Blocs carry an `asOf` year; **Global South / Global North**
    ship as first-class categories pinned to a stated, dated definition — South
    to the UN Group of 77 + China (the standard UN / UNCTAD operationalization),
    North to the developed economies — carrying the same `source` + `asOf`
    provenance as the blocs, plus per-continent slices of the South
    (`global-south-africa`, `global-south-asia`, `global-south-south-america`, …).
    "Global South" is contested, so rather than pick one definition the engine
    ships the **two most-recognized views** as distinct, sourced groups and lets
    the author choose: `global-south` (G77 + China, the default) and
    `global-south-brandt` (the 1980 Brandt-Report North–South line, built as the
    geographic complement — sweeps in Mexico / Turkey / the Koreas / Taiwan,
    files the former-Soviet Central-Asian states under the North). Shipping
    sourced, dated rosters is the transparent call: the definition travels with
    the data and an author can cite it, instead of every deck hand-rolling an
    undocumented ~130-country list. States in neither list (Russia, the
    post-Soviet / Balkan economies, disputed territories) belong to no `global-*`
    group. The `grouped` modifier clusters the legend by continent.
  - **Two world projections** (world). The default is **Equal Earth** — the
    area-preserving pseudocylindrical (Šavrič et al., 2018), so the Global South
    reads at its true size instead of the high-latitude inflation Robinson and
    Mercator introduce. **Robinson** ships as the `robinson` variant
    (`map world robinson`) for audiences who expect the familiar boardroom
    silhouette. Both are baked offline into sibling JSONs
    (`map.basemap.world.json` + `map.basemap.world-robinson.json`) — still no geo
    library in any bundle.
  - **The world is the default basemap.** Bare `map` is a world map (Equal
    Earth); `map us` (alias `map usa`) selects the US-states basemap. The tokens
    sit on orthogonal axes the manifest now models explicitly (a new
    `variantAxes` field): a **Basemap** axis (`us` · `world`) and a **Modifier**
    axis (`highlight` · `robinson` · `grouped`), so the docs / gallery / variant
    chips present them as composing axes, not a flat peer list. They already
    compose in any order (`map us highlight`, `map world robinson highlight`).
    Myanmar, Czechia) and a typo is a silent gap, so the static basemap
    vocabulary drives two deterministic, zero-token defences: a **CodeMirror
    autocomplete** that completes region + group names as you type a `map` list
    item (Drawing Board / playground editor), and a **"did you mean" lint rule**
    (`unknown-map-region`, in the shared `lint-core.js`) that flags an
    unresolved name with the nearest match (`Brasil` → `Brazil`) in both the
    CLI and the in-browser Architect.
  - v1 draws US states + world countries — not counties, districts, or city
    pins (and the world 110m cut omits the smallest city-states). Demo deck:
    `examples/map.md`.
- **`funnel` component — a tapering stage chart showing where a flow drops
  off** (`evidence · canvas · series`, `chart` bucket). For any narrowing
  pipeline — sales / conversion funnel, hiring pipeline, grant / donor
  pipeline. Author one li per stage in flow order with a trailing inline-code
  value (`- Signups \`4,800\``); the kernel draws centred trapezoid bands
  (width ∝ value), flanks each with its label and value, and prints the
  stage-to-stage conversion % in the gaps. Each stage takes a distinct hue
  from the categorical chart palette, rotating `--catN` exactly like the
  piechart wedges — so the colours are on-brand per theme (cuoio's curated
  earth pigments, etc.) and a funnel reads like the rest of the chart family.
  Labels and values sit on the canvas, so the fills never affect text contrast.
  New chart-family kernel module (`funnel.transform.js`) wired through the
  single dispatcher, so it reaches all three render paths via the registry with
  no per-renderer code. Demo deck: `examples/funnel.md`.
- **`pricing` component — plan tiers with prices, feature checklists, and one
  recommended column** (`comparison · grid · structure`). The plans / packages
  slide for commercial (sales, product launch), membership / fundraising
  (giving tiers), and procurement (RFP cost options) decks. Author one li per
  tier: a plain name (auto-bold), a trailing inline-code price (`$49 / mo`,
  `Custom`), an optional `*Most popular*` marker that renders as a ribbon and
  elevates the card, then nested `[x]` (included) / `[/]` (not, struck through)
  / `[-]` (limited) feature rows and a marker-less "who it's for" line.
  Variants `two` / `four` adjust the column count. Shares verdict-grid's badge
  machinery (the `[x]`/`[-]`/`[ ]`/`[/]` → badge transform now also fires on
  `.pricing` in all three render paths). Demo deck: `examples/pricing.md`.
- **`logo-wall` component — a grid of customer / partner / funder marks as
  social proof** (`inventory · grid · prose`). The credibility slide every
  go-to-market and mission-driven deck reaches for — *trusted by* (corporate),
  *our funders* (nonprofit), *participating agencies* (government). Author a
  bulleted list of inline images (`- ![Brand](brand.svg)`); marks render
  desaturated and uniform (the same grayscale treatment as the corner deck
  logo) so mismatched brand colours don't fight. Variants: `color` (keep brand
  hues for insignia / crests), `dense` (six columns for a longer roster).
  Pure CSS — no transform. Demo deck: `examples/logo-wall.md`.
- **The emulator now renders inline content images (`![alt](url)`).** Previously
  `lattice-emulator.js` only handled block-level `![bg …]` backgrounds, so an
  in-flow image rendered as literal markdown text; it now parses inline images
  to `<img>`, matching marp-core (the marp-cli and runtime paths already did
  this natively). Unblocks image-in-prose components such as `logo-wall`.
- **Drawing Board Converse adds OpenRouter as a second cloud AI tier.**
  Alongside Puter (free, user-pays, no key), the Architect can now Converse
  through the user's own OpenRouter account via one-click OAuth (PKCE — no key
  to paste, no backend). Side-by-side "Connect" buttons in Converse let the user
  pick either; the settings popover adds a Cloud AI section with a model picker
  (500+ models, live per-million pricing) and Disconnect. Puter stays the default
  cloud — when both are connected an active-cloud preference decides, defaulting
  to the proven tier. OpenRouter is OpenAI-compatible and streams; it's treated
  as a capable tier (full Lattice dossier + edit protocol), same as Puter/WebLLM.
  On the OpenRouter (Anthropic) path the static prompt prefix — persona + the
  Lattice primer + the edit protocol, ~10K tokens identical every turn — carries
  an `ephemeral` prompt-cache breakpoint (1-hour TTL, so it survives think-gaps
  across an authoring session rather than expiring after the default 5 minutes),
  so repeat turns bill that slice at ~10%
  instead of in full; only the per-deck score/findings/deck tail is re-read. The
  flattened (uncached) prompt other backends receive is byte-identical, so their
  behaviour is unchanged. Docs-site only — no engine render-path change.
- **`--accent-soft-body` token completes the soft accent-container vocabulary.**
  Soft accent surfaces (`--accent-soft` fill) now have a named body-text token
  alongside `--on-accent-soft` (emphasis/border) — it derives from `--text-body`
  (a pale tint takes canvas ink), so there's a single override seam and no new
  curated colour. `featured` consumes it. The accent-container ink-contract test
  now also guards `--accent-soft` fills against light-only inks (`--on-dark*` /
  bare white), so both the bold and soft containers are enforced.

- **Five opt-in checkbox style variants (`checks-ringed` *(default)*,
  `checks-knockout`, `checks-bold`, `checks-outline`, `checks-tonal`).** A
  universal section modifier (per-slide or per-deck) that switches the
  state-token disc treatment for `checklist` / `verdict-grid` /
  `obligation-matrix` without changing the marks or status colours. Each
  variant flips only scalar CSS knobs (`--state-fill-pct`, `--state-ring-*`,
  `--state-mark-pct`, `--state-disc-scale`) at section scope; the leaf disc
  mixes the real colours from `--state-color` + `--bg`, so variants stay
  theme-aware. The default, **Ringed Solid**, adds a hairline darker ring so a
  disc stays crisp on its own status-tinted row.
- **State-token mark tokens (`--mark-check`, `--mark-dash`, `--mark-x`,
  `--mark-slash`, plus `-bold` set) and disc-recipe knob tokens.** SVG-mask
  marks + the scalar knobs that drive the redesigned checkbox discs, in
  `lib/base/base.tokens.css`.
- **Universal pill structure tokens (`--pill-radius`, `--pill-pad-y`,
  `--pill-pad-x`, `--pill-font`, `--pill-fs`, `--pill-weight`,
  `--pill-tracking`).** A single structural contract for every status /
  metadata pill, defined in `lib/base/base.tokens.css`. Padding is em-based
  so a pill's box tracks its own text size and still scales HD → 4K. Colour
  stays per-pill via the existing `--pill-fg` / `--pill-bg` / `--pill-border`
  hooks — structure is universal, colour carries the semantics.
- **`--text-secondary` — an independent, on-brand, light/dark token for
  secondary content text.** Subtitles, eyebrows, captions, table headers,
  sub-labels and attributions previously borrowed the decorative
  `--text-muted` chrome token; they now ride a dedicated `light-dark()` pair
  curated from each theme's own ink, tuned to WCAG AA (≥4.5:1) on **both**
  the light and dark canvas across all 13 palettes (verified by
  `tools/contrast-audit.js` and a new unit gate,
  `test/unit/palette/structural-text-contrast.test.js`). Themes also gain
  `--dark-text-secondary`. The token is now part of the required-core-token
  contract (`tools/check-ownership.js`) and the `new:theme` scaffold.
- **Contrast audit now covers the secondary/label tiers and translucent
  on-dark ink.** `tools/contrast-audit.js` checks `--text-secondary` and
  `--text-label` on canvas and composites the `--on-dark-*` ramp over
  `--bg-dark` (it previously could not grade `color-mix(... transparent)`
  and had no subtitle/secondary pair at all).
- **Per-theme structural-text showcase decks** under
  `examples/token-contrast/` — one deck per palette exercising every
  affected element in both light and dark canvas modes.
- **Minified `.min` variants of every shipped CSS and JS artifact, with named
  export subpaths.** `dist/` now also carries `lattice.min.css`,
  `lattice-default.min.css`, `lattice-runtime.min.js`, and
  `lattice-emulator.min.js`, reachable via `@slidewright/lattice/css/min`,
  `/default/min`, `/runtime/min`, and `/min` respectively. The CSS minifier
  preserves Marp's `@theme`/`@size` directive comments, so a minified bundle
  still registers as a theme — the `.min` files are render-faithful to their
  unminified siblings (verified: a minified-vs-unminified render diff is
  smaller than two identical renders of the same source). Use the unminified
  files for debugging (source maps / comments) and the `.min` files for
  production / CDN delivery; the package `bin`/`main` stays the unminified
  emulator. Each build generator now emits both variants behind the same
  `build:check` freshness gate.

### Changed

- **State markers (`[x]`/`[-]`/`[ ]`/`[/]`) redesigned as colour + a distinct
  in-disc mark.** Across `checklist`, `verdict-grid`, and `obligation-matrix`
  every state is now the same status-coloured circle carrying a unique mark —
  **check / dash / x / slash** — replacing the old fill-level discs
  (filled / half / outline / slashed) and the layout-specific Unicode glyphs.
  The mark *shape* carries the meaning independently of colour, so the states
  are unambiguous in greyscale and for colour-vision-deficient viewers — the
  redundant encoding the fill-level discs lacked. Marks are font-independent
  SVG masks painted in theme tokens (knockout = `--bg`; disc = `--pass` /
  `--warn` / `--fail` / `--text-muted`), so they stay theme- and dark-mode
  aware, and `.heat` still composes. Authoring is unchanged (same markers,
  same classes); only the CSS that those classes paint changed, so the three
  render paths and page counts are unaffected. `roadmap` keeps its own dot
  vocabulary (its `planned` state is "future," not "fail") and is unchanged.
- **Every pill now shares one geometry.** The ordinary status/metadata pills
  across layouts — the universal trailing-code pill, verdict-grid badges,
  kpi, glossary range-pill, cards-grid / cards-side, obligation-matrix,
  regulatory-update (status / timeline / priority), statute-stack, and
  state-chart chips — are unified to the `--pill-*` structural tokens:
  consistent proportional padding, fully-rounded radius, and centre- /
  middle-aligned text via `inline-flex`. Pills now use the **body sans**
  (Outfit), not mono — a pill is a status / label chip, not code (mono was
  only inherited from the original trailing-`code` pill), and the sans also
  fixes vertical centring at the root: JetBrains Mono's metrics seated caps
  high in a flex-centred line box, while the sans lands them centred with no
  optical nudge. The genuinely identifier-like chips (legal citations etc.)
  are not pills and keep their own mono. Hardcoded `px` padding (glossary,
  state-chart) and the stray `9999px` radius (list-tabular) are gone, and the
  `600`/`700` font-weight split resolves to `--pill-weight`. Three pills stay
  as **sanctioned variants** that deliberately override specific axes —
  chart-status (bar-matching semi-round + gradient), list-tabular `register`
  (wide stamp), redline `.annotated` (footnote superscript / positioned
  counter) — but route everything non-deliberate through the same tokens.
  Pill colours and semantics are unchanged.
- **`--text-muted` is now decorative-only and a `light-dark()` pair.** It is
  reserved for genuinely decorative / de-emphasized marks — chrome
  (pagination/header/footer), empty-cell dashes, skipped/struck state, quote
  glyphs, code comments (DECORATIVE, WCAG-exempt) — and now carries a
  dark-canvas side (wiring in the previously orphaned `--dark-text-muted`).
  Every readable content role that used to borrow it (41 sites across 23
  files) was repointed to `--text-secondary`. `--text-label` was retuned to clear AA on canvas in the
  two themes where it sat just below (atelier, mustard). Decks that referenced
  `--text-muted` only through Lattice components are unaffected; a deck that
  hard-coded `var(--text-muted)` for body-adjacent *content* text should
  switch to `var(--text-secondary)`.
- **Chart-family fills now share one canvas-aware recipe, and warm hues no
  longer mud on the dark canvas.** kanban cards, gantt bars, progress fills,
  and state-chart nodes paint from a single shared fill recipe (the `--fill-*`
  hue/ink pair + a 1px hue-tint border + a vivid left accent). On dark the wash
  now mixes the hue toward `black` rather than the navy `--bg` (mirroring
  `--state-*-fill`), so amber / gold / red fills stay true instead of turning
  muddy. Two members specialize the geometry: **state-chart nodes are now
  neutral slate tiles** with the status carried entirely by the pill — a green
  "on-track" node no longer sits behind a green pill (no blend, and green keeps
  its one semantic), matching the kanban card ↔ pill relationship; and
  **progress bars now encode magnitude in the fill** — a horizontal gradient
  that "shoots forward" from a pale/dark origin to a saturated leading-edge head
  whose intensity scales with the percentage, with the track rail dropped so
  each bar floats like a gantt tile and the `%` readout riding the leading edge.
- **The categorical charts and the status pill now darken toward black too —
  completing the dark-mud fix.** The earlier pass moved the status/value *bar*
  fills off the navy `--bg`; this extends the same rule to the last fills that
  still mudded: the **pie wedge** and **quadrant zone** SVG gradients (which mix
  `--catN-hue` inline) now mix toward a new `--chart-cat-base` token —
  `light-dark(var(--bg), black)` — so on dark every category stays hue-true (a
  warm wedge reads gold, not brown) while the light canvas is unchanged. The
  shared **status pill** gradient and the `--catN-fill` token (quadrant dots,
  word-cloud) gain the same canvas-aware toward-black dark side. Net: quadrant
  zones, pie wedges, gantt/progress bars, kanban cards, and status pills all
  darken the one way on the dark canvas.
- **cuoio ships a curated chart palette — the first theme to flavour the
  chart family.** cuoio's charts no longer inherit the engine's default
  Apple-hue spectrum (which read as "indaco's charts" on the warm canvas);
  they now use cuoio's own earth pigments through the `--chart-catN` /
  `--chart-state-*` override hooks. Categorical colour adopts the palette
  audit's top-scored "Brand triad" set — the same `--cN` pigments cuoio's
  Mermaid diagrams use, so a pie and a flowchart read as one palette; status
  colour reuses cuoio's `--pass` / `--warn` / `--fail` so a gantt at-risk bar
  matches a `--warn` chip. See `design/theming.md` and `themes/palette-audit.md`.
- **onyx curates its charts around a slate · red · green triad.** onyx stays
  achromatic in its *chrome* (ink ramp, brand axis, mermaid, code) but its
  *charts* now carry a restrained three-colour identity — the signature red
  plus a slate and a green — over a grayscale value tail, so colour does the
  separating where it earns legibility (pie wedges, status) instead of every
  category collapsing to a gray. `--chart-cat*` leads red → slate → green →
  near-black → grays → olive; `--chart-state-*` draws from the same hues
  (pass = green, fail = the signature red, info = slate, warn = olive, mute =
  gray) so categorical and status read as one palette and a gantt at-risk bar
  matches a warn pill. Fills sit at the engine's readable depth, so the
  `--text-heading` label reads directly on every fill — measured ≥ 8:1 on both
  canvases — with no glow or plate behind the text. onyx-only; cuoio, indaco,
  and the shared engine are untouched.
- **indaco curates its charts around its cool blue-led spectrum — bringing all
  three flagship themes to one standard.** indaco now flavours the chart family
  with its own pigments instead of the engine default: `--chart-cat*` rides its
  blue-led spectrum (blue · rust · green · magenta · purple · teal · gold · cyan,
  ported from indaco's `--cN` pigments so a pie and a flowchart match), and
  `--chart-state-*` reuses indaco's living palette (`--pass`, brand blue,
  `--text-muted`) — porting its gold to a saddle-amber `warn` and curating a new
  cool **crimson** `fail`, since indaco's palette had no red. AA-verified both
  canvases. **cuoio, onyx, and indaco are now the three curated exemplars**; the
  remaining themes inherit the engine default until brought up to the same
  standard — the curation recipe and checklist live in
  `lib/components/chart/_chart-family/chart-family.style.md`.
- **Pie wedges return to the radial dome finish, shared with the quadrant.** The
  two solid-area charts (pie, quadrant) now use the *same* hub→rim area-fade
  (42/58/82 toward `--chart-cat-base`), so they read as one family — a centre-out
  fade for charts that radiate from a centre, distinct from the bar family's
  vertical wash. The flatter top→bottom wash prototyped earlier is retained as a
  documented **future variant** (see `chart-family.style.md` › "Fill finish").

### Fixed

- **`list-tabular`'s authoring skeleton no longer teaches a removed inline format.**
  Its `skeleton` (the scaffolder template, the docs "Authoring" block, and the
  Converse dossier's base) still showed the retired `- **Name.** description`
  ledger form — dead authoring that survived only because `list-tabular` isn't a
  card-style layout, so the inline-bold lint gate never fired on it. The skeleton
  and the `rows` slot contract now match the numbered/nested form the layout
  actually renders (and that its own `sample` and variants already use):
  `1. Name` + an optional nested `- description` row. Regenerates
  `dist/docs/components.{md,json}`.
- **Map region autocomplete now defaults to the world basemap.** The editor's
  `map` region completer inverted the component's default — a bare
  `<!-- _class: map -->` (a world map) offered US states, so every country and
  group (Global South, blocs, continents) was unreachable unless the author
  typed a redundant `world` token `map.docs.md` tells them to omit. It now
  matches the grammar: world by default, US states only on `map us` / `map usa`.
  Drawing Board (docs-site) only.
- **Drawing Board drawer close buttons are right-aligned again.** The flex
  spacer that pushes the `×` to the end of a drawer head was scoped to
  `.db-panel-head` only, so inside the Settings and Decks drawers
  (`.db-drawer-head`) it collapsed and the close button jammed against the
  title. The `.db-spacer` grow rule is now unscoped (a spacer grows in any
  flex row). Drawing Board (docs-site) only.
- **OpenRouter model picker no longer shows `$-1000000.000/M` for
  variable-priced models.** OpenRouter reports a `-1` sentinel for router/auto
  and other variable-priced rows; the picker multiplied it into a nonsense
  per-million figure. Pricing now parses through `orPricePerM`, which maps any
  negative/missing/non-numeric value to “no fixed price” (the option reads
  “pricing varies”) while keeping `0` as a genuine free model. Drawing Board only.
- **Mid-sentence inline code is no longer mis-promoted to a metadata pill.**
  The universal pill rule matched `code:has(+ :is(ul, ol))`, but the `+`
  combinator skips text nodes, so a mid-sentence reference on a row that merely
  had a nested list (`- The \`--accent\` token does X\n  - detail`) was styled
  as a pill. A new `pill-tag` transformer (shared across marp-cli, emulator,
  and runtime) tags only the genuine trailing-`code`-before-a-nested-list case
  with `.lat-pill`, and the CSS arm now matches that class; the `:last-child`
  pill (a truly trailing `code`) is unchanged. See
  `engineering/decisions/2026-06-08-inline-code-contrast.md`.

- **Docs site search boxes no longer trigger iOS Safari's focus-zoom.** The
  playground component search, the component-reference search, and the Group-by
  selects were below the 16px threshold that makes iOS zoom the page on focus;
  they now bump to 16px on coarse pointers (matching the editor textarea), so
  tapping search keeps the layout put.
- **Docs playground no longer renders `math` slides tiny + jittering.** The
  playground renders `inlineSVG:false` (bare `<section>`, no
  `<svg><foreignObject>` wrapper), and `section{container-type:size}` collapses
  a section that has no explicit box — so cqi/cqh-based layouts (notably
  `math.matrix` / `math.compare`) shrank to an unreadable size and visibly
  re-scaled as the KaTeX stylesheet streamed in async. `writeFrame` now pins
  each slide to its intrinsic 1280×720 (matching the specimen renderer), giving
  container queries a definite box and making the fit-to-width scale
  deterministic. PDFs were never affected.

- **Accent-filled surfaces now stay legible on pale-accent palettes.** Text on
  `var(--accent)` fills was reaching for a fixed light ink (`--on-dark*` /
  hardcoded `#fff`), which vanished whenever a theme's accent is pale (every
  palette's dark mode, plus achromatic palettes like concrete/atelier/ardesia).
  - The `--on-accent` muted tiers (`-secondary` / `-ghost` / `-watermark`) now
    **derive from each theme's curated `--on-accent`** by opacity instead of
    re-deriving from white, so the whole rail inherits the per-theme contrast
    tuning and overriding `--on-accent` alone carries the rest.
  - `split-compare` verdict (recommendation) bar, `split-list` panel heading +
    slide header/footer, and the `pinned` corner tag now read the accent pair
    instead of a light-on-dark ink.
  - The docs site projects `--on-accent` per palette/mode; the landing **Try it
    in your browser** CTA and the playground **Preview** toggle now use it, so
    their label no longer disappears on a pale accent.
- **Layout audit — T6 hex-fallback hygiene (audit round 2).**
  - `cards-grid`, `cards-side`, `cards-stack`, `split-list`, `timeline`:
    numbered-badge `::before` color changed from `var(--on-accent, var(--on-dark-primary, #fff))`
    to `var(--on-accent, var(--on-dark-primary))` — drops the `#fff` literal floor so the
    fallback chain bottoms out in a palette token.
  - `before-after` / `decision` / `compare-prose` corner-tag (flush + banner-tag variants):
    `before-after` / `banner-tag.before-after` label text changed from
    `var(--on-accent, var(--on-dark-primary, #fff))` → `var(--on-accent, var(--on-dark-primary))`.
    `decision` corner tags changed from `var(--on-cat, #fff)` → `var(--c-ink-dark)`:
    `--on-cat` is undefined (always resolved to `#fff`); `--c-ink-dark` (white on light,
    near-black on dark) is the correct text token for fills backed by `--cN-dark`
    (which are saturated on light canvas, pale on dark canvas).

- **Layout audit — T4 SVG chart label sizes (audit round 2).**
  - `radar`: axis labels raised from `9px` (≈6.4pt) to `11px` and tick marks from
    `6.5px` (≈4.6pt) to `9px` via scoped `--radar-axis-label-size` / `--radar-tick-size`
    custom properties with a bypass comment explaining SVG-unit sizing. Tick
    `font-weight` raised from 500→600 (matching the cover-variant's existing lift)
    so the faint sub-token-size ring labels get extra stroke weight.
  - `quadrant`: axis name raised from `11px` to `12px` and tick labels from `8px`
    (≈5.7pt) to `10px` via scoped `--quadrant-axis-size` / `--quadrant-tick-size`
    custom properties with bypass comment.

- **Layout audit — T5 dark-mode contrast fixes (audit round 2).**
  - `journey`: section-bar labels (`--journey-section-fg`) were `var(--on-accent)`,
    which flips to `--bg-dark` (navy) in dark mode — near-zero contrast against the
    dark bar. Changed to `var(--on-dark-primary)` (always-light token) for legible
    labels on both canvases.
  - `journey`: mood-legend numbers were `0.78125cqi` + `opacity:0.65` — compounded
    sub-token size and opacity fade made the 1–5 scale illegible. Raised to
    `var(--fs-meta)` (11.25pt) and `opacity:0.85`.
  - `journey`: hex `#fff` fallback on actor-dot color replaced with token floor
    `var(--on-dark-primary)`.
  - `agenda`: past rows at `opacity:0.4` on a dark canvas are near-invisible,
    flattening the past/active/future three-state hierarchy. Added a `section.dark`
    scoped bump: past rows → `0.55`, future rows → `0.65`, preserving the hierarchy
    while meeting minimum legibility.
  - `word-cloud`: dark-mode palette routed to `--catN-hue` (full-saturation
    categorical hues) by overriding `--catN-ink` tokens within `section.dark.word-cloud`.
    Previously `--catN-ink` dark branch was `color-mix(hue 78%, white)` which reads
    as pastel against navy; now the direct hue tokens give an analytical, vivid palette.
  - `compare-code`: column labels (`BEFORE`, `AFTER`) used `--text-label` which in dark
    mode drifts to a pale muted value, losing the accent-color signal that identifies
    each column. Changed to `var(--accent)`, which stays vivid in both themes and
    both canvases.

- **Layout audit — cross-component consistency (audit T-misc).** `stats` metric
  numbers now use the display serif (`--font-display`), matching `big-number` /
  `kpi` / `split-metric` (they were the lone sans outlier); `split-compare`'s
  preferred-option marker is now `✧`, matching `verdict-grid`'s focal glyph.
- **Layout audit — round 1 of fixes (anatomy, contracts, P0 render bugs).**
  - `kpi`: the running header overprinted the eyebrow on every slide with an
    `### eyebrow` (the section `padding-top` coincided with the absolute
    header's `top`); content now clears the header band.
  - `closing`: the heading styling targeted `h2` while the slot is `h1`, so the
    bookend lost its centering / max-width and the eyebrow rendered below the
    heading. Now mirrors `title` (centered hero `h1`, eyebrow reordered above).
  - `content`: stopped top-aligning (dead lower half) — now vertically centred —
    and capped paragraph/list line length so prose doesn't run ~90 chars wide.
  - `actors`: a 5-row roster clipped its last row off the slide bottom
    (`justify-content:center`); rows now top-align and stay on-canvas.
  - `list-tabular` `spec` / `spec+stacked`: the key name and the type both
    landed in one grid cell (overlapping glyphs) and overflowed the right edge;
    the key now sits in the name column, the type in the trailing column, and
    long mono keys/API paths wrap inside their cell.
  - `tldr` `numbered`: an inline `code` span in a takeaway fragmented the line
    across rows (grid blockified it); the counter is now a hanging indent so the
    takeaway flows as one line.
  - `piechart`: the disc was locked at `25cqi` and floated small in dead space;
    enlarged to `32cqi` (`36cqi` under `cover`) so the proportions read.
  - `redline` `three-col` / `split`: a long clause clipped mid-word; the content
    row is now `minmax(0,1fr)` with an overflow guard so it stays on-slide.
  - `citation-card`: the base "KEY INSIGHT" blockquote chrome contaminated its
    verbatim-quote panel on every non-pull-quote variant (light + dark) —
    citation-card is now excluded from that rule (it styles its own
    blockquote); the `pull-quote` watermark glyph was sunk behind the canvas
    (`z-index:-1`) and is now a visible watermark; and the `triptych` sample
    only supplied one gloss item so it rendered two panels — it now carries the
    translate + obligation items the three-panel layout expects.
  - **`diagram` dark mode — round 2 (per-diagram, scoped).** Fixed four more
  dark-mode surfaces, each scoped to its diagram type (no broad selectors):
  sequence lifelines + journey axis re-pointed at `--c-line`; mindmap branch
  edges restored to their per-section category colour, brightened via
  `color-mix` (an earlier over-broad edge rule had flattened them to mono);
  ER entity boxes levelled to `--bg-alt` on `section.dark` so header + attribute
  cells read with light ink. Light mode unchanged across all four.
- **`diagram` dark mode** — Mermaid bakes `edgeLabelBackground` and label ink
    as resolved hex at render time (in the light color-scheme), so on a dark
    slide flowchart/state/ER edge & relationship labels rendered as glaring
    white knockout boxes, sequence message text went invisible, and the edge
    LINES + arrowheads (baked #333) nearly vanished (dark-on-
    dark). `mermaid.css` now re-points those surfaces at `light-dark()` tokens
    (`var(--bg)` / `var(--c-ink-light)` / `var(--c-line)`) that resolve per the
    slide's color-scheme — identical on a light slide (no regression), correct
    on a dark one.
  - `state-chart`: the `lr` (horizontal) layout overran the slide and clipped
    the terminal node/marker at 5 states (a static PDF can't scroll) — tighter
    LR gutters fit the documented 4–6 node range; the `curved` variant clipped
    its terminal ◉ at the bottom — tighter vertical rhythm brings it on-canvas.
  - `roadmap`: phase date pills were white-on-pale in dark mode (the
    categorical `--cN-dark` fill flips pale on a dark canvas, but the ink stayed
    white) — a WCAG-AA failure on every dark variant. Pills now use
    `var(--c-ink-dark)` (white on the saturated light-canvas fill, near-black on
    the pale dark-canvas fill).
  - **Docs/contracts:** corrected ~22 `## Anatomy` diagrams that depicted a
    different layout than what renders (split-statement, split-brief, decision,
    timeline-list, list-steps, kpi, split-metric, math, image, featured,
    glossary, roadmap, progress, statute-stack, authority-chain,
    regulatory-update, tldr; added one for state-chart; dropped the dead
    `── accent ──` rule from title/divider/closing). Fixed misleading manifest
    contracts: `principles` skeleton (was `- **bold**`, generating card-style-
    invalid slides) + dropped its non-existent "justification" slot;
    `kpi`/`stats` list selectors (`ul`→`ol`) and kpi slot name; `split-list`
    `related` text; `authority-chain` `links`→`tiers` slot.

- **Subtitle / secondary-text contrast was broken across every theme.** The
  subtitle, eyebrow, caption, table-header, sub-label and attribution roles
  all rode the decorative, contrast-exempt `--text-muted` token, which is a
  single static value that never tracked the canvas — so secondary text fell
  below WCAG AA in most themes (and hard-failed in cuoio, magnolia, and on the
  dark canvas in concrete). They now use the new `--text-secondary` tier (AA on
  both canvases). The stale comment claiming `section.dark` "already remapped"
  `--text-muted` (it never did) was corrected. See
  `engineering/decisions/2026-06-05-token-structure-audit.md`.
- **Dark-panel text was invisible on every theme except cuoio.** The
  `--on-dark-*` opacity ramp (and the `--hljs-*` syntax fallbacks) were
  declared in a `:where(:root)` block. Marp/Marpit only rewrites a *bare*
  `:root`/`section` onto the slide `<section>`; wrapped in `:where()` it
  prefixes the slide path as a descendant, producing a "section inside a
  section" selector that never matches — so those tokens were **undefined in
  every rendered slide**. No-fallback consumers (`color:
  var(--on-dark-secondary)` on `title`/`closing`/`divider` and every split-*
  dark panel) then collapsed to the inherited dark body ink — invisible on
  dark surfaces — for all 12 themes that don't locally redefine the ramp
  (cuoio was the only one that did, which masked the bug). Moved the block to
  a plain `:root`; palette overrides still win by source order. Fixes title
  eyebrow/subtitle contrast and the blank left panel on `split-statement`,
  `split-brief`, `split-compare`, `split-metric`, and `split-list`.
- **`cards-wide` rendered all-bold and `featured` collapsed in the Marp
  preview / runtime path.** Both layouts styled their raw-markdown form behind
  a `:not(:has(.three-stack))` / `:not(:has(.feat-layout))` guard, which is
  silently broken in the Marp preview Chromium (see `engineering/gotchas.md`)
  — dropping the rules that reset body weight and build the card frames. The
  transformed and raw forms are mutually exclusive per render, so the guard
  was unnecessary: removed it, and the rules now apply unconditionally with no
  `:has()` dependency, so the layouts render in all three paths.
- **`content` lists rendered bulletless and undersized.** The layout styled
  only `<p>`, so an authored list (which `content.docs.md` permits) fell to
  base list styling — markers stripped, a size below the prose beside it.
  Added list styling at the prose tier with accent markers.
- **Mermaid radar (`radar-beta`) curves now ride the engine `--cN` palette.**
  The override block was a legacy two-curve hard-code (`--accent` /
  `--c-accent-warm`) living in the *native* radar component's stylesheet even
  though it styles *Mermaid* output. It now lives with the other Mermaid type
  overrides in `mermaid.css` and paints each series from `--c1-dark`…`--c8-dark`,
  so a radar with up to eight curves gets distinct, theme-flavoured colours that
  flip per canvas — not two fixed brand accents.
- **Pie wedge borders were off-by-one from their fills.** The piechart SVG
  emits `<defs>` (per-wedge gradients) as its first child, so the
  `nth-child`-based border palette counted from the wrong slot — every wedge's
  border took the *next* hue, and the 5th wedge landed on `--cat6` rose,
  painting a stray red line at the 12-o'clock seam. Wedge borders now count by
  `nth-of-type` (paths only). See `engineering/gotchas.md`.

### Added

- **Chart-family semantic colour system (`--state-*`).** Status-driven charts
  — gantt bars, progress fills, the shared status pills, kanban's "done"
  column, and the state-chart / timeline-list pills — now draw from a
  chart-exclusive semantic palette (`--state-{pass,warn,fail,info,mute}-{hue,
  fill,ink}`) instead of the engine-wide `--pass/--warn/--fail`. Curated to
  convey meaning (green / amber / red / blue / gray) and built like the catN
  spectrum: canvas-aware fill + ink via `light-dark()`, vivid on both modes.
  Gantt + progress bars fill with the same **hue-into-`bg` depth gradient** the
  pie / quadrant / radar SVG charts use (those read rich precisely because they
  gradient-fill ~42–82%, not a flat 24% tint — which is why the bars used to
  look muted). The gradient is capped where the shared `--text-heading` label
  still reads, so on-bar text flips the normal way (dark on light, light on
  dark), coherent with every chart in each mode. Radar's gap / delta segments
  move onto `--state-pass-ink` / `--state-fail-ink` too. Theme-overridable via
  `--chart-state-*`. The old per-`.dark` status overrides collapse into single
  canvas-aware rules.
- **Kanban cards are now swim-lane tiles.** Each card's background is a
  depth gradient of its own lane colour (same hue-into-bg language as the bars/
  zones, in the same richness band so kanban no longer reads pale), so a card
  reads as its lane. The lane tag drops its chip fill and becomes a quiet dot +
  neutral label, leaving the gradient status pill as the one loud chip on the card.
- **Status pills + gantt/progress bars share one depth-gradient recipe.** A
  status reads identically as a pill or a bar (hue-into-bg gradient, vivid ink
  border, `--text-heading` label).
- **Kanban lanes + word-cloud now ride the vivid catN spectrum.** Both moved
  off the engine `--cN` palette onto `--catN-ink`, so categorical colour reads
  consistently with pie / quadrant / radar across the whole chart family.
  (catN tokens are now also defined on `section.word-cloud`, which isn't a
  chart-frame member.)
- **New `canvas` modifier — opt into the chart surface panel.** Charts now sit
  directly on the slide by **default** (bare); add `canvas` to lift the chart
  onto its surface panel (`<!-- _class: piechart canvas -->`). Lets a deck mix
  canvas and non-canvas charts per slide; composes with `dark`. Pure CSS on
  `section.chart-frame.canvas:not(.state-chart) .chart-body` (and
  `section.word-cloud.canvas` for the free-floating word-cloud).
- **New `cover` modifier — a chart-family full-bleed with a caption band.**
  `cover` is a **chart-scoped** modifier (registered as a `cover` variant on the
  charts that support it — radar, piechart — *not* an all-layout universal). It
  takes the chart edge-to-edge, hides the header/footer, and reflows the slide
  heading + a one-line takeaway into a bottom **caption band** carrying the chart
  surface "sheen" (a `--text-heading`→`--bg` radial wash with a hairline edge),
  the page number reading through it. The generic treatment lives in
  `section.chart-frame.cover` (chart-family.css); per-chart rules tune the figure
  (radar centres the diagram + keeps a responsive legend column). Other
  chart-frame members can opt in as they're given an explicit cover figure size.
  Distinct from image's `full` photo variant (unchanged — see below). Documented
  via the radar/piechart `variantDocs`. Pure CSS — no transform/render-path
  change.
- **Chart surface panels — opt-in `canvas`, real glass not a tinted box.**
  Charts are **bare by default** (sit directly on the slide); the `canvas`
  modifier lifts a framed chart-family member onto a glass surface at
  editorial-whisper intensity. The fill is **never** a `--text-heading` mix:
  that token is a
  neutral gray, so mixing it into `--bg` painted a muddy gray box that read as
  a second background on the slide, not glass. Instead the pane tints toward
  white-frost and the form is carried by light on the edges + a shadow: on a
  LIGHT slide the pane is left **clear** (the slide shows straight through —
  no second background — read from a soft dark float shadow + a crisp hairline
  edge + a white top rim), and on a DARK slide it's a translucent **white
  frost veil** (lighter than the canvas) with a luminous edge. `light-dark()`
  picks the right one. Pure CSS on
  `section.chart-frame.canvas:not(.state-chart) .chart-body`. The float shadow is
  always black-based — `--text-heading` flips to white on dark and would cast
  a white glow / double-frame that bleeds over the footer. No `backdrop-filter` blur — unreliable in
  print-to-PDF and there's only flat `--bg` behind the pane, so it would cost
  risk for no payoff. The decoration is pinned to `.chart-body` — the one
  fixed-width container every member shares — so the panel is the **same size
  on every chart** rather than hugging each figure. Covers radar, quadrant,
  piechart, progress, gantt, kanban, and timeline-list. **word-cloud** gets the
  same surface via a `::before` painted behind its free-positioned words (it
  isn't a chart-frame member, so the family rule can't reach it). **state-chart
  is excluded** — its state flow fills the full chart-body height, leaving no
  room for a panel inset. The panel also takes a top margin so the
  `.chart-header::after` accent divider floats in the whitespace above the card
  instead of colliding with the lifted card's top edge.
- **state-chart gallery defaults to `lr`.** The default / dark / compact /
  accent demos now render left-to-right at five states (was a six-state
  top-to-bottom flow that overran the slide). The `lr` direction reads the
  machine as a horizontal pipeline and fits comfortably; the gallery and the
  manifest `sample` (which drives the chart bucket survey) are updated to
  match. No engine change — `lr` was already a supported modifier.
- **Apple-inspired categorical chart spectrum, decoupled from `cN`.** The
  chart-family (quadrant, piechart, radar, progress) now draws from its own
  vivid, well-spaced 8-hue spectrum — `--catN-hue` with an Apple-style master
  set whose dark-canvas value is a brighter same-hue sibling — instead of the
  engine-wide `cN` accents (which still drive roadmap / journey / legal /
  decision). The spectrum is theme-overridable via `--chart-catN` (a `:root`
  `light-dark()` pair); untuned themes inherit the master. Radar previously
  hardwired its `RADAR_PALETTE` to `cN` and so missed the shared model — it
  now consumes `--catN-hue` like its siblings.
- **Area-fade gradients on categorical charts.** Radar polygons, piechart
  wedges, and quadrant regions now carry a restrained SVG gradient — an
  Apple-Stocks-style area fade (near-transparent at the centre, denser toward
  the data rim on radar; pie wedges deepen from a light hub toward a vivid rim;
  quadrant regions share one radial centre at the axis crossing — faint where
  the axes meet, richer toward the outer corners). Built as per-shape
  `<linearGradient>`/`<radialGradient>` defs (SVG `fill` can't take a CSS
  gradient) with `stop-color` riding `--catN-hue`/`--catN-fill` so they still
  flip with the canvas. Landed in all three render paths (marp-cli, emulator,
  runtime) via the shared `lib/` transforms.
- **Global font-scale modifiers `scale-l` / `scale-xl` / `scale-2xl`.**
  Bump the readable fonts on a slide up in lockstep (×1.15 / ×1.3 / ×1.5)
  without re-picking sizes. A new unitless `--fs-scale` multiplier
  (default `1`) is baked into ten of the twelve typography tokens and the
  three documented between-token raw-cqi sites, so body, supporting
  headings (h3–h6), hero, and chrome all grow together and the tuned
  proportions hold. `--fs-h1` and `--fs-h2` are exempt — slide titles (and
  the KPI/stats numbers and table/chart headers that reuse those tokens)
  hold their designed size so titles don't balloon. Scope is native Marp class
  scoping: `<!-- _class: scale-xl -->` for one slide, `class: scale-xl` in
  the front matter for the whole deck. Composes with any layout or
  variant. See `engineering/typography.md` §7 and `lib/base/base.docs.md`.
- **`obligation-matrix` `pills` and `lanes` variants are now documented.**
  The variants are declared in the manifest; this adds their `variantDocs`
  so they render in the component gallery and surface in the reference and
  search index instead of being declared-but-invisible.
- **Agent authoring affordances.** Three additions help AI agents author
  decks correctly: a machine-readable catalog `dist/docs/components.json`
  (every component's axes, tags, slots, skeleton, and when/anti/related
  prose plus the controlled vocabularies, generated alongside
  `components.md/.html`); a draft-deck linter `npm run lint:deck -- <file>`
  (`tools/lint-deck.js` → `lib/authoring/lint.js`) that flags the markdown
  footguns — card-style inline-title, ordered-list bold, class typos — as
  structured, no-render diagnostics (wired into the pre-commit hook on
  staged decks and into CI via `npm run lint:deck:all`; errors block,
  unknown-class warnings are surfaced but non-blocking); and a
  vendor-neutral `AGENTS.md` entrypoint pointing agents at
  `design/skill.md`, the catalog, and the linter. See
  `design/design-system.md` §7.
- **Searchable component tags.** Every component manifest now declares a
  `tags` field (3–5 entries) — the *searcher's* vocabulary, complementary
  to the Function/Form/Substance axes. Tags are drawn from a controlled
  vocabulary (`TAG_GROUPS` in `lib/components/index.js`) across four
  dimensions (idiom, occasion, material, task) and must not restate the
  component's own axis values. They surface in each `<name>.docs.md`, the
  aggregated `dist/docs/components.md`, and as chips + a live filter facet
  in `dist/docs/components.html` (the portal filter now matches tags as
  well as name and description). `tools/check-ownership.js` gains a
  `checkTagClustering` guard that fails on un-allow-listed singleton tags
  and dead vocabulary, so the facets stay clustered. See
  `design/design-system.md` §7.
- **`dist/` is now a self-contained distribution.** It ships the bundled
  emulator CLI (`dist/lattice-emulator.js`, esbuild bundle of the engine
  graph — the package `bin`/`main`/`.` now resolve to it) and a generated
  `dist/README.md` indexing the folder, alongside the existing CSS/runtime
  bundles and the canonical component reference. A `npm run release:zip`
  target packages the full offline-browsable showcase (engine + themes +
  examples + gallery PDFs) for GitHub Releases.
- **Automated, changelog-driven releases.** The **Release** workflow
  (`workflow_dispatch`) derives the semver bump from this `## Unreleased`
  section (`tools/changelog.js`), rolls it into a dated section, tags,
  pushes, and publishes a GitHub Release with notes + the showcase zip
  (`tools/release.js`). `npm run release` / `release:dry` run it locally.
- **Documentation site.** A public Astro Starlight site under `docs/`
  (intro, getting started, authoring and theming guides) deployed to
  GitHub Pages via `.github/workflows/docs.yml`. Branded with the
  Lattice palette (indaco accent, Playfair/Outfit/JetBrains Mono).
- **Component reference portal.** `tools/build-docs-portal.js`
  aggregates every component manifest into a single canonical reference
  in two forms: `reference/components.html` — a self-contained, themable
  two-panel portal (clickable bucket→component sidebar with scroll-spy
  and live filter; a palette dropdown previews the catalog in any of the
  shipped palettes, light or dark, resolved from `themes/<name>.css`) —
  and `reference/components.md`, the plain-Markdown edition. Wired as
  `npm run docs:portal` with a `--check` gate; a lefthook job keeps it
  fresh against the manifests.

- **Custom deck logo.** Author-supplied SVG/PNG/JPEG renders as a
  discreet top-right watermark on every slide. A build-stage rewriter
  injects `<img class="deck-logo">` as the first child of each
  selected `<section>`; CSS desaturates the img to a faint grayscale
  watermark via `filter`, with brightness inverted on dark-canvas
  layouts (`.title`, `.divider`, `.closing`, `.dark`) so the mark
  stays legible without per-author light/dark variants. Real DOM
  (rather than a `::before` pseudo) lets the logo compose with every
  treatment, tints and marks alike. Three render
  paths: `applyDeckLogoToHtml` in `marp.config.js` (marp-cli), the
  same helper called from `lattice-emulator.js`'s post-render pass
  (emulator), and `applyDeckLogoFromFrontMatter` in
  `lattice-runtime.js` (published HTML). `logo-style: brand` keeps
  the logo's original colours on a soft `--bg-alt` plate;
  `logo-on: title` restricts the mark to the cover slide.
  Build-time-only — does not render in marp-vscode preview because
  the extension doesn't load workspace `marp.config.js` plugins;
  same constraint as `class: dark`. See
  `lib/base/base.docs.md § Custom logo` and `examples/custom-logo.md`.

### Fixed

- **Inline code now escapes HTML.** `parseInline` in
  `lattice-emulator.js` was wrapping backtick spans in `<code>` tags
  without escaping `<`/`>`/`&`, so authors who wrote sample HTML in
  inline code (e.g. `` `<section>` ``) ended up with the browser
  parsing literal text as real nested DOM elements, breaking page
  layout. Now escapes per standard markdown behaviour.
- **Overflow watcher scoped to Marp sections.** The watchers in
  `lattice-emulator.js` and `lattice-runtime.js` now select
  `section[data-marpit-slide]` instead of every `section`, so any
  literal `<section>` text that does end up in the DOM no longer
  pollutes the warning indices. Same scope applied to the
  per-section sizing override.

- **`quadrant` chart-family member.** Native 2×2 scatter chart joining
  the existing chart-family (progress / timeline-list / piechart /
  gantt / kanban / radar). Group-by-quadrant nested-list authoring;
  top-level items label the four corners in reading order (TL → TR →
  BL → BR), nested items carry a trailing `x, y` coord pill plotted
  inside the chart. Per-axis scale + threshold-line targets read from
  the eyebrow (`Effort 0–10 → Reach 0–100 · targets 6, 75`); falls
  back to auto-fit nice-ceil when omitted.

  Five modifier variants beyond the default:

  - `bubble` — third comma-separated value per item √-scales the dot
    (area-honest); numeric pill renders inside large bubbles.
  - `trail` — two coord pills per item; faded ring + dashed connector
    + solid dot reads "what moved" without an annotation.
  - `cohort` — top-level groups become cohorts; convex-hull region
    tints each cohort's footprint with a centroid label.
  - `threshold` — midlines replaced by explicit dashed target lines;
    four zones default to Star / On Pace / Lagging / At Risk.
  - `magic` — Gartner Magic Quadrant tribute with the canonical
    CHALLENGERS / LEADERS / NICHE PLAYERS / VISIONARIES vocabulary as
    fallback corner names.

  Palette flows through the existing `--c-quadrant-N-fill` /
  `--c-quadrant-N-text` theme aliases (AA-paired per slot). `minimal`
  and `dark` composable cross-cutting modifiers ride on top of any
  variant. Title-area styling defaults to the chart-frame `.minimal`
  treatment (centred accent hairline, no lucent gradient) — the dense
  scatter benefits from less chrome above the plot.

  Three-renderer kernel parity enforced as for radar: `lib/quadrant.js`
  is canonical; `lattice-emulator.js` inlines the build-path dispatch;
  `lattice-runtime.js` mirrors the kernel for the marp-vscode preview.
  Feature deck at `examples/quadrant.md` (+ committed PDF) demos every
  variant. Unit coverage in `test/unit/quadrant.test.js` (47 tests)
  covers parsing, eyebrow grammar, geometry, every variant, and
  chart-family integration. Reference doc:
  `docs/references/templates.md#quadrant`.

### Changed

- **Categorical charts recoloured onto a shared fill/mark model.**
  Quadrant, piechart, radar, and progress now draw from one chart-family
  colour contract (`--catN-fill` / `--catN-ink`, defined in
  `_chart-family.css`): each slot is a single curated hue rendered as a
  restrained *tint* fill plus a saturated, contrasting *mark* — pale tint
  + deep same-hue mark on a light canvas, and a muted **deep** tint +
  brighter (white-lifted) same-hue mark on a dark canvas. Both modes are
  equally restrained: the dark side is the light side's tint model
  inverted, not the hue painted at full strength (which read as a clashing
  Excel-default palette across 8 categories). Fill and mark always share a
  hue and the relationship flips automatically with the canvas, so the
  charts stay refined and on-palette in both modes. Quadrant
  cells map reading-order to slots 1–4; piechart wedges/legend swatches
  gain coloured borders; radar curves now draw from the chart spectrum
  (`--catN-hue`) like the other members, in both modes; progress's neutral
  bar uses the first slot hue (status bars still use pass/warn/fail).
  Quadrant text labels are neutral `--text-heading` ink (AA-safe) with a
  `--bg` halo. Both the native quadrant component and the Mermaid
  `quadrantChart` theme map now read the `cN` palette directly (see the
  removed `--c-quadrant-*` tokens below).
- **Piechart and quadrant fills unified onto radar's vivid area-fade
  model.** The three categorical charts now share one fill language. Pie/
  donut wedges previously rode the pale `--catN-fill` tint (which read
  pastel/washed-out); they now ride the vivid slot hue (`--catN-hue` — the
  canvas-saturated end radar strokes its curves with) as a hub→rim radial
  area-fade (lighter at the hub, vivid toward the rim), denser than radar's
  translucent overlay because wedges are opaque part-to-whole areas. Legend
  swatches become solid vivid chips matching the wedge identity. Quadrant
  zone fills now match the pie wedges exactly — the SAME opaque hub→rim mix
  of `--catN-hue` with `--bg` (42% at the axis crossing → 82% at the outer
  corners), replacing the former translucent wash, so the four zones read
  as vivid as the pie. The on-field labels take maximum-contrast ink
  (`--quadrant-label-ink`: true black on light, true white on dark via
  `light-dark()`) with no halo — a `--bg` halo reads as a visible outline on
  the saturated zones, and softened `--text-heading` reads a touch light, so
  pure black/white carries the labels on its own; only the dot/bubble marker
  rings keep a thin `--bg` ring (to stay visible on their same-hue zone). All
  three charts share the same `--catN-hue` source and
  hub→rim fade, so radar, pie, and quadrant read as one family on both
  canvases. Render-path + CSS only (no token or authoring change).
- **Documentation reorganized into two trees.** The internal engineering
  and design references moved from `docs/` to `reference/` (with the
  former `docs/references/` becoming `engineering/`), freeing
  `docs/` for the new public documentation site. All cross-references —
  CLAUDE.md, generators, the npm `files` list, tooling, and links — were
  updated accordingly.
- **BREAKING: `bg-*` decoration classes renamed to `tint-*` / `mark-*`.**
  The Background Library is now the Treatment Library, split into two
  semantic families: 12 `tint-*` gradient washes (corner glows, edge
  washes, atmospheric, multi-accent) and 11 `mark-*` SVG accent shapes,
  plus a `treatment-none` reset (was `bg-none`). `tint-corner` and
  `tint-edge` now carry an `at-*` placement axis — write
  `tint-corner at-tl` (was `bg-corner-tl`), `tint-edge at-right`
  (was `bg-edge-right`), etc. Both long and short forms are accepted
  (`at-tl` ≡ `top-left`), with a per-layer escape hatch (`tint-at-tl`)
  for composing two tints at different placements. Marks render at a
  fixed default home in v1 (e.g. `mark-orbit` defaults to bottom-right,
  matching the old `bg-orbit-br` position); writing `at-*` alongside a
  mark is silently ignored. The mark placement axis is a v2 follow-up.
  No alias period — `bg-*` classes are removed in this release. Source
  file renamed `lib/base/base.decorations.css` → `lib/base/base.treatments.css`;
  doc renamed `docs/references/backgrounds.md` → `docs/references/treatments.md`.
  Three marks switched rendering mechanism along the way because Apple
  PDFKit drops Chromium-emitted `mask-image` constructs unreliably:
  `mark-ticks` and `mark-pills` paint via `::before` + `box-shadow`
  copies (no mask), and `mark-seeds` paints as 12 stacked
  radial-gradients in the `--_bg-radial` slot. See
  `docs/references/treatments.md` for the catalogue,
  `docs/notes/2026-05-17-treatments-rename.md` for the rationale, and
  `docs/references/gotchas.md` → "Chromium PDF output of CSS
  `mask-image` renders inconsistently across viewers" for the
  underlying browser/PDF behaviour. Author migration: search-and-
  replace the `bg-X` class with its `tint-*` / `mark-*` equivalent
  per the table in the rename note.

- **BREAKING: Node 22 is now the minimum supported runtime.** `engines.node`
  bumped from `>=18.0.0` to `>=22.0.0`; CI matrix narrowed from `[18, 20, 22, 24]`
  to `[22, 24]`. Node 18 has been EOL since April 2025; Node 20 entered
  maintenance in April 2026. Lattice's test infrastructure now uses
  `node --test` glob arguments (Node 21+) and `describe({ concurrency: true })`
  (Node 20.10+) — supporting older versions would mean freezing into a
  pre-Node-21 API forever. Consumers on Node 18 or 20 should pin to
  Lattice 1.x.

- **Repository reorganization (pre-release).** The project layout was
  flattened, renamed, and re-tested in eight phases. Because Lattice
  has not been released into the wild, every change is a clean break
  with no aliases or compatibility shims.

  - `lattice.js` → `lattice-emulator.js`. The build-time renderer no
    longer steals the engine's name; `lattice` now refers to the CSS
    layouts + runtime + theming contract, `lattice-emulator` to the
    Marp-emulating PDF shim.
  - Documentation collapsed into `docs/`: `ARCHITECTURE.md`,
    `THEMING.md`, `EDITORIAL.md`, `SKILL.md`, and `references/` all
    moved under `docs/`. New `docs/notes/` folder for durable
    developer/agent investigation notes; the prior repo-root
    `AgentNote.md` is its first inhabitant.
  - `screenshot-slides.js` moved to `tools/`. The `.test/` folder of
    ad-hoc probe scripts (~85 files of historical investigation) was
    deleted along with stale `examples/*.html` and `examples/*.pptx`
    artifacts; `examples/*.html` is now gitignored.
  - Test runner switched from a single `smoke-test.js` to `node:test`
    with two tiers under `test/`: `unit/` (fast, no child processes —
    `npm test`) and `integration/` (rebuilds both galleries through
    both renderers — `npm run test:integration`). Shared plumbing
    lives under `test/helpers/`; the page-count contract lives in
    `test/fixtures/expected-page-counts.json`.
  - Test coverage expanded with `mermaid-var-map.test.js`, which
    extracts every CSS-var reference from the emulator's
    `MERMAID_VAR_MAP` and asserts both palettes define each token,
    plus `marp.gallery.test.js` and `parity.test.js` to assert
    cross-renderer agreement on slide count.
  - `@marp-team/marp-cli` promoted from `devDependencies` to
    `dependencies`. Lattice's runtime/preview path explicitly targets
    marp-cli output and the integration suite spawns it; there is no
    "lattice without marp" mode worth supporting.

### Removed

- **Breaking: the `--c-quadrant-N-fill` / `--c-quadrant-N-text` palette
  tokens are removed from every theme.** Quadrant charts (native and the
  Mermaid `quadrantChart` theme map) now read the `cN` categorical palette
  directly through the shared chart-family colour model, so the bespoke
  per-quadrant slot tokens — and their separate per-theme hue tuning — no
  longer exist. Consumers that overrode `--c-quadrant-*` must tune the `cN`
  palette instead. The `palette`/`contrast` unit suites no longer require
  or assert these tokens.

### Fixed

- **Quadrant chart internal border drift.** The emulator's
  `MERMAID_VAR_MAP` referenced `--mermaid-mid-slate` for
  `quadrantInternalBorderStrokeFill`, but no palette defined that
  token, so Mermaid silently fell back to its default colour. Pointed
  the entry at `--cat-slate` to match what `lattice-runtime.js`
  already uses for the same role. Caught by the new
  `mermaid-var-map.test.js`.

### Earlier (Unreleased)

- **Mermaid runtime: removed source-restoration anti-pattern; SSR-highlighted source
  doubles as the failure-mode UI.** `lattice-runtime.js` previously destroyed the
  `<pre><code>` Marp emitted, replaced it with `<div class="mermaid">`, then on parse
  failure copied a stashed `data-ll-source` back into the div as plaintext — losing
  Marp's native code styling and showing unstyled grey text on the slide. The new
  `wrapFences()` keeps the `<pre>` intact and adds a sibling `<div class="mermaid">`
  inside a `<div class="mermaid-block" data-state="…">` wrapper. CSS toggles
  visibility off `data-state` (`pending` → `rendered` hides pre / shows svg, `error`
  keeps pre visible and surfaces a themed `.mermaid-error` block with parser cause
  text). `initAndRun()` now drives `mermaid.render(id, source)` per-fence with
  per-block try/catch instead of a single `mermaid.run({nodes, suppressErrors:true})`.
- **Mermaid fences are now syntax-highlighted at SSR time.** Added
  `lib/mermaid-hljs.js`, a highlight.js language definition (diagram openers as
  `hljs-section`, keywords spanning flowchart/sequence/class/state/er/gantt/journey/
  pie/git/mindmap/timeline/kanban/quadrant/requirement/c4/architecture/packet/sankey/
  radar/xychart/block, frontmatter + `%%{init}%%` as `hljs-meta`, arrows + ER
  cardinalities as `hljs-operator`, strings, numbers, hex colors, HTML tags). Wired
  into marp-core's bundled hljs via a `registerMermaidHljs(marp)` engine hook in
  `marp.config.js`; marp's default `highlighter` picks it up automatically. Mermaid
  source now renders with the same hljs token classes as JS/Python/etc., including
  in marp-vscode preview when the same hljs language is registered there.

### Fixed

- **Mermaid theming gaps across 7 diagram types.** A full marp-cli + Puppeteer audit
  across 5 decks (37 diagrams) found 35 stray colors that escaped the brand palette:
  X11 named colors on journey actor avatars (cyan/lawngreen/darkseagreen), Tableau-10
  hardcoded palette on sankey nodes and link gradients, Mermaid's #087EBF service blue
  on architecture, the C4 dark-blue cycle on inner rects/labels, lightened cScale
  derivatives on mindmap and timeline `line.node-line-N` connectors, #EFEFEF on
  packet blocks, and a Mermaid-derived #F0F5FB on ER `g.row-rect-even` that drifted
  from `--bg-alt`. None of these were reachable through `themeVariables` — Mermaid
  bypasses the variable cascade for these surfaces. Added per-diagram-type CSS
  overrides to `themes/indaco.css` and `themes/cuoio.css` (journey faces/circles/
  strokes, c4 prefix-class catchall via `[class*="person"]`/`[class*="system"]`,
  mindmap+timeline connector strokes, sankey nodes/labels/links, packet blocks,
  architecture services/glyphs/edges, ER row-rect alternation). Tokenized the radar
  warm-orange contrast accent as `--mermaid-accent-warm` so audits recognize it.
  Audit verified deterministic across 3 rounds: 0 strays, 0 missing SVGs, 37/37
  diagrams on palette. Smoke test still passes (42 + 38 pages).
- **Silent diagram failures in browser runtime.** `lattice-runtime.js` was passing
  `layout: "tidy-tree"` to `mermaid.initialize()`, which is not a valid Mermaid 11
  layout algorithm (only `dagre` and `elk` are recognized). Mermaid threw
  "Unknown layout algorithm" mid-render, but `suppressErrorRendering: true` swallowed
  the error — leaving state, ER, class, and several other diagram types with
  `data-processed=true` but no SVG. Removed the bogus `layout` option; each diagram
  now picks its native layout. Verified with a synthetic Puppeteer harness covering
  cold load, section-replace, and in-place edits across both `<marp-pre>` and `<pre>`
  wrappers (8/8 deterministic across 3 runs each).

## 1.0.0

Initial public release.

### Engine

- Markdown-to-PDF renderer (`lattice-emulator.js`) with Marp-emulated HTML output,
  highlight.js syntax coloring, and per-diagram Mermaid pre-rendering.
- Browser runtime (`lattice-runtime.js`) for live Marp preview and web
  export contexts. Resolves the Mermaid theme from the loaded palette CSS
  at runtime.
- Single source of truth for color: every Mermaid theme variable derives
  from CSS custom properties in the active palette. The structural
  mapping (which Mermaid key gets which palette role) lives in `lattice-emulator.js`
  and does not change when palettes are swapped.

### Theme

- Two palettes: `indaco` (cool indigo, default) and `cuoio` (warm leather).
  Both extend `lattice.css` via `@import 'lattice'` and supply color tokens.
  Pale-cool / pale-warm designs with saturated brand borders and dark ink.
  Saturated red reserved for alarm states (gantt critical, error fills).
  Every other surface stays pale.
- Dark variant tokens (`section.dark` reskin) defined as part of the
  palette, so the same layouts work on either canvas.
- highlight.js syntax tokens defined as palette variables, so a theme
  can change syntax colors alongside slide colors.

### Layouts

- 25+ slide layouts including title, divider, content, diagram, two-column,
  card-grid, comparison, quote, timeline, list, full-bleed, big-number,
  split-panel, closing, finding, code-compare, image-half, stats,
  cards-stacked, criteria, verdict-grid, image-full, three-row, and dark
  variants.
- All layouts are palette-blind: every color reference goes through
  `var(--token)`, no hex literals.

### Mermaid

- Theme support for all 25 renderable Mermaid diagram types. ZenUML is
  documented as a non-renderable type in static-PDF contexts because the
  Mermaid CLI emits HTML/Tailwind classes without bundling the required
  stylesheet.
- Per-diagram CSS overrides for nine diagrams that ignore `themeVariables`
  or have hardcoded internal palettes (journey, mindmap, kanban, c4,
  radar, venn, ishikawa, treemap, plus a flowchart shape-coverage rule
  and a gantt outside-text fix).

### Examples

- `examples/gallery.md` and `gallery.pdf`: 40-slide layout gallery
  demonstrating every slide layout.
- `examples/mermaid-gallery.md` and `mermaid-gallery.pdf`: 31-slide
  diagram gallery covering all 25 Mermaid diagram types.

### Documentation

- `README.md`: project landing.
- `docs/skill.md`: deck authoring contract — layouts, directives, examples.
- `docs/theming.md`: how to author a palette, including the per-diagram
  Mermaid theming surface and parser limits.
- `docs/editorial.md`: prose rules for writing the words on the slides.
- `docs/architecture.md`: engine internals.

### Position in SlideWright

Lattice 1.0.0 is the first repository published under the
[SlideWright](https://github.com/slidewright) organization. Lattice is
the engine layer — the build pipeline, the layouts, the theme system.
The SlideWright desktop app (under development) will wrap this engine
with a GUI for non-developer deck authors.
