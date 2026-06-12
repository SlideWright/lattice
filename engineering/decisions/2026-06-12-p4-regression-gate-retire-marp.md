# P4 — retire marp-cli: parity testing → regression testing

**Status:** design (pre-code). Decision captured from the 2026-06-12 discussion;
needs sign-off on the open questions in §7 before implementation.

## 1. Goal

Retire `@marp-team/marp-cli` — the last marp dependency in our tree (Scope 1 of
`2026-06-10-marp-replacement-proposal.md`). The shipped package becomes
marp-free: `npm install @slidewright/lattice` stops pulling marp.

**Out of scope:** marp-vscode (the editor *extension*, Scope 2). The VS Code
preview rides on marp-vscode + `markdown.marp.themes` + `lattice-runtime.js` +
`lattice.css` — **none of which is the `marp-cli` npm package** — so retiring
marp-cli leaves VS Code authoring/preview untouched. Lattice stays a **superset
of marp authoring** (marp warns on unknown front-matter keys but renders), which
is exactly what keeps the marp-vscode "passenger" model working.

## 2. The core shift: parity → regression

Today the gate renders every deck **twice** (lattice-engine + marp) and asserts
they pixel-match. marp is the *external oracle* — "correct" = "matches an
independent renderer." That gate's job was to catch engine↔marp drift **during
the migration** (e.g. the `<h2 id>` compare-code bug). Once marp is gone, the
engine **is** canonical; "diverges from marp" stops being a meaningful concept.

So the gate's nature changes from **parity** (do two renderers agree?) to
**regression** (did our render change from the blessed version?). For a
single-renderer world that is the correct model, not a downgrade.

## 3. The two "…-then-retire" sequences (how we keep the floor objective)

Both exploit that **today the parity gate is green**, so our committed renders
already equal what marp produces — i.e. they're marp-validated *right now*.

1. **Bless-then-retire (goldens).** Freeze today's renders as the golden set
   *while marp still exists*. The baseline is marp-correct by construction. Then
   drop marp. Future re-blesses start from a marp-verified floor.
2. **Benchmark-then-retire (metrics).** The `npm run bench` engine-vs-marp
   numbers need marp-core; Option A removes it. So **record the final
   engine-vs-marp benchmark + the footprint delta as a dated measurement** in
   this note's appendix *before* retiring, then repoint the ongoing benchmark to
   **engine-over-time** (a speed-regression signal, not a vs-marp claim — that
   claim is already made and recorded).

## 4. The regression gate

### Goldens — reuse the committed gallery PDFs, don't add an image tree
We already commit `*.gallery.{light,dark}.pdf` for every component + bucket (65
each). **Those are the goldens.** The gate rasterizes the committed PDF and a
fresh render and pixel-diffs — no new committed PNG tree to bloat the repo. This
is a direct repurpose of `tools/engine-parity.mjs`, which already rasterizes +
diffs (with tolerance `FAIL_FRACTION = 0.05%`, channel delta > 8); it just diffs
against the committed PDF instead of a marp render.

### `bless` — the primitive
`npm run bless [-- <deck>]` re-renders the affected decks and overwrites the
committed golden PDFs. Mechanical + automated. (This is essentially today's
`build:galleries` rebuild, named for intent.)

### The CI-driven review + bless loop (chosen flow)
The gate is **CI-enforced** (a red gate blocks merge, like every other check),
and the review/bless happens **in CI** — not reliant on contributors having the
render toolchain locally:

1. Gate runs on the PR; renders fresh, diffs vs committed golden PDFs.
2. On drift it builds a **single diff-montage PDF of only the changed slides**
   (each page: before │ after │ diff-overlay) and uploads it as a workflow
   artifact — extending the existing `engine-parity-diffs` artifact upload. It
   posts a summary comment: "*N slides drifted across {kpi, stats}; see
   diff.pdf*."
   - **Why a PDF, not N inline images:** the diff count == changed-slide count —
     a handful for a targeted change, but **dozens-to-hundreds for a shared-CSS
     change**. Loose PNGs don't scale; one montage PDF the reviewer flips through
     does. (`rasterize-for-review.sh --overview` / ImageMagick `montage` already
     build contact sheets.)
3. A **maintainer** inspects the montage and, if the change is intended +
   correct, approves via a controlled trigger (PR label e.g. `bless-ok` or a
   `/bless` comment — restricted to maintainers; see §7).
4. A CI job runs `bless`, commits the updated golden PDFs to the PR branch; the
   gate re-runs green. The committed golden change is itself the reviewable
   record in the PR diff.

**No merge ever bypasses the gate.** Intended changes (net-new components,
improvements to existing ones — which we will absolutely do) go green by
*blessing*, and the bless is gated by maintainer inspection. Pure regressions
(unblessed drift) stay red. Same gate for everything; the bless is the universal
"this change is intended" signal.

**Automated vs human:** the *re-render* is automated (`bless`); the *"is the new
look correct?"* judgment stays human (maintainer inspecting the montage + the
committed-golden diff in the PR). No tool can answer "is it good," only "did it
change" — that split is the point.

## 5. What changes in the tree (migration inventory)

- `package.json`: remove `@marp-team/marp-cli` from `dependencies`. (Option A:
  nothing added back — no marp anywhere.)
- `tools/engine-parity.mjs` → the regression gate (diff vs committed golden PDF;
  add `--bless`). Rename to reflect "regression," not "parity."
- The marp render path retires: `test/helpers/render.js` + the ~6
  `test/integration/parity/*.test.js` + `test/integration/galleries/marp.gallery.test.js`
  drop their `npx marp` spawns. The *engine* assertions stay (now self-checks /
  golden-backed); the *marp comparison* assertions are removed.
- `test/benchmark/engine-bench.mjs`: record the final marp comparison (§3.2),
  then strip the `@marp-team/marp-core` import; the ongoing bench tracks
  engine-over-time.
- 2 unit tests import marp-core (`test/unit/engine/engine.test.js`,
  `test/unit/parsing/marp-plugins.test.js`) — re-point to golden/engine-only
  assertions or delete the marp-comparison cases.
- `.github/workflows/ci.yml`: the `engine-parity` job → the regression gate; add
  the montage-artifact + the bless-on-approval job.
- `marp.config.js` **stays** (shipped for marp-vscode + BYO-marp-cli authors).
  The marp-vscode compatibility shims in CSS (`marp.scaffold.css`, the
  `:is(pre, marp-pre)` carve-outs, twemoji `:not(.emoji)`) **stay** — the
  documented Scope-1 tax.

## 6. Metrics (capture before retiring; the user asked)

- **Footprint delta — the P4 win.** Measure a clean `npm install` *with* vs
  *without* marp-cli: MB removed from `node_modules`, packages removed from the
  tree, install-time delta. Honest delta (puppeteer + markdown-it are shared and
  stay), not the raw 42 MB `du`.
- **Final engine-vs-marp benchmark** (`npm run bench`) — recorded, dated, in the
  appendix, as the last word on "we were faster than marp."
- **Ongoing:** engine self-speed (the bench, marp stripped) as a perf-regression
  signal.

## 7. Open questions (need sign-off before code)

1. **Golden env-stability — the real technical risk.** A regression gate diffs a
   *fresh* render (CI env) against a *committed* golden (whatever env blessed
   it). Unlike the old parity gate — which rendered both sides in the *same* CI
   run, so font/Chromium drift cancelled — golden drift does **not** cancel.
   Mitigations to pick: (a) pin the render env hard (Chromium + fonts) so blessed
   == CI; (b) always `bless` *in CI* (goldens only ever generated in the CI env);
   (c) lean on the existing 0.05% tolerance to absorb sub-pixel AA. Likely (b)+(c).
2. **Bless trigger security.** Who can fire `bless-ok` / `/bless`? Must be
   maintainer-only (a contributor must not self-approve a golden change). GitHub
   Action with an actor/permission check.
3. **PDF goldens vs PNG goldens.** Reusing committed PDFs avoids an image tree
   but couples the gate to PDF rasterization determinism. Alternative: commit
   per-slide PNGs (bigger repo, simpler diff). Lean PDF-reuse + (b) above.
4. **Test-migration size.** ~10 files lose their marp comparison. Confirm none
   asserts something *only* a second renderer can (audit before deleting).

## 8. Recommendation

Option A (full excision, regression gate) with **bless-then-retire** +
**benchmark-then-retire**, the **PDF-golden / CI-driven montage-review / bless**
loop above, resolving §7.1 via "bless in CI + keep the tolerance." This delivers
the marp-free shipped package, keeps a strict CI gate, and makes intended visual
changes a one-approval flow — with the objective floor preserved by blessing
while marp is still here to validate it.
