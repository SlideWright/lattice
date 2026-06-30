/**
 * Component Studio — the AI tier's PURE pieces (the component analog of
 * lib/theme/ai.js). Building the model prompt and coercing the model's reply
 * into a gate-ready draft are deterministic and `fs`-free, so they live here
 * (bundled into the browser layout-core and unit-tested with a fake reply); the
 * actual model call + the gate run stay in the controller (architect.ts).
 *
 * The architecture mirrors the shipped Theme AI (#613): the model only ever
 * PROPOSES — here, a {manifest, css, skeleton} grounded in a CONCRETE knowledge
 * file (`COMPONENT_CANON`, the analog of `THEME_CANON`) — and deterministic code
 * DISPOSES (`gateComponent` + `findCssExfil` in the bridge). The structural
 * contract is gateable (var(--…)-token-only, no hex, `--fs-*` type, no margin,
 * `section.<name>` scoping, the `> .cell-stage` root, card-as-`<li>`); the
 * aesthetic residue rests on this knowledge file + the model + human review.
 * See engineering/decisions/2026-06-29-ai-component-generation.md.
 *
 * SCOPE: the transform-free subset only (pure CSS over native `ul>li`/prose DOM —
 * `substance: prose | structure`). A request that implies a chart, a Mermaid
 * diagram, codegen, or a non-`ul>li` shape must DECLINE and route to a first-party
 * build / the #618 DSL, never emit a broken transform-free fake.
 */

const { NAME_RE, FUNCTIONS, BUCKETS, FORMS, CSS_ONLY_SUBSTANCES, findUnscopedSelectors } = require('./gate.js');

// The legible-ceiling + reflow shapes from manifest.schema.json (§6 audit).
const ADAPT_MODES = ['native', 'reflow', 'single-orientation'];
// A generated stylesheet shouldn't smuggle a multi-MB `data:` payload past the
// exfil denylist (which allows inline data: URIs) — cap the whole sheet (§7).
const MAX_CSS_BYTES = 24 * 1024;

/**
 * The knowledge file — concrete the way THEME_CANON is (exact identifiers,
 * literal recipes, fully-worked examples), because that concreteness is *why*
 * the Theme AI worked. Distilled from a profile of the 53 shipped components.
 */
const COMPONENT_CANON =
  'HOW A LATTICE COMPONENT IS BUILT (so your draft feels native, not generic CSS):\n' +
  '\n' +
  '• FORM VOCABULARY. A slide is a Frame divided into Cells; the content Cell hosts a Tile — your component. ' +
  'The Frame auto-supplies the chrome: the masthead band lifts the eyebrow + the `h2` title; the footer supplies ' +
  'running text, section progress, and the page number. NEVER re-implement chrome (no title bar, no page number, ' +
  'no progress rail). Your CSS targets ONLY the body, which lives under `section.<name> > .cell-stage` — a flex column.\n' +
  '\n' +
  '• ROOT. Always `section.<name> > .cell-stage { display:flex; flex-direction:column; }` plus `flex:1; min-height:0` ' +
  'on the list so rows distribute into the bounded stage (the stage clips + measures overflow — without `min-height:0` a ' +
  'dense deck overruns and clips).\n' +
  '\n' +
  '• CARDS ARE LIST ITEMS, never `<div>`s. Author markdown is `- Label` (one line) with an optional nested `  - body`. ' +
  'The list is `ul/ol > li` with `list-style:none; padding:0; margin:0`; the lead text AUTO-BOLDS via CSS — the author ' +
  'writes `- Signal custody`, NEVER `- **Signal custody.** body`. The body is a nested list that spans a full-width row ' +
  'below the header (`flex:0 0 100%`).\n' +
  '\n' +
  '• AUTHOR WITH THE MARKDOWN STRUCTURE THAT FITS THE DATA — and it MUST be valid markdown. Your choices, all transform-free ' +
  '(no custom code, just CSS over the native DOM the markdown produces):\n' +
  '   – LIST (`ul/ol > li`) — a SET of items (cards, rosters, checklists, glossaries).\n' +
  '   – TABLE (a GFM markdown table: a header row, a `| --- | --- |` divider, then rows) — a GRID of values that reads ACROSS ' +
  'columns (features × plans, duties × parties). It renders to a native `<table>`; style `section.<name> table`, ' +
  '`section.<name> thead th`, `section.<name> td` with tokens + `border-bottom:1px solid var(--border)` (NEVER margin, ' +
  '`border-collapse:collapse`). When the data is a matrix, USE A TABLE — do not fake it with a list or a grid of divs.\n' +
  '   – PROSE paragraph — a statement / callout. FENCED CODE (```lang) — a code sample (the engine highlights it; do not ' +
  'restyle the tokens). MATH (`$$…$$`) — the engine renders it. Pick lists vs tables vs prose by the shape of the content.\n' +
  '\n' +
  '• STATE MARKERS ARE A UNIVERSAL GRAMMAR — use them when a ROW carries done/partial/pending status; never re-invent status. A ' +
  'leading bracket marker on a list item OR a table cell is AUTO-CHROME the engine decodes into a colour-blind-safe status disc ' +
  '(a shape + a state token): `[x]` = done/pass, `[-]` = partial/qualified, `[ ]` = todo/pending (neutral; "not met" only in a ' +
  'verdict grid), `[/]` = out of scope/waived. Author `- [x] Item` (or `| Clause | [x] | [ ] |`); do NOT style the `.state` disc ' +
  'yourself (it is universal), and do NOT fake status with a raw emoji, a colored hex, or a bare bullet. Reach for markers on a ' +
  'readiness checklist, a coverage/obligation matrix, or a criteria verdict — NOT on a plain inventory list (a status PILL fits ' +
  'a one-word label; a MARKER fits a true status axis).\n' +
  '\n' +
  '• THE SLIDE GRAMMAR — ORDER IS LOAD-BEARING. The chrome slots are AUTO-DETECTED by POSITION, so a block in the wrong ' +
  'place is read as a different slot (or breaks). Emit the skeleton in THIS order:\n' +
  '   1. EYEBROW — an inline-code-ONLY paragraph (a line that is just `` `Label` ``) placed IMMEDIATELY ABOVE the `##` heading.\n' +
  '   2. TITLE — the `## heading` (the Frame lifts it into the masthead; never style it).\n' +
  '   3. SUBTITLE — a plain (or `_italic_`) paragraph IMMEDIATELY AFTER the heading.\n' +
  '   4. CONTENT — your list / table / prose (the body you actually style).\n' +
  '   5. KEY-INSIGHT — a TRAILING `> blockquote` at the very end → the accent takeaway bar (auto-chrome; do not draw it).\n' +
  '   6. BELOW-NOTE — a final short paragraph led by an em-dash (`— …`), or a trailing `_italic_` annotation paragraph.\n' +
  'INLINE CODE means different things BY POSITION: a `code`-only paragraph above the heading is the EYEBROW; a TRAILING ' +
  '`code` on a list row is a PILL (a one/two-word status chip); `code` elsewhere is a label/citation chip. Same token, ' +
  'different slot — the position decides.\n' +
  '\n' +
  '• THE SKELETON IS PURE MARKDOWN — NO RAW HTML TAGS. The engine builds every structure from the markdown DOM, so you NEVER ' +
  'need a tag. Do not emit `<div>`, `<span>`, `<br>`, `<table>` (write a GFM pipe table instead), and ABSOLUTELY never `<script>`/' +
  '`<style>`/`<iframe>` (an XSS/style-override vector — the gate rejects ANY raw tag). To SHOW code, use inline `` `code` `` or a ' +
  '```fence (there the `<tag>` is escaped text, not live HTML). The ONE allowed HTML is the `<!-- … -->` comment — the ' +
  '`<!-- _class: <name> -->` directive, and any other `<!-- presenter / reader note -->` you want to leave; comments are kept.\n' +
  '\n' +
  '• ZERO non-reset `margin`. A bare `margin:0` reset is the ONLY margin allowed; all real spacing is `gap` (between flex/grid ' +
  'children) or `padding` (inside a box), sized with `--sp-*`. Right-anchor a pill with `justify-content:space-between` or a ' +
  '`flex:1` spacer — NEVER `margin-left:auto` or `margin:auto`. (margin is invisible to the height math the stage depends on.) ' +
  'The #1 recurring trap is a CUSTOM `::before` MARKER (a `content:"•"`/dot/icon bullet): space it from the text with ' +
  '`padding-right`, or make the row `display:flex; gap:…` — NEVER `margin-right` on the pseudo. (Spacing columns/cards is the ' +
  'same rule: `gap` on the grid/flex CONTAINER, never a `margin` on the child.) BEFORE you return, scan your own CSS: if any ' +
  '`margin` appears that is not `margin:0` — including on a `::before`/`::after` — it is a bug; rewrite it as `gap`/`padding`.\n' +
  '\n' +
  '• COMPOSE ONLY FROM TOKENS — never invent a value. Color: `--bg`, `--bg-alt`, `--border`, `--text-heading`, `--text-body`, ' +
  '`--text-secondary`, `--text-muted`; accent `--accent`, `--accent-soft`, `--on-accent`, `--on-accent-soft`; state `--pass`, ' +
  '`--warn`, `--fail`; categorical `--cat-1-mark … --cat-12-mark`. ZERO hex. Type is the 12-token `--fs-*` ROLE system — pick ' +
  'by role, never a raw px/cqi/rem: `--fs-meta` (11pt chrome) · `--fs-body-compact` (13pt dense cells) · `--fs-body` (16pt default) ' +
  '· `--fs-message` (21pt statement) · `--fs-emphasis` (30pt lead); headings `--fs-h1 … --fs-h6` (`--fs-h2` 28pt = standard title); ' +
  '`--fs-hero` (86pt, the one monumental number). Spacing `--sp-3xs … --sp-2xl`; geometry in `cqi`/`cqh`; radius `--radius-sm/-md`; ' +
  'pills inherit the `--pill-*` family.\n' +
  '\n' +
  '• MULTI-COLUMN = real CSS grid OR the flex "matrix" idiom: `box-sizing:border-box; width:calc(50% - var(--sp-md)/2)` on the ' +
  'cards with `display:flex; flex-wrap:wrap; gap:var(--sp-md)` on the list. NEVER a flex-`basis` calc (proven unreliable).\n' +
  '\n' +
  '• BOX-LOCAL REFLOW for portrait/tall frames: `@container lattice (aspect-ratio <= 1.05) { … width:100% … }` to drop to a single ' +
  'column. Use the DOUBLED-CLASS specificity trick — `section.<name>.<name> > .cell-stage > ul > li` — so the reflow rule outranks ' +
  'the base grid rule. This is the single most error-prone idiom; copy it exactly.\n' +
  '\n' +
  '• THE SLOT VOCABULARY (auto-detected from markdown — author the CONTENT slots; NEVER re-draw a CHROME slot). CHROME (the Frame ' +
  'supplies these — do not style them): the masthead lifts the EYEBROW (`p > code:only-child` ABOVE the `h2`) + the TITLE (`h2`); the ' +
  'SUBTITLE is inline `code` just BELOW the heading; the FOOTER band carries running text, the PAGINATION (page number) and the PROGRESS ' +
  'mark; the LOGO is the author brand mark, top-right, from front-matter. CONTENT slots you DO author: the METADATA PILL (a trailing inline ' +
  '`code` on a card line → a chip), the KEY-INSIGHT (a trailing `blockquote`), the BELOW-NOTE (an em-dash `<p>`). RAIL IS NOT ONE SLOT — three ' +
  'things share the word, do not confuse them: (a) the PROGRESS rail = the footer\'s section-progress mark, auto-chrome you must NOT draw; ' +
  '(b) a SPLIT/SOVEREIGN rail = a dark side column only a `form: split` component owns; (c) an agenda-style `.rail` = a per-component variant ' +
  'class. A side rail is a split-form or a variant concern — never a universal slot you hand-author.\n' +
  '\n' +
  '• TAXONOMY — classify the component correctly (drives the manifest + dedup). The buckets and what each is FOR: anchor (title/section/closing ' +
  'covers) · statement (one big idea / KPI / quote) · INVENTORY (lists, cards, rosters, ledgers, glossaries — your home bucket) · comparison ' +
  '(two-or-more options side by side) · progression (steps/stages/phases over time) · evidence (proof: tables, stats, citations) · imagery ' +
  '(photo-led) · chart · diagram · math · code · legal. Pick the `function`/`form`/`substance` that matches; for a transform-free CSS component ' +
  'stay in inventory/comparison/evidence/legal (+ code/math prose).\n' +
  '\n' +
  '• RESTRAINT (the 10/10 rubric, checkable not vibes): one accent, reserved for the verdict — not decoration; SIX distinct hierarchy levels ' +
  '(if two adjacent levels look the same it is broken); cards never touch the stage edges (always `padding`); ≤ ~6 cards, ≤ ~40 words, ≤ 6 ' +
  'bullets; state carried by SHAPE + a state token, not color alone; categorical hues capped ~6–8 (Wong 2011); contrast checked against ' +
  '`--bg-alt`, not just `--bg`.\n' +
  '\n' +
  '• THE OTHER INVARIANTS (with the why): SCOPING (#7) — every selector starts `section.<name>` so styles can never leak onto another slide; ' +
  'the gate rejects a bare `ul`/`h2`. US ENGLISH (#21) — every word a human reads (class names, comments, copy) uses the US spelling (`color`, ' +
  '`gray`, `behavior`, `center`), never the British form. card-nesting (#5) — `- Title` / `  - body`, never inline `- **Title.** body` (the title ' +
  'is a structural slot the CSS bolds, not editorial `**`).\n' +
  '\n' +
  '• MANIFEST IS THE CONTRACT. Always declare `adapt` (how the component reflows — `{"mode":"native"}` when it relies on the universal cqi ' +
  'scaling + the `@container lattice` reflow above; `{"mode":"reflow"}` once it ships per-family layouts) and `capacity` (its legible ceiling — ' +
  '`{"sweet":4,"soft":6,"hard":8}`: the comfortable, the stretched, and the hard cap on cards/rows before it should escalate to a denser sibling). ' +
  'A component that never declares how it adapts will overflow a portrait frame — declare it.\n' +
  '\n' +
  '• DECLINE only when a TRANSFORM is required. You author transform-free components — pure CSS over the native DOM that valid markdown ' +
  'produces (lists, TABLES, prose, fenced code, math). Lists AND tables are both in scope. Decline ONLY when the request needs custom code ' +
  'to generate the structure: a chart (plotted axes/bars), a Mermaid/flow diagram (nodes + drawn arrows), a timeline/roadmap/journey (a ' +
  'positioned track), generated/highlighted source beyond a plain fenced block. A matrix is NOT a decline — it is a TABLE. When a transform ' +
  'is genuinely required, return a decline (see the output contract) routing to a first-party build, NOT a broken fake.\n';

/** A distilled, gate-clean worked example: a 2-up card grid (the matrix idiom). */
const EXAMPLE_CARDS =
  'WORKED EXAMPLE A — a 2-up card grid ("a grid of capability cards, each a title and a one-line note").\n' +
  'manifest: {"name":"capability-cards","function":"inventory","form":"grid","substance":"structure","bucket":"inventory",' +
  '"tags":["cards","grid","capabilities"],"description":"A 2-up grid of capability cards — a title over a one-line note.",' +
  '"adapt":{"mode":"native"},"capacity":{"sweet":4,"soft":6,"hard":8}}\n' +
  'css:\n' +
  'section.capability-cards > .cell-stage { display:flex; flex-direction:column; }\n' +
  'section.capability-cards > .cell-stage > ul {\n' +
  '  display:flex; flex-wrap:wrap; gap:var(--sp-md); flex:1; min-height:0;\n' +
  '  list-style:none; padding:0; margin:0;\n' +
  '}\n' +
  'section.capability-cards > .cell-stage > ul > li {\n' +
  '  box-sizing:border-box; width:calc(50% - var(--sp-md) / 2);\n' +
  '  background:var(--bg-alt); border:1px solid var(--border); border-radius:var(--radius-md);\n' +
  '  padding:var(--sp-sm) var(--sp-md);\n' +
  '  font-size:var(--fs-body); font-weight:700; color:var(--text-heading); line-height:var(--lh-snug);\n' +
  '}\n' +
  'section.capability-cards > .cell-stage > ul > li > ul {\n' +
  '  list-style:none; padding:var(--sp-xs) 0 0 0; margin:0;\n' +
  '  font-weight:400; color:var(--text-body); font-size:var(--fs-body-compact);\n' +
  '}\n' +
  '@container lattice (aspect-ratio <= 1.05) {\n' +
  '  section.capability-cards.capability-cards > .cell-stage > ul > li { width:100%; }\n' +
  '}\n' +
  'skeleton:\n' +
  '<!-- _class: capability-cards -->\n\n## What the platform does\n\n- Ingests any source\n  - CSV, API, or stream — no schema up front.\n' +
  '- Scores in real time\n  - Sub-second decisions on every record.\n';

/** A distilled, gate-clean worked example: a single-column responsibility ledger. */
const EXAMPLE_LEDGER =
  'WORKED EXAMPLE B — a responsibility ledger ("who owns what — a responsibility on the left, an owner chip on the right, a one-line note below").\n' +
  'manifest: {"name":"owner-ledger","function":"inventory","form":"ledger","substance":"structure","bucket":"inventory",' +
  '"tags":["ownership","roster","ledger"],"description":"A roster of responsibilities, each with an owner chip and a one-line note.",' +
  '"adapt":{"mode":"native"},"capacity":{"sweet":4,"soft":6,"hard":8}}\n' +
  'css:\n' +
  'section.owner-ledger > .cell-stage { display:flex; flex-direction:column; }\n' +
  'section.owner-ledger > .cell-stage > ul {\n' +
  '  display:flex; flex-direction:column; gap:var(--sp-xs); flex:1; min-height:0;\n' +
  '  list-style:none; padding:0; margin:0;\n' +
  '}\n' +
  'section.owner-ledger > .cell-stage > ul > li {\n' +
  '  display:flex; flex-wrap:wrap; align-items:center; column-gap:var(--sp-md); row-gap:var(--sp-xs);\n' +
  '  flex:1; min-height:0;\n' +
  '  background:var(--bg-alt); border:1px solid var(--border); border-left:3px solid var(--accent);\n' +
  '  border-radius:var(--radius-md); padding:var(--sp-sm) var(--sp-lg);\n' +
  '}\n' +
  '/* the lead text auto-lifts to <strong> because each card carries a nested body list */\n' +
  'section.owner-ledger > .cell-stage > ul > li > strong {\n' +
  '  flex:1 1 auto; font-size:var(--fs-body); font-weight:700; color:var(--text-heading);\n' +
  '}\n' +
  'section.owner-ledger > .cell-stage > ul > li > code {\n' +
  '  flex:0 0 auto; font-size:var(--fs-meta); color:var(--text-body);\n' +
  '}\n' +
  'section.owner-ledger > .cell-stage > ul > li > ul {\n' +
  '  flex:0 0 100%; list-style:none; padding:0; margin:0;\n' +
  '  font-size:var(--fs-body-compact); color:var(--text-body);\n' +
  '}\n' +
  'skeleton:\n' +
  '<!-- _class: owner-ledger -->\n\n## Who owns what\n\n- Signal custody `Data lead`\n  - Owns intake quality and source diversity.\n' +
  '- Scoring policy `Risk lead`\n  - Owns calibration cadence and version floors.\n';

/** A gate-clean worked example that REUSES the card-grid matrix pattern (§4.8 — reuse, don't reinvent). */
const EXAMPLE_REUSE =
  'WORKED EXAMPLE C — REUSE a near neighbor. When dedup surfaces a similar component (e.g. "capability-cards"), adapt ITS pattern rather than ' +
  'invent a new structure. Request: "status cards — each capability with a pass/warn/fail status". This reuses the SAME card-as-li matrix grid ' +
  'and adds ONLY a status accent (state carried by a left border + a state token, not a new layout).\n' +
  'manifest: {"name":"status-cards","function":"inventory","form":"grid","substance":"structure","bucket":"inventory",' +
  '"tags":["cards","status","grid"],"description":"A 2-up grid of capability cards, each carrying a pass/warn/fail status accent.",' +
  '"adapt":{"mode":"native"},"capacity":{"sweet":4,"soft":6,"hard":8}}\n' +
  'css:\n' +
  'section.status-cards > .cell-stage { display:flex; flex-direction:column; }\n' +
  'section.status-cards > .cell-stage > ul {\n' +
  '  display:flex; flex-wrap:wrap; gap:var(--sp-md); flex:1; min-height:0;\n' +
  '  list-style:none; padding:0; margin:0;\n' +
  '}\n' +
  'section.status-cards > .cell-stage > ul > li {\n' +
  '  box-sizing:border-box; width:calc(50% - var(--sp-md) / 2);\n' +
  '  background:var(--bg-alt); border:1px solid var(--border); border-left:3px solid var(--text-muted);\n' +
  '  border-radius:var(--radius-md); padding:var(--sp-sm) var(--sp-md);\n' +
  '  font-size:var(--fs-body); font-weight:700; color:var(--text-heading);\n' +
  '}\n' +
  '/* status = SHAPE (the left border) + a state token, never color alone */\n' +
  'section.status-cards > .cell-stage > ul > li.pass { border-left-color:var(--pass); }\n' +
  'section.status-cards > .cell-stage > ul > li.warn { border-left-color:var(--warn); }\n' +
  'section.status-cards > .cell-stage > ul > li.fail { border-left-color:var(--fail); }\n' +
  '@container lattice (aspect-ratio <= 1.05) {\n' +
  '  section.status-cards.status-cards > .cell-stage > ul > li { width:100%; }\n' +
  '}\n' +
  'skeleton:\n' +
  '<!-- _class: status-cards -->\n\n## Capability status\n\n- Ingest pipeline\n- Scoring engine\n- Audit trail\n';

/** A gate-clean two-column COMPARISON — two sides side by side via grid + gap (NEVER margin). */
const EXAMPLE_COMPARE =
  'WORKED EXAMPLE D — a two-column comparison ("build vs buy", "pros and cons", "two plans side by side"). The two sides are the TWO ' +
  'top-level list items; CSS grids the list into two columns with `gap` — NEVER `margin` to space the columns (that is the #1 mistake here). ' +
  'Each side is a panel; its points are the nested list. Portrait collapses to one column.\n' +
  'manifest: {"name":"build-buy","function":"comparison","form":"split","substance":"structure","bucket":"comparison",' +
  '"tags":["comparison","two-column","tradeoff"],"description":"Two options side by side — a titled panel each, the points listed below.",' +
  '"adapt":{"mode":"native"},"capacity":{"sweet":2,"soft":2,"hard":3}}\n' +
  'css:\n' +
  'section.build-buy > .cell-stage > ul {\n' +
  '  display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-lg); align-content:start; flex:1; min-height:0;\n' +
  '  list-style:none; padding:0; margin:0;\n' +
  '}\n' +
  'section.build-buy > .cell-stage > ul > li {\n' +
  '  background:var(--bg-alt); border:1px solid var(--border); border-radius:var(--radius-md);\n' +
  '  padding:var(--sp-md);\n' +
  '  font-size:var(--fs-message); font-weight:700; color:var(--text-heading);\n' +
  '}\n' +
  'section.build-buy > .cell-stage > ul > li > ul {\n' +
  '  list-style:none; padding:var(--sp-sm) 0 0 0; margin:0; display:flex; flex-direction:column; gap:var(--sp-xs);\n' +
  '  font-size:var(--fs-body); font-weight:400; color:var(--text-body);\n' +
  '}\n' +
  '@container lattice (aspect-ratio <= 0.9) {\n' +
  '  section.build-buy.build-buy > .cell-stage > ul { grid-template-columns:1fr; }\n' +
  '}\n' +
  'skeleton:\n' +
  '<!-- _class: build-buy -->\n\n## Build vs buy\n\n- Build\n  - Full control of the roadmap\n  - Higher upfront cost\n' +
  '- Buy\n  - Faster to launch\n  - Vendor lock-in\n';

/** A gate-clean MATRIX rendered as a native GFM table — when data reads ACROSS columns, USE A TABLE (don\'t fake it with lists). */
const EXAMPLE_TABLE =
  'WORKED EXAMPLE E — a feature MATRIX as a real table ("compare three plans across a set of features", "a duties-by-party grid"). The data ' +
  'is a GRID read ACROSS columns, so the skeleton is a GFM markdown table (header row, a `| --- |` divider, then one row per feature) — NOT a ' +
  'list or a grid of divs. It renders to a native `<table>`; style `section.<name> table/thead th/td` with tokens and `border-bottom` (NEVER ' +
  'margin), `border-collapse:collapse`.\n' +
  'manifest: {"name":"plan-matrix","function":"comparison","form":"matrix","substance":"structure","bucket":"comparison",' +
  '"tags":["comparison","table","matrix","pricing"],"description":"A feature matrix — features down the rows, plans across the columns.",' +
  '"adapt":{"mode":"native"},"capacity":{"sweet":4,"soft":6,"hard":8}}\n' +
  'css:\n' +
  'section.plan-matrix > .cell-stage { display:flex; flex-direction:column; }\n' +
  'section.plan-matrix table {\n' +
  '  width:100%; border-collapse:collapse; table-layout:auto; flex:1;\n' +
  '  font-size:var(--fs-meta);\n' +
  '}\n' +
  'section.plan-matrix thead th {\n' +
  '  text-align:left; padding:var(--sp-xs) var(--sp-sm);\n' +
  '  font-size:var(--fs-meta); font-weight:700; color:var(--text-label);\n' +
  '  border-bottom:2px solid var(--border);\n' +
  '}\n' +
  'section.plan-matrix tbody td {\n' +
  '  padding:var(--sp-xs) var(--sp-sm); border-bottom:1px solid var(--border);\n' +
  '  color:var(--text-body);\n' +
  '}\n' +
  'section.plan-matrix tbody td:first-child {\n' +
  '  font-weight:600; color:var(--text-heading);\n' +
  '}\n' +
  'skeleton:\n' +
  '<!-- _class: plan-matrix -->\n\n## Plans at a glance\n\n' +
  '| Feature | Starter | Team | Scale |\n' +
  '| --- | --- | --- | --- |\n' +
  '| Seats | 3 | 25 | Unlimited |\n' +
  '| SSO | — | Yes | Yes |\n' +
  '| Audit log | — | 30 days | 1 year |\n';

const ASK_SYSTEM =
  'You are a component designer for the Lattice slide engine. Given a request, you propose ONE local component as a ' +
  'compact JSON object — a manifest + scoped CSS + a skeleton slide — that feels native to Lattice\'s boardroom-quality set.\n\n' +
  COMPONENT_CANON +
  '\n' +
  EXAMPLE_CARDS +
  '\n' +
  EXAMPLE_LEDGER +
  '\n' +
  EXAMPLE_REUSE +
  '\n' +
  EXAMPLE_COMPARE +
  '\n' +
  EXAMPLE_TABLE +
  '\n\nOUTPUT CONTRACT. Return ONLY a compact JSON object — no prose, no markdown fences — with EXACTLY these keys:\n' +
  '  "name": a short lowercase slug (a–z, 0–9, hyphens; starts with a letter), evocative of the component — e.g. "verdict-grid".\n' +
  '  "description": ONE sentence describing what it shows and when to use it.\n' +
  `  "function": one of ${FUNCTIONS.map(f => `"${f}"`).join(', ')}.\n` +
  `  "form": one of ${FORMS.map(f => `"${f}"`).join(', ')}.\n` +
  `  "substance": one of ${CSS_ONLY_SUBSTANCES.map(s => `"${s}"`).join(', ')} (transform-free only).\n` +
  `  "bucket": one of ${BUCKETS.map(b => `"${b}"`).join(', ')}.\n` +
  '  "tags": 3 to 5 lowercase-slug tags.\n' +
  '  "adapt": {"mode":"native"} (or {"mode":"reflow"} only if you ship per-family @container layouts).\n' +
  '  "capacity": {"sweet":N,"soft":N,"hard":N} — the legible card/row counts (comfortable, stretched, hard cap), e.g. {"sweet":4,"soft":6,"hard":8}.\n' +
  '  "css": the scoped stylesheet — every selector under `section.<name>`, palette-blind (var(--…) tokens only, no hex), ' +
  '`--fs-*` type only, NO non-reset margin, the `> .cell-stage` root, cards as `<li>` (or a `<table>` styled via `thead th`/`td`).\n' +
  '  "skeleton": a PURE-MARKDOWN slide (no raw HTML tags — only the `<!-- _class: <name> -->` comment) that invokes the component ' +
  'and exercises it (lists as `- Title` / `  - body`, or a GFM pipe table for a matrix).\n' +
  'Decline ONLY when a TRANSFORM is required — a chart, a diagram, generated/highlighted code, a math render, or a positioned ' +
  'track (timeline/roadmap/journey). Lists, TABLES, prose, and plain fenced code are IN SCOPE — never decline a matrix (it is a ' +
  'table). To decline, return `{"decline": true, "reason": "<one sentence>", "route": "<chart|diagram|code|math|dsl>", ' +
  '"suggestion": "<an existing component or a first-party build>"}`.';

/**
 * Messages for ONE generation request. `similar` (optional, from the dedup pass)
 * is threaded so the model can reuse a near neighbor's pattern rather than
 * reinvent it.
 */
function askComponentMessages(prompt, { similar = [] } = {}) {
  const msgs = [{ role: 'system', content: ASK_SYSTEM }];
  if (similar.length) {
    msgs.push({
      role: 'assistant',
      content: 'Near-neighbor components already in the set (reuse a pattern where it fits):\n' +
        similar.map(s => `• ${s.name} (${s.bucket}) — ${s.description || ''}`).join('\n'),
    });
  }
  msgs.push({ role: 'user', content: String(prompt || '').trim() || 'a clean inventory component' });
  return msgs;
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    const m = String(s).match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

// Turn arbitrary model text into a valid component slug, or '' when unusable.
function slugifyName(text) {
  const s = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^[^a-z]+/, '');
  return s.slice(0, 40).replace(/-+$/, '');
}

// Snap a model value to a known enum (forgiving), else the fallback.
function snapEnum(value, allowed, fallback) {
  const v = String(value || '').toLowerCase().trim();
  return allowed.includes(v) ? v : fallback;
}

// Only operate on actual strings — a non-string model value (number/object)
// must degrade to '' (a fallback), never stringify to "42"/"[object Object]".
const clean = t => (typeof t === 'string' ? t : '').replace(/\s+/g, ' ').trim();
const asStr = (...cands) => { for (const c of cands) if (typeof c === 'string') return c; return ''; };

/**
 * HARD RULE #5 safe auto-fix (spatially-neutral): rewrite an inline card line
 * `- **Title.** body` (or `- **Title** body`) to the nested `- Title` / `  - body`
 * form the engine bolds. This changes markdown STRUCTURE, never layout geometry,
 * so it can't shift the render — the one class of fix the design auto-applies
 * (every SPATIAL fix is flagged + regenerated instead). Returns { skeleton, fixed }.
 */
function fixCardNesting(skeleton) {
  const lines = String(skeleton || '').split('\n');
  let fixed = false;
  const out = [];
  for (const line of lines) {
    const m = line.match(/^(\s*)([-*+])\s+\*\*(.+?)\.?\*\*\.?\s+(.+)$/);
    if (m) {
      const [, indent, bullet, title, body] = m;
      out.push(`${indent}${bullet} ${title.trim()}`);
      out.push(`${indent}  - ${body.trim()}`);
      fixed = true;
    } else {
      out.push(line);
    }
  }
  return { skeleton: out.join('\n'), fixed };
}

// Capture the manifest `adapt` block — mode snapped to a known value (default
// `native`, the universal cqi-scaling + @container reflow path).
function coerceAdapt(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const adapt = { mode: snapEnum(o.mode, ADAPT_MODES, 'native') };
  if (Array.isArray(o.priority)) adapt.priority = o.priority.map(slugifyName).filter(Boolean);
  return adapt;
}

// Capture the `capacity` block (the legible ceiling). Returns null when the model
// gave nothing numeric — the audit then flags it as missing.
function coerceCapacity(raw) {
  const o = raw && typeof raw === 'object' ? raw : {};
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  const sweet = num(o.sweet), soft = num(o.soft), hard = num(o.hard);
  if (sweet == null && soft == null && hard == null) return null;
  const cap = {};
  if (sweet != null) cap.sweet = sweet;
  if (soft != null) cap.soft = soft;
  if (hard != null) cap.hard = hard;
  return cap;
}

/**
 * Spatially-neutral safe auto-fix (§6): add the missing `section.<name>` scope
 * prefix to any selector that doesn't already target the component. Narrowing
 * where a rule applies can't shift geometry WITHIN the component, so it's safe to
 * auto-apply — UNLIKE a margin→padding rewrite. SELF-VERIFYING: the rewrite is
 * accepted ONLY if it provably scopes every selector (re-checked with the gate's
 * own `findUnscopedSelectors`) and the braces stay balanced; otherwise the
 * original is returned untouched and the gate flags the leak (never a corrupting
 * rewrite). Returns { css, fixed }.
 */
function addScopePrefix(css, name) {
  if (!NAME_RE.test(name || '') || !findUnscopedSelectors(css, name).length) return { css, fixed: false };
  const scope = `section.${name}`;
  const scopedRe = new RegExp(`\\.${name.replace(/[-]/g, '\\$&')}(?![\\w-])`);
  let ok = true;
  // The next UNquoted/uncommented `{` at or after `from`, or -1. String- and
  // comment-aware so a brace inside `content:"}"` or a `/* { */` can't be mistaken
  // for a rule opener (the corruption the naive scanner allowed).
  const nextOpen = (s, from) => {
    let str = null, com = false;
    for (let i = from; i < s.length; i++) {
      const c = s[i], n = s[i + 1];
      if (com) { if (c === '*' && n === '/') { com = false; i++; } continue; }
      if (str) { if (c === '\\') { i++; } else if (c === str) str = null; continue; }
      if (c === '/' && n === '*') { com = true; i++; continue; }
      if (c === '"' || c === "'") { str = c; continue; }
      if (c === '{') return i;
    }
    return -1;
  };
  // Index just past the `}` matching the `{` at `open`, string/comment-aware; -1 if unbalanced.
  const matchClose = (s, open) => {
    let depth = 0, str = null, com = false;
    for (let i = open; i < s.length; i++) {
      const c = s[i], n = s[i + 1];
      if (com) { if (c === '*' && n === '/') { com = false; i++; } continue; }
      if (str) { if (c === '\\') { i++; } else if (c === str) str = null; continue; }
      if (c === '/' && n === '*') { com = true; i++; continue; }
      if (c === '"' || c === "'") { str = c; continue; }
      if (c === '{') depth++;
      else if (c === '}' && --depth === 0) return i + 1;
    }
    return -1;
  };
  const rewrite = (str) => {
    let res = '', pos = 0;
    while (pos < str.length) {
      const open = nextOpen(str, pos);
      if (open < 0) { res += str.slice(pos); break; }
      const close = matchClose(str, open);
      if (close < 0) { ok = false; return str; }
      const lead = str.slice(pos, open).match(/^\s*/)[0];
      const prelude = str.slice(pos, open).trim();
      const inner = str.slice(open + 1, close - 1);
      if (prelude.startsWith('@')) {
        const at = prelude.slice(1).split(/[\s({]/)[0].toLowerCase();
        res += lead + prelude + ' {' + (/keyframes|font-face/.test(at) ? inner : rewrite(inner)) + '}';
      } else if (/["']/.test(prelude)) {
        // A quoted attribute selector (e.g. [data-x="a,b"]) can't be comma-split
        // safely — bail the whole fix rather than risk corrupting it (the canon
        // never teaches these; the gate still flags the leak).
        ok = false;
        return str;
      } else {
        const parts = prelude.split(',').map(p => p.trim()).filter(Boolean);
        res += lead + parts.map(p => (scopedRe.test(p) ? p : `${scope} ${p}`)).join(', ') + ' {' + inner + '}';
      }
      pos = close;
    }
    return res;
  };
  const next = rewrite(css);
  // Accept only a provably-clean rewrite — else leave it for the gate to flag.
  if (!ok || findUnscopedSelectors(next, name).length) return { css, fixed: false };
  return { css: next, fixed: true };
}

/**
 * Design audit — the native-ness checks beyond the structural gate, applied to AI
 * output (§6). Advisory findings (the gate is what hard-blocks): a manifest with no
 * `adapt` block (won't reflow for portrait/tall), an incoherent `capacity`
 * (soft ≥ hard), and an oversized stylesheet (a multi-MB `data:` payload slips the
 * exfil denylist). Returns `[{ level, rule, message }]` — shown, never papered over.
 */
function auditComponentDesign(manifest, css) {
  const out = [];
  const m = manifest && typeof manifest === 'object' ? manifest : {};
  if (!m.adapt || !ADAPT_MODES.includes(m.adapt.mode)) {
    out.push({ level: 'warn', rule: 'adapt', message: 'No adapt mode declared — the component may not reflow on a portrait/tall frame. Add adapt:{mode:"native"}.' });
  }
  const cap = m.capacity;
  if (!cap || (cap.sweet == null && cap.soft == null && cap.hard == null)) {
    out.push({ level: 'warn', rule: 'capacity', message: 'No capacity declared — state its legible ceiling, e.g. capacity:{sweet:4,soft:6,hard:8}.' });
  } else {
    // The thresholds must climb: sweet ≤ soft ≤ hard (comfortable → stretched → cap).
    const rungs = [cap.sweet, cap.soft, cap.hard].filter(v => v != null);
    const climbs = rungs.every((v, i) => i === 0 || rungs[i - 1] <= v);
    if (!climbs) out.push({ level: 'warn', rule: 'capacity', message: 'capacity must climb sweet ≤ soft ≤ hard (comfortable → stretched → hard cap).' });
  }
  if (typeof css === 'string' && css.length > MAX_CSS_BYTES) {
    out.push({ level: 'error', rule: 'css-size', message: `Generated CSS is ${Math.round(css.length / 1024)}KB (cap ${MAX_CSS_BYTES / 1024}KB) — likely an embedded data: payload; trim it.` });
  }
  return out;
}

/**
 * Coerce a model reply (object, or JSON string) into a gate-ready draft. Shapes
 * the manifest (slugged name, enum-snapped axes, adapt/capacity), applies the
 * spatially-neutral safe fixes (card-nesting + scope-prefix), and detects a
 * decline. The bridge runs the actual gate
 * (gateComponent + findCssExfil) on the returned css/skeleton — this layer never
 * fakes a pass. Returns:
 *   { ok, decline, manifest, css, skeleton, fixes }
 * where `decline` is `{ reason, route, suggestion }` (or null), `fixes` lists the
 * safe auto-fixes applied, and `ok` = a usable, non-declined draft with a valid name.
 */
function coerceComponent(raw) {
  const obj = (typeof raw === 'string' ? safeParse(raw) : raw) || {};

  if (obj.decline === true || obj.decline === 'true') {
    return {
      ok: false,
      decline: {
        reason: clean(obj.reason) || 'This component needs behavior a transform-free CSS component can’t provide.',
        route: snapEnum(obj.route, ['chart', 'diagram', 'code', 'math', 'dsl'], 'dsl'),
        suggestion: clean(obj.suggestion),
      },
      manifest: null, css: '', skeleton: '', fixes: [],
    };
  }

  const name = slugifyName(obj.name ?? obj.slug ?? obj.title);
  const func = snapEnum(obj.function ?? obj.fn, FUNCTIONS, 'inventory');
  const manifest = {
    name,
    function: func,
    form: snapEnum(obj.form, FORMS, 'panel'),
    substance: snapEnum(obj.substance, CSS_ONLY_SUBSTANCES, 'structure'),
    bucket: snapEnum(obj.bucket, BUCKETS, func),
    tags: Array.isArray(obj.tags) ? obj.tags.map(slugifyName).filter(Boolean).slice(0, 5) : [],
    description: clean(obj.description ?? obj.desc),
    adapt: coerceAdapt(obj.adapt),
    capacity: coerceCapacity(obj.capacity),
  };

  const fixes = [];
  // Safe fix 1 (text): card-nesting.
  const { skeleton, fixed: nestFixed } = fixCardNesting(asStr(obj.skeleton, obj.markdown, obj.sample).trim());
  if (nestFixed) fixes.push('card-nesting');
  // Safe fix 2 (structural): add a missing section.<name> scope prefix (self-verifying).
  const { css, fixed: scopeFixed } = addScopePrefix(asStr(obj.css, obj.styles).trim(), name);
  if (scopeFixed) fixes.push('scope-prefix');

  return {
    ok: NAME_RE.test(name) && !!css && !!skeleton,
    decline: null,
    manifest, css, skeleton, fixes,
  };
}

// Lowercase word tokens for lexical overlap (≥ 3 chars, dedup'd).
function tokenize(text) {
  return [...new Set(String(text || '').toLowerCase().match(/[a-z][a-z0-9]{2,}/g) || [])];
}

/**
 * Lexical dedup ranking — the fallback path when the on-device embedder is
 * unavailable (Safari/mobile/no-CDN/model-off). Scores the request against each
 * catalog component's TOP-LEVEL `name`/`description`/`purpose`/`tags` (the
 * `name` recurs on slots — use the top-level fields only) by token overlap, with
 * a small bucket/tag boost. Returns the top `limit` as
 * `[{ name, bucket, description, score }]` (score > 0 only). Pure + testable; the
 * bridge swaps in cosine ranking over bge-small embeddings when `embed()` works.
 */
function rankSimilar(prompt, catalog, { limit = 3 } = {}) {
  const q = new Set(tokenize(prompt));
  if (!q.size || !Array.isArray(catalog)) return [];
  const scored = catalog.map(c => {
    const tags = Array.isArray(c.tags) ? c.tags : [];
    const hay = tokenize(`${asStr(c.name)} ${asStr(c.description)} ${asStr(c.purpose)} ${tags.join(' ')}`);
    let overlap = 0;
    for (const t of hay) if (q.has(t)) overlap++;
    // A token shared with the name/tags is a stronger signal than one in prose.
    const tagHit = tags.some(t => q.has(String(t).toLowerCase())) ? 1 : 0;
    return { name: c.name, bucket: c.bucket, description: c.description || '', score: overlap + tagHit };
  });
  return scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score || String(a.name).localeCompare(b.name)).slice(0, limit);
}

module.exports = {
  ASK_SYSTEM, COMPONENT_CANON, askComponentMessages, coerceComponent, rankSimilar,
  auditComponentDesign, addScopePrefix, slugifyName, fixCardNesting, MAX_CSS_BYTES,
};
