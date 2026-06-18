---
status: proposed
summary: Decision to make each layout's content capacity a structured manifest fact and lint-enforced contract rather than buried prose
---

# Content-capacity contract — make layout size a manifest fact, not buried prose

**Status:** decided 2026-06-17. Owns the **direction**; the execution lands on
`claude/llm-layout-content-density-996iez` referencing it. `design/design-system.md`
owns the component model this slots into; the manifest schema
(`lib/components/manifest.schema.json`) owns the field shape; `lib/authoring/lint-core.js`
owns the enforcement.

---

## 1. The problem

An LLM that knows Lattice picks a `_class` from the searcher vocabulary
(tags → `whenToUse` → `antiPatterns`, per `AGENTS.md`) **without reasoning about
how many elements the content actually has**. It reaches for `cards-grid`,
`list-tabular`, `compare-table`, or a `verdict-grid` and then pours eight, twelve,
twenty items into a layout designed for three or four. The slide **overflows** —
caught only at render time by the runtime overflow watcher
(`scrollHeight > clientHeight` → red ring), long after the layout was chosen.

The information needed to avoid this **already exists** — but only as English buried
in each manifest's prose:

- `cards-grid`: *"Avoid for more than 4 items — split into multiple slides."*
- `list-steps`: *"Three to five steps. Two wastes the layout's ledger feel; six begins to crowd."*
- `stats`: *"Past five tiles the row compresses and the numbers shrink below boardroom legibility."*
- `actors`: *"Three to six actors… past that, split the roster."*
- `compare-table`: *"More than 6 rows… the table density crowds the slide."*

This is **capacity as prose, not as contract**. Prose is skimmable, unstructured,
unenforced, and free to drift from what the layout actually tolerates. Nothing
counts the slide's elements against it. The fix is to **promote capacity to a
structured, machine-readable, enforced fact** keyed to the axis the layout is
already built on.

## 2. The key insight — capacity rides the axis rail that already exists

Every manifest already declares **`focusAxes`** (`item` / `row` / `col` / `cell` /
`line`), and `lib/core/collections.js` already counts exactly those axes for the
focus and narrative-build engines (`resolveAxisHtml` returns `{ inner, count }`).
So capacity is **not a new subsystem** — it is one more fact keyed to the same
axis, counted by the kernel that already counts. A `cards-grid` crowds along its
`item` axis; a `compare-table` along its `row` axis; a `kanban` along its `col`
axis. The contract names the axis and its bounds; enforcement reuses the existing
collection walker (HARD RULE 15 — reuse, don't clone).

## 3. Decision

### 3.1 A `capacity` block in the manifest (single source of truth)

```jsonc
"capacity": {
  "axis": "item",            // the collection that drives crowding (a focusAxes member)
  "min": 3,                  // below this the layout looks starved (advisory)
  "sweet": 4,                // the ideal count (surfaced to the author/agent)
  "soft": 6,                 // past here it begins to crowd → soft warning
  "hard": 8,                 // past here it overflows / loses legibility → hard warning
  "escalateTo": ["cards-stack", "split across slides"],  // where to send the overflow
  "note": "the grid loses scannability past 4 cards"     // human consequence
}
```

- **`axis`** names the collection the layout is built on. Where the layout
  declares `focusAxes`, the validator requires the axis to be one of them (it
  rides the same rail). Where it doesn't, the axis must still be a valid
  `SUPPORTED_AXES` member **and** — the stronger guard — be **measurable in the
  component's own `sample`/`skeleton`**: `validate()` runs `countPrimaryCollection`
  on the exemplar and rejects an axis that counts 0, so an inert contract (e.g.
  `col` on a layout authored as a nested list) can't ship.
- **`min` / `sweet` / `soft` / `hard`** are element counts. `min ≤ sweet ≤ soft ≤
  hard`. `min` and `sweet` are advisory (surfaced, never warned-on below `min` for
  now — an underfull slide is a softer problem than an overflow). `soft` and `hard`
  drive the two warning levels.
- **`escalateTo`** is the actionable fix the warning prints — a sibling component
  and/or "split across slides", drawn from the manifest's existing `related`
  pointers where possible.
- **`note`** is the one-line human consequence (reused to generate the prose, §3.3).

### 3.2 Three consumers, one declaration

1. **Agent-facing.** `capacity` is emitted into `dist/docs/components.json`, so the
   LLM reads structured bounds **while choosing** — not buried prose it skims.
   `AGENTS.md` gains a "count first, then filter by capacity" selection step.
2. **Enforcement (warn).** A lint/`validate()` rule counts the slide's primary
   collection and emits a warning when the count exceeds `soft` (soft) or `hard`
   (hard), printing `escalateTo` as the fix. Counted two ways (§3.4).
3. **Anti-drift.** The capacity numbers and `note` become the source the prose
   ranges are checked against, the same pattern as the ownership/capabilities
   gates — the contract and the docs cannot silently disagree.

### 3.3 Scope — **count first, density next** (locked)

v1 models **element count per axis only**. This is the dominant overflow cause
("picks a layout without thought on the *number* of elements") and is cleanly,
deterministically machine-countable.

**Per-item text density** (a card with a three-sentence body overflows where four
short labels don't) is real but deferred to **phase 2** as an optional `perItem`
sub-block (`{ maxLines, wants }`). Density thresholds depend on render conditions
that are noisy in this sandbox (serif fallback vs. real webfont — see
`engineering/gotchas.md`, wrap width, theme), so they need their own calibration
pass and shouldn't gate shipping the count contract.

```jsonc
// phase 2 (not in v1):
"capacity": { "...": "...", "perItem": { "maxLines": 2, "wants": "short label + one-line body" } }
```

### 3.4 Counting — **both live-approximate and render-exact** (locked)

- **Live (approximate).** `lib/authoring/lint-core.js` stays pure/fs-free, so it
  gets a lightweight **top-level** counter (count `^[-*] ` / `^\d+\. ` bullets at
  column 0, or `|`-delimited table rows minus header/separator). Instant in the
  CLI (`lint:deck`) and the Drawing Board's Architect panel, before any render.
  Approximate on deeply nested card-style lists, and honest about it.
- **Render-exact (authority).** `countAxis(html, axis)` in
  `lib/core/collections.js` counts the resolved HTML via the **same walkers the
  renderer uses** (`directChildren`/`allRows`/`rowCells`/`splitCodeLines`), so an
  authoritative count can't drift from what actually overflows.

**Status of the two paths (be precise):** the live path is **wired and shipping**
(CLI + Drawing Board). The render-exact path ships as a **tested primitive**
(`countAxis` + `test/unit/core/collections-count.test.js`); its **render-time
consumer is staged** — nothing calls `countAxis` in production yet. `validate()`
is the *manifest* validator (it uses the markdown counter on the exemplar to guard
inert axes), not a per-slide render-time counter. So today the authority is the
primitive; the gate that consumes it is §5 step 3's remaining work, not done.

### 3.5 Enforcement teeth — **warn + agent contract** (locked)

The contract is **advisory**, not blocking:

- The structured field lets the LLM pick correctly *up front* (fixes the decision,
  not just catches the symptom).
- The lint warning (with `escalateTo`) catches the slips.
- The runtime overflow watcher remains the render-time ground-truth advisory.

We deliberately do **not** hard-fail over-capacity decks in CI: the six
long-running galleries (HARD RULE 8) and `stressSample` slides *intentionally*
push layouts past their comfortable limits, and a blocking gate would criminalize
those legitimate stress-tests and demand a bypass hatch that's an easy footgun.
If the slip rate stays high later, promoting the `hard` threshold to a blocking
gate is a deliberate, separate step — but starting blocking would fight the
gallery workflow on day one.

**Known coupling (deliberate).** A unit gate already asserts *every committed
deck is lint-clean with no warnings* (`lint-deck.test.js`), and it walks
`examples/` + the galleries. So a committed deck can't carry a live capacity
warning — which means (a) thresholds are calibrated against the committed corpus
(that corpus is the oracle: a too-tight threshold reds the gate, as cards-stack
did in development), and (b) the demo deck (§5 step 6) shows the warning as
*static text*, since a live-firing deck can't be committed clean. This is the
advisory model working as intended, not a defect: the warning lives in the
authoring loop, not in shipped artifacts.

## 4. Calibration — set the numbers honestly, don't guess

The declared bounds are only useful if they match where layouts actually break.
Two evidence sources, not invention:

1. **Existing prose ranges** — most manifests already state a range ("three to
   six", "2–4"); those seed `sweet`/`soft`/`hard` directly.
2. **The overflow watcher as oracle** — render a layout at increasing N and read
   where the watcher trips. The 2026-06-06 layout audit already logged real break
   points ("actors overflows at 5 rows"). A small `tools/calibrate-capacity.js`
   (renders N = min…N+ via the emulator, rasterizes, reports the first overflowing
   count) turns this into a repeatable check rather than a one-time guess. Built
   on the existing render + overflow machinery, not a new renderer.

## 5. Staged plan (this branch)

| # | Step | Status |
|---|---|---|
| 1 | **Schema + validator** — `capacity` in `manifest.schema.json`; `validate()` checks axis (∈ focusAxes when declared), non-decreasing bounds, required soft+hard, unknown keys, and **axis measurability in the sample** | ✅ done |
| 2 | **Seed manifests** — the 10 worst offenders (`cards-grid`, `cards-stack`, `stats`, `list-steps`, `verdict-grid`, `compare-table`, `actors`, `agenda`, `checklist`, `kanban`) | ✅ done |
| 3a | **Live lint rule** — markdown counter in `lint-core.js`, `capacity-crowd`/`capacity-overflow` with `escalateTo`, in CLI + Drawing Board | ✅ done |
| 3b | **Render-exact primitive** — `countAxis` in `collections.js` + tests | ✅ done |
| 3c | **Render-exact *consumer*** — a render/export-time gate that calls `countAxis` and surfaces the authoritative warning | ⏳ deferred |
| 4 | **Generator** — emit `capacity` into `components.json`; generated "Capacity" line in `<name>.docs.md` | ✅ done |
| 5 | **Agent guidance** — `AGENTS.md` "count first, then filter by capacity" | ✅ done |
| 6 | **Demo deck** — `examples/content-capacity.md` (+ committed PDF) | ✅ done (warning shown as text — see §3.5 coupling) |
| 7 | **Docs + changelog** — `design/design-system.md` capacity note; `CHANGELOG.md` | ✅ done |
| 8 | **Calibration tool** — `tools/calibrate-capacity.js` (render at increasing N, read the overflow-watcher oracle); the v1 numbers are seeded from prose, not yet oracle-validated | ⏳ deferred |
| 9 | **Prose-drift gate** — check the handwritten `whenToUse`/`antiPatterns` ranges against the numbers (the generated Capacity line already can't drift; the prose can) | ⏳ deferred |
| 10 | **Backfill** — the remaining ~42 components | ⏳ ongoing |

The ⏳ items are real follow-ups, not silently dropped scope; they stay on this
feature (HARD RULE 17 — increment in place, one PR) or a clearly-scoped successor.

## 6. Non-goals / what this does NOT commit to

- **Not modeling per-item density in v1** — count only; `perItem` is phase 2.
- **Not blocking CI** — advisory warnings only; galleries/`stressSample` stay free
  to push limits.
- **Not a new renderer or measurement engine** — enforcement reuses
  `collections.js`; calibration reuses the emulator + overflow watcher.
- **Not auto-rewriting decks** — the warning suggests `escalateTo`; the author (or
  agent) makes the change.

## 7. Relationships

- **Builds on** `2026-06-16-form-manifest-medium-independent-contract.md` (manifest
  as validated contract) and `2026-06-16-focus-highlighting.md` /
  `2026-06-16-narrative-step-model.md` (the axis + `collections.js` kernel capacity
  rides).
- **Complements** the runtime overflow watcher (`lib/runtime/index.js`) and the
  advisory `check:overflow` gate — those catch overflow *after* render; this steers
  the layout choice *before* it.
- **Informed by** the `2026-06-06-layout-audit/` break-point findings.

## 8. Gates

Schema validator + lint-rule + `countAxis` unit coverage; the manifest
measurability guard green; `npm run lint` (exit 0), full unit suite,
`build:check` (artifacts fresh), and the integration tier all green; the
"every committed deck lint-clean" gate green (confirms no committed deck trips
capacity — see §3.5); maker-checker (inspection + assessment) folded in before
commit. The prose-drift gate (§5 step 9) is **deferred**, so it is not a gate
here yet.
