# P4 — retire marp-cli: parity testing → regression testing

**Status:** design (pre-code), de-risked. The 2026-06-13 spike resolved the one
real technical risk (golden env-stability — §7.1) positively; only the §7.3
test-migration audit remains, and that's done during implementation. Ready to
build.

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
the goldens.** No new image tree to bloat the repo. The gate compares them by
**rasterizing to pixels and diffing with tolerance — never by PDF bytes** (PDFs
aren't byte-reproducible; pixels are — see the §7.1 spike).

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

## 7. Open questions

### Resolved by the 2026-06-13 spike

1. **Golden env-stability — RESOLVED (positive).** Measured directly: rendered
   `featured`, `kpi`, `compare-code`, `big-number` galleries fresh in a *new*
   sandbox session and diffed against the goldens committed in a *prior* session.
   Result: **0 pixels differ beyond tolerance** (ImageMagick `-fuzz 3%`, ≈ the
   gate's channel-delta-8) on the worst page of all four. Cross-session pixel
   output is deterministic, so locally-blessed goldens are stable enough for the
   gate. The "bless in CI" fallback is **not needed**. (Embedded fonts + pinned
   Chromium + the 0.05% tolerance carry it, as predicted.)

   **→ Design rule this forces: the gate compares rasterized *pixels* with
   tolerance, NEVER PDF *bytes*.** The same spike showed the PDFs are *not*
   byte-reproducible (md5 differs every render — timestamps, object/font-subset
   ordering), so a byte-diff would false-fail 100% of the time. Pixels are
   deterministic; bytes are not. `engine-parity.mjs` already rasterizes, so this
   is the natural path — but it's the trap a naive "diff the committed PDF" gate
   would fall into.

2. **PDF vs PNG goldens — DECIDED: reuse the committed PDFs.** Since pixels are
   deterministic but PDF bytes aren't, the gate rasterizes the committed PDF
   on-the-fly and pixel-diffs (tolerance). PDFs are already committed for human
   review; their byte-churn on rebuild is the pre-existing status quo; a separate
   PNG tree would only buy byte-stable goldens we don't gate on anyway (we need
   AA tolerance regardless). No new image tree.

### Still open

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

- Footprint: install size + package-count delta, with vs without marp-cli — _TBD (Step 3)_
- Final `npm run bench` engine-vs-marp table — _TBD (Step 3)_
- **Date / commit of the marp-validated golden freeze — 2026-06-13, on
  `claude/p4-regression-gate-retire-marp-grqv14` (rebased onto `main`
  `860c086`).** All 65 galleries × {light,dark} were re-blessed with the
  current self-hosted font set (post-#226, which added `outfit-300/500/600` +
  `shantell-500`) — the prior goldens (#213) predated it and read as ~5.8% drift
  on text. `npm run parity` was green (engine == marp) at the freeze, so the
  frozen goldens are marp-validated. The regression gate (`npm run regress`) is
  green across the full corpus against this freeze.

### Step 1 — done (2026-06-13)

The regression gate ships: `tools/regression-gate.mjs` (`npm run regress`,
`npm run bless`), reusing `pixel-check.js`'s comparator (now `pixelDiff` +
a `fuzz` tolerance), `build-galleries.js` `injectDark`, and the builders as the
bless primitive. Verified: (a) full corpus GREEN vs the re-blessed goldens;
(b) a CSS tweak without bless goes RED, GREEN after revert/bless; (c) `npm run
parity` agrees (both all-green) — the gate is as strict as the marp gate.
**Gotcha worth keeping:** the emulator resolves a deck's relative asset paths
(`![bg](sample.svg)`, logos) against the OUTPUT pdf's directory, so the gate
must render the fresh candidate INTO the gallery's own dir or every image slide
false-fails blank. **Steps 2 (CI) and 3 (retire marp) remain.**

### Step 2 — done (2026-06-13)

The gate is wired into CI as a **required check**, plus the reviewer's
before/after surface. The gate runs **full-corpus per-PR** (not
affected-scoped). This is a deliberate maintainer decision that **overrides §D
of `2026-06-13-gate-strategy-change-detection.md`**, which had recommended a
scoped-per-PR + full-corpus-nightly hybrid: in practice the maintainer's
sessions are opportunistic and cross-cutting, so almost every PR carries an L3
change that a scoped run would escalate to full anyway — scoping would buy
little while risking the bucket-vs-component gallery-name collision that doc's
checker addendum flagged. Scoping (and the merge-queue + render caching that
would serialize the parallel-session cost) is deferred until that cost is
measured pain.

- **`.github/workflows/ci.yml`** — two jobs. `regression` (gating, in the `ci`
  required aggregator, `code`-tier): Chromium + poppler + emoji font, runs
  `npm run regress`, uploads the drift montage on RED. `golden-diff`
  (**non-gating**, PR-only, `code`-tier): no Chromium — rasterizes the committed
  goldens, diffs THIS PR's against `base.sha`, and posts/updates a sticky PR
  comment via `actions/github-script` (`pull-requests: write`, `continue-on-error`
  so a read-only fork token can't fail the run) with the before│after│overlay
  montages embedded **inline** (fulfilling §4's "inline PNG previews"). Inline
  comment images need a GitHub-served URL, so a `publish` step (`contents: write`,
  same-repo only) pushes the PNGs to the orphan **`ci-drift-images`** branch (a
  never-merged image store, `pr-<num>/<sha>/…`) and the comment links
  `raw.githubusercontent.com` URLs; the full set also uploads as the
  `golden-diff-changes` artifact (and is the fork-PR fallback). `engine-parity`
  keeps running in parallel — removed in Step 3.
- **`tools/golden-diff.mjs` (new)** — the before/after computer. `git diff` is
  only the cheap candidate filter; the pixel-diff (gate tolerance: fuzz 3% /
  0.05%) is the truth, so PDF byte-churn from a rebuild reads as "no visual
  change". Emits `summary.md` (comment body) + `report.json` (incl. `inlineMontages`,
  capped at 8, most-changed gallery first) + per-slide `montages/*.png` + `changes.pdf`.
- **`tools/pixel-check.js`** — extracted `montageTriptych` + `pngsToPdf`
  (HARD RULE 15); `regression-gate.mjs`'s `buildMontage` now calls them, and the
  gate's per-page montages gained a `deck · mood · slide N` caption.
- **CI gotcha encoded:** IM6's default `policy.xml` blocks the PDF coder, which
  would break `convert montages… .pdf`; both jobs relax it
  (`rights="none" pattern="PDF"` → `read|write`).
- No `package.json` script for `golden-diff` (it's CI-only) — avoids re-staling
  the emulator bundle (which inlines `package.json`); `capabilities.md` indexes
  it from the tool header.

**Cross-machine golden stability — the §7.1 gap, found on the gate's CI runs (the
key Step-2 finding).** The gate ran green on every sandbox machine but RED in CI
— and the drift was **flaky across runners**: run 1 drifted the `diagram` bucket
(0.45% / 4pg); run 2 had `diagram` green but `imagery` — a *flat* bucket — drift
**2.01%** on 1 page. Excluded every boring cause: goldens not stale (green across
sandbox machines), fonts correctly embedded (Playfair/Outfit/JetBrainsMono, no
fallback), Chromium identical (both bless + CI use Chrome-for-Testing
`131.0.6778.204`). The residue is **Skia's CPU-dispatched rasterization differing
by runner CPU** — sub-pixel AA on fine vector *and* image content, intermittently
(a different gallery each run, on GitHub's heterogeneous runners). The §7.1 spike
measured "0px cross-*session*" but only same-machine-class; it never tested
across runner CPUs. **This is not bucket-localized, so per-bucket tolerance is
whack-a-mole with an unknown, flaky ceiling** (the `FAIL_FRACTION_MERMAID = 1%`
floor for chart+diagram fixed `diagram` but `imagery` then surfaced at 2%).

**Resolution (maintainer decision): the regression gate is ADVISORY in Step 2 —
it runs and uploads its drift montage on every code PR, but is NOT in the
required `ci` gate.** No coverage is lost: **`engine-parity` is still the hard
visual gate throughout Step 2**, so this gate only needs to *prove itself* in
advisory mode. **Step 3 owns the cross-runner determinism fix** — pin Skia off
its CPU-feature path with deterministic raster flags (`--disable-skia-runtime-opts`
+ `--font-render-hinting=none` + `--disable-lcd-text` + `--force-color-profile=srgb`;
spot-tested a no-op on the sandbox, so likely no re-bless), validated across
several CI runs — and only then promotes `regression` into the required `ci`
gate, as `engine-parity` is removed. The `FAIL_FRACTION_MERMAID` floor stays as a
partial mitigation that keeps the advisory signal cleaner meanwhile. Considered
and rejected for Step 2: a high global tolerance (~3–4%) — loosens the gate
broadly against a flaky ceiling; and baking the raster flags in *now* — it
changes the *product's* render path and needs multi-run CI validation, which
belongs in the focused Step-3 effort, not bolted onto Step 2. **Step 3 (retire
marp + harden + promote the gate) remains.**

## 9. Build handoff — START HERE (for the implementing session)

**State on arrival (2026-06-13):** P1 (lib/engine), P2 (emulator on lib/engine,
parseSlide deleted), P5 (owned CSS emitter, iOS-validated) are all merged on
`main`. This note's design + the §7.1 spike are merged. **Nothing in this build
has started.** `@marp-team/marp-cli` is still a runtime `dependency`; the
marp-parity gate (`npm run parity` → `tools/engine-parity.mjs`, CI job
`engine-parity`) is still live and green.

**Goal:** ship the regression gate, then retire `@marp-team/marp-cli` so the
installed package is marp-free. **marp-vscode stays** (Scope 2 — the VS Code
preview; untouched).

**Sandbox:** read CLAUDE.md § "Cloud sandbox" first. Renders need `CHROME_PATH`
(SessionStart hook exports it; re-export if you see "no suitable browser").

**Decisions already locked — do NOT relitigate (see §2–§8):**
- Gate is **regression** (fresh render vs committed golden), not parity.
- Compare **rasterized pixels with tolerance, NEVER PDF bytes** (PDFs byte-churn
  from timestamps; pixels are deterministic — §7.1 proved 0 px drift cross-session).
- Goldens = the **committed gallery PDFs** (reuse; no PNG tree).
- **bless is LOCAL** (rebuild + commit the PDF); CI never writes goldens.
- Review = **CI posts before/after** (diff-montage PDF artifact + summary comment);
  a human looks before merge (solo: bless = sign-off; team: turn on
  branch-protection required-review — a setting, no code).
- **bless-then-retire** + **benchmark-then-retire**: freeze marp-validated goldens
  and record the final `npm run bench` + footprint numbers WHILE marp still
  exists, then remove marp.

**Reuse — HARD RULE 15, do not reinvent:**
- `tools/pixel-check.js` — its two-stage comparator (byte → pdftoppm + ImageMagick
  `compare` per page; "0 changed pixels = OK, byte drift is timestamp noise"). The
  comparator to lift/share.
- `tools/engine-parity.mjs` — `galleryDecks()` (the corpus), `FAIL_FRACTION`
  (0.05%), the rasterize/diff patterns.
- `tools/build-galleries.js --only <name>` — rebuild one gallery (light+dark) =
  the bless primitive. (`injectDark` lives here for the dark variant.)
- `tools/rasterize-for-review.sh --overview` — contact sheet for the montage.

**Build order (one PR per step):**

*Step 1 — regression gate (marp stays as the safety net).*
- `tools/regression-gate.mjs` (or extend build-galleries): per gallery (light +
  dark) render fresh to a tmp path, `pixelDiff` vs the committed golden PDF, fail
  on any page over tolerance. Flags: `--only`, `--bless` (→ build-galleries).
- **Verify three things:** (a) full corpus is GREEN (committed goldens already ==
  fresh renders; §7.1 confirmed 4 — do all 65×2); (b) it goes RED when you tweak a
  layout's CSS without blessing (proves it catches drift), then green after
  `--bless`; (c) it AGREES with `npm run parity` across the corpus (same pass/fail
  set) — this proves the regression gate is as strict as the marp gate before we
  drop marp.
- If the full corpus is NOT all green on arrival, the stale goldens must be
  re-blessed first (that's the "freeze marp-validated goldens" step).

*Step 2 — CI.* Add the gate to `.github/workflows/ci.yml` (model on the existing
`engine-parity` job). On drift: build the before/after diff-montage PDF, upload as
an artifact, post a summary comment ("N slides drifted in {decks}"). Keep the marp
`engine-parity` job running in parallel for now.

*Step 3 — retire marp (LAST, only once 1+2 are trusted).*
- First **record §A metrics:** `npm run bench` engine-vs-marp table + a clean
  `npm install` footprint delta (with vs without marp-cli). And §7.3 audit:
  confirm no marp-using test asserts something only a second renderer can.
- Remove `@marp-team/marp-cli` from `package.json` `dependencies`. Strip marp from:
  `test/helpers/render.js`, `test/integration/parity/*.test.js`,
  `test/integration/galleries/marp.gallery.test.js`,
  `test/benchmark/engine-bench.mjs` (record-then-strip),
  `test/unit/engine/engine.test.js`, `test/unit/parsing/marp-plugins.test.js`.
  Remove the marp `engine-parity` CI job.
- **KEEP:** `marp.config.js` (shipped for marp-vscode + BYO-marp-cli authors) and
  the marp-vscode CSS shims (`marp.scaffold.css`, `:is(pre, marp-pre)`, twemoji
  `:not(.emoji)`) — the documented Scope-1 tax.
- Update CHANGELOG (lead `**Breaking:**` — consumers rendering via our marp.config
  now bring their own marp-cli), `engineering/capabilities.md`, and §A here.

**Done when:** the regression gate is the CI visual gate, `@marp-team/marp-cli` is
out of `dependencies`, `npm install @slidewright/lattice` is marp-free, every gate
is green, and §A is filled.
