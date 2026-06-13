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
   §A *before* retiring, then repoint the ongoing benchmark to
   **engine-over-time** (a speed-regression signal, not a vs-marp claim — that
   claim is already made and recorded).

## 4. The gate + the bless flow (GitHub-native, local-bless)

The flow is deliberately simple — **no bot writes to the branch, no custom
approval trigger.** It maps to mechanics that already exist.

**Goldens — reuse the committed gallery PDFs.** We already commit
`*.gallery.{light,dark}.pdf` for every component + bucket (65 each). **Those are
the goldens.** No new image tree to bloat the repo.

**`bless` is LOCAL — and is already how Lattice works.** When you change a
layout you run `npm run bless [-- <deck>]` (re-render the affected galleries =
new golden PDFs) and commit them *in the same PR*. The pre-commit hook already
auto-rebuilds staged decks, so this is mostly today's flow, named for intent.

**The PR flow:**

1. Author changes a layout, blesses locally, commits the updated golden PDFs in
   the PR branch.
2. **CI regression gate** (`tools/engine-parity.mjs` repurposed): renders fresh,
   asserts `render == the committed golden`. Green = the author blessed
   correctly; **Red = unblessed drift** — they changed CSS/source but a deck's
   committed PDF is stale. This is the safety net: nothing reaches main with a
   render that doesn't match its committed golden.
3. **CI before/after job:** diffs the PR's golden PDFs against main's, posts the
   result on the PR — **inline PNG previews** of the changed slides in a comment
   + the full **diff-montage PDF (changed slides only, before │ after │ overlay)
   as a downloadable artifact** (extends the existing `engine-parity-diffs`
   upload). The diff count == changed-slide count — a handful for a targeted
   change, dozens-to-hundreds for a shared-CSS change — so a montage beats N
   loose images. The author/reviewer flips through one doc.
4. Human looks at the before/after, then merges.

**Who "blesses" / approves, by shop size:**

- **Solo (today):** committing the goldens + reading the CI before/after PDF
  **is** the sign-off. (GitHub blocks self-approval, so a *required*-review rule
  would only block a solo author — don't enable it yet.) The gate (render ==
  golden) still enforces no unblessed drift.
- **Team (later):** flip on branch-protection "require 1 approving review" — a
  **one-line GitHub setting, no code change.** An intended visual change then
  needs a second contributor to read the before/after PDF and approve. The CI
  comment is already the review surface.

**Automated vs human:** the *re-render* is automated (`bless`); the *"is the new
look correct?"* judgment stays human (reading the before/after). No tool can
answer "is it good," only "did it change" — that split is the point.

## 5. What changes in the tree (migration inventory)

- `package.json`: remove `@marp-team/marp-cli` from `dependencies`. (Option A:
  nothing added back — no marp anywhere.)
- `tools/engine-parity.mjs` → the regression gate (diff a fresh render vs the
  committed golden PDF; add `--bless` to overwrite goldens). Rename to reflect
  "regression," not "parity."
- The marp render path retires: `test/helpers/render.js` + the ~6
  `test/integration/parity/*.test.js` + `test/integration/galleries/marp.gallery.test.js`
  drop their `npx marp` spawns. The *engine* assertions stay (now golden-backed);
  the *marp comparison* assertions are removed.
- `test/benchmark/engine-bench.mjs`: record the final marp comparison (§3.2 /
  §A), then strip the `@marp-team/marp-core` import; the ongoing bench tracks
  engine-over-time.
- 2 unit tests import marp-core (`test/unit/engine/engine.test.js`,
  `test/unit/parsing/marp-plugins.test.js`) — re-point to golden/engine-only
  assertions or delete the marp-comparison cases.
- `.github/workflows/ci.yml`: the `engine-parity` job → the regression gate +
  the before/after-PDF comment job. **No bless-on-approval / bot-commit job** —
  bless is local.
- `marp.config.js` **stays** (shipped for marp-vscode + BYO-marp-cli authors).
  The marp-vscode compatibility shims in CSS (`marp.scaffold.css`, the
  `:is(pre, marp-pre)` carve-outs, twemoji `:not(.emoji)`) **stay** — the
  documented Scope-1 tax.

## 6. Metrics (capture before retiring; recorded in §A)

- **Footprint delta — the P4 win.** A clean `npm install` *with* vs *without*
  marp-cli: MB removed from `node_modules`, packages removed, install-time delta.
  Honest delta (puppeteer + markdown-it are shared and stay), not the raw 42 MB.
- **Final engine-vs-marp benchmark** (`npm run bench`) — dated, the last word on
  "we were faster than marp."
- **Ongoing:** engine self-speed (the bench, marp stripped) as a perf-regression
  signal.

## 7. Open questions (need sign-off before code)

1. **Golden env-stability — the real technical risk, and the one to validate
   empirically.** Today's parity gate renders both sides in the *same* CI run,
   so font/Chromium drift cancels. A regression gate diffs a *fresh CI* render
   against a *locally-blessed* committed golden, so author-env↔CI-env drift does
   **not** cancel. Mitigations already in our favor: the emulator **embeds**
   self-hosted fonts into the PDF (deterministic type), Chromium is
   puppeteer-pinned, and the existing **0.05% tolerance** absorbs sub-pixel AA.
   First implementation step is to *measure* whether locally-blessed goldens are
   stable against a CI render. **If not**, the targeted fallback is "bless in CI"
   (a label triggers CI to regenerate just the goldens) — reintroducing a little
   machinery only where proven necessary.
2. **PDF goldens vs PNG goldens.** Reusing committed PDFs avoids an image tree
   but couples the gate to PDF rasterization determinism. Lean: PDF-reuse, revisit
   only if §7.1 forces it.
3. **Test-migration audit.** ~10 files lose their marp comparison. Confirm none
   asserts something *only* a second renderer can before deleting.

*(The earlier "bless-trigger security" question is gone — bless is local, so CI
never writes to the branch and there's nothing to gate.)*

## 8. Recommendation

Option A (full excision, regression gate) with **bless-then-retire** +
**benchmark-then-retire**, and the **local-bless / CI-posts-before-after-PDF**
flow above. It delivers the marp-free shipped package, keeps a strict CI gate
(render == committed golden), makes intended changes a commit-the-goldens flow
the repo already half-runs, and scales from solo (bless = sign-off) to team
(add required-review, a setting). Validate §7.1 first; it's the only real risk.

## A. Recorded measurements (filled at implementation, pre-retirement)

- Footprint: install size + package-count delta, with vs without marp-cli — _TBD_
- Final `npm run bench` engine-vs-marp table — _TBD_
- Date / commit of the marp-validated golden freeze — _TBD_
