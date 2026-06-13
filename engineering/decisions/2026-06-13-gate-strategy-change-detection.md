# Gate strategy — run everything, or only what changed?

**Status:** proposal (not decided). Drafted 2026-06-13 for the maintainer. A
solo+AI-fleet shop runs many parallel Claude sessions against `main`; the
question is whether every push/PR must run *all* gates, or whether robust
change-detection + tiered scheduling can cut cost without losing the floor.
Sibling: `2026-06-12-p4-regression-gate-retire-marp.md` (the regression gate
whose CI wiring — Step 2 — is the live decision §D answers).

## TL;DR

Most of the heavy gates are **already change-scoped** and should stay where they
are. The two real levers are (1) the new **regression gate** (Step 2, still
open) — scope it per-PR to the affected galleries via `preview.js`'s L0–L3 map,
**but keep a full-corpus nightly as the backstop** so a wrong map can't let
drift reach `main` unseen; and (2) **engine-parity**, which is the most
expensive always-on job (~8–9 min) and is *about to be retired* by P4 Step 3 —
don't invest in scoping it, retire it. For a shop where no single AI session
sees the whole picture and sandboxes go stale, the bias is **keep blocking gates
blocking**; move work *later* only where a later catch is cheap to revert.

---

## A. Gate inventory + cost table

Two enforcement surfaces: local hooks (`lefthook.yml`) and CI
(`.github/workflows/ci.yml`). Costs are derived from the scripts; observed
session timings are flagged *(obs)*, the rest are *(est)*.

### Local — `lefthook.yml`

| Step | Stage | Protects against | Cost | Scoped? |
|---|---|---|---|---|
| `lint` (biome) | pre-commit | source lint | <1s | yes — `{staged_files}`, `*.{js,mjs,cjs,json}` glob (`lefthook.yml:13`) |
| `affected-tests` | pre-commit | unit regressions | 2–11s | **yes** — `tools/affected-tests.js` maps staged→`test:<scope>`, full-suite fallback (`lefthook.yml:21`) |
| `lint-deck` | pre-commit | deck footguns | <1s | yes — staged decks only, strict (`lefthook.yml:33`) |
| `pdf-rebuild` | pre-commit | stale committed deck PDF | ~2–5s/deck | **yes** — only staged deck markdown, incremental (`lefthook.yml:48`) |
| 9× `*-freshness` (runtime, emulator, theme/layout/authoring-core, dist-readme, capabilities, fonts, component-docs, docs-portal) | pre-commit | "edited a generator source, forgot to rebuild" | <1s each (esbuild-to-buffer byte-diff) | **yes** — each fires only on its own source glob (`lefthook.yml:49–163`) |
| `lint` (full) | pre-push | repo-wide lint | ~3–5s | full |
| `lint-deck:all` | pre-push | repo-wide deck footguns | ~2s | full |
| `build-check` | pre-push | stale `dist/` (render-free) | ~5–10s | full, deterministic |
| `unit-tests` | pre-push | full unit suite (84 files) | ~11s *(obs)* | full |
| `integration-tests` | pre-push | cross-renderer parity + PDF page counts (13 files) | ~130–150s cold *(obs)*, near-instant warm-cache | **yes** — inline `git diff` path guard mirrors CI `code` filter, fail-open (`lefthook.yml:210–222`) |
| `format` | commit-msg | `area(scope): summary` | <1s | n/a |

### CI — `.github/workflows/ci.yml`

| Job | Trigger | Protects against | Cost | Scoped? |
|---|---|---|---|---|
| `changes` | always | classifies `code` vs `docs` tiers | ~5s | n/a — the classifier (`ci.yml:27`, `dorny/paths-filter`) |
| `lint` | **always** (incl. docs-only) | lint + deck lint | ~30s w/ `npm ci` | full but cheap |
| `unit` (node 22 + 24 matrix) | `code` only | engines claim + `build:check` + playground:check | ~1–2 min ×2 | **gated** on `code` (`ci.yml:89`); freshness gates pinned to node 22 |
| `integration` | `code` only | render tier (Chromium) | ~3–5 min | **gated** on `code` (`ci.yml:124`) |
| `engine-parity` | `code` only | every gallery slide pixel-matches marp | ~8–9 min *(obs)* | **gated** on `code` (`ci.yml:157`) — **slated for retirement, P4 Step 3** |
| `docs-build` | `docs` only | Astro site build | ~1–2 min | **gated** on `docs` (`ci.yml:191`) |
| `ci` | always (`if: always()`) | the single required check | ~5s | aggregator (`ci.yml:214`) — passes on success-or-skipped |

**Duplication — pre-push `integration` vs CI `integration`.** The same
`npm run test:integration` runs in both. This is **intentional belt-and-braces**
(`lefthook.yml:196`): pre-push catches it before the remote so a session never
pushes red; CI re-runs it on the PR because a sandbox's warm cache, missing
`pdfinfo`, or un-exported `CHROME_PATH` can make the local run lie. The path
guards are kept byte-identical *on purpose* (`lefthook.yml:204` says "mirrors the
`code` paths-filter … keep the two in sync"). For a fleet of ephemeral
sandboxes this redundancy is a feature, not waste — see §F.

**Not yet wired:** the **regression gate** (`npm run regress`,
`tools/regression-gate.mjs`) — full corpus is 65 galleries × {light,dark} ≈
**10 min** *(obs)*. P4 Step 2 adds it to CI; *how* to schedule/scope it is §D.

---

## B. Change-detection opportunities — safe vs dangerous

The repo already owns a battle-tested change→impact classifier:
`tools/preview.js`'s **L0–L3** detector (`preview.js:175` `detectScope`). It is
the right model to lean on because it encodes the transitive-dependency danger
explicitly:

- **L0** — no visual impact: tests, docs, manifests, `tools/`, `package.json`
  (`preview.js:76`). Skip rendering entirely.
- **L1** — one deck/example source (`preview.js:131`).
- **L2** — one component's `.styles.css` / `.transform.js` / `.gallery.md`
  (`preview.js:126`) → that component's gallery **plus every deck that uses the
  component** (`decksUsingComponent`, `preview.js:159`).
- **L3 (full)** — shared `lib/_*.css`, `themes/`, `lattice-emulator.js`,
  `dist/lattice.css`, `marp.config.js`, the chart-family, the cross-cutting
  `lib/*.js` transforms (`preview.js:106`). **Any one of these fans out to every
  gallery.**

Crucially, L0–L3 **fails closed**: an *unrecognized* `lib/` file is treated as
L3-full (`preview.js:211`). That is exactly the property a CI scoping map needs —
when in doubt, run everything.

**The safe/dangerous map for scoping the regression corpus:**

| Change class | Safe to scope to subset? | Why |
|---|---|---|
| One `*.gallery.md` | ✅ that gallery only | self-contained source |
| One component `.styles.css` / `.transform.js` | ✅ that component's gallery + decks using it | L2 already computes this set |
| One `examples/<deck>.md` | ✅ that deck | L1 |
| Shared `lib/_*.css`, `lattice.css`, token edits | ❌ **MUST be full** | fans out to all 65 galleries (L3) |
| `themes/*` | ❌ **MUST be full** | every slide repalettes (L3) |
| `lattice-emulator.js` / `marp.config.js` / chart-family / `lib/*.js` transforms | ❌ **MUST be full** | the render path itself changed (L3) |
| `package.json` scripts | ❌ **MUST be full** | the emulator bundle inlines it (`lefthook.yml:77`); a version/script edit re-stales the bundle and can move every render |
| Unknown `lib/` file | ❌ **default full** | L0–L3 fails closed (`preview.js:211`) |

**Can the regression gate reuse preview.js?** Almost. `preview.js`'s component
regex (`PATTERNS.componentCss`, `:126`) already extracts the component *name*,
and that name is exactly the token `regression-gate.mjs --only` accepts
(`regression-gate.mjs:253` filters `deckName(d) === only`, and the gallery
builders' `--only` take the same name — `build-galleries.js:159`,
`build-bucket-galleries.js:208`). So a **change→`--only` set** is a thin adapter
over the existing L2 logic. The two gaps to close before trusting it in CI:

1. **`decksUsingComponent` only scans `examples/` (`ALL_DECKS`, `preview.js:64`,
   currently just `gallery-jargon`)** — it does *not* yet enumerate the
   per-bucket survey galleries, which pull in many components. A naive reuse
   would under-scope bucket galleries. The map must add: component → its own
   gallery **and** every bucket gallery whose bucket contains it.
2. **L3 detection must gate the whole thing** — if `detectScope` returns L3, the
   regression gate runs **full**, full stop. No `--only`.

---

## C. Scheduling tiers — cheapest stage that preserves each guarantee

Stages, cheapest→most-durable: **per-commit (local)** → **per-push (local)** →
**per-PR (CI, blocks merge)** → **merge-time (post-merge on `main`)** →
**nightly (scheduled)**. Moving a gate *later* trades latency-to-feedback for
cost, and buys a window where the regression can land before it's caught.

| Gate | Current | Cheapest stage that holds | Cost of moving later |
|---|---|---|---|
| biome lint | pre-commit + CI | **keep** pre-commit + always-CI | cheap+high-value; no reason to move |
| `affected-tests` / unit | pre-commit + pre-push + CI matrix | **keep** all three | matrix proves the node-22/24 engines claim; can't drop one node |
| `build:check`, freshness gates, `check:ownership`/capabilities | pre-commit/pre-push + CI | **keep** — render-free, sub-second | a stale `dist/` shipped to the live site is silent; keep blocking |
| commit-msg format | commit-msg | **keep** | trivial |
| deck lint | pre-commit + pre-push + CI | **keep** | author footguns are silent render corruption |
| **integration (render)** | pre-push + per-PR | **per-PR is the true floor**; pre-push is the redundant early-catch | dropping the *pre-push* copy → a session can push transiently-red; CI still blocks merge. Low risk for a fleet that watches its PRs. Dropping the *CI* copy → unsafe (sandbox can lie). |
| **engine-parity** | per-PR (~8–9 min) | **retire it** (P4 Step 3) | n/a — superseded by the regression gate; don't scope what's leaving |
| **regression gate** | not wired | **§D** | the open decision |
| docs-build | per-PR (`docs` tier) | **keep** per-PR | a broken Astro build should block the PR that broke it |

The pattern: everything render-free and sub-10-second stays blocking everywhere
(it's free insurance); the **render tiers** are where stage choice matters,
because they're minutes, not seconds.

---

## D. The regression gate (P4 Step 2) — recommendation

**Recommend: hybrid — affected-scoped per-PR (blocking) + full-corpus nightly
(blocking on `main`, auto-files an issue/revert signal on red).**

The four options and why the hybrid wins:

| Option | Per-PR cost | Catches transitive drift? | `main` can go red? |
|---|---|---|---|
| (a) affected-scoped per-PR only | ~1–3 min typical | **No** if the change→gallery map is wrong/under-scopes | yes (silently — the gate was green) |
| (b) full-corpus per-PR | ~10 min every PR | yes | no |
| (c) full-corpus nightly/merge-time only | $0 per-PR | yes, but late | yes, until the nightly |
| **(d) hybrid: scoped per-PR + full nightly** | ~1–3 min typical | per-PR best-effort; **nightly is the safety net** | only for ≤1 day, then nightly flags it |

**Why not (a) alone:** the change→gallery map is the single point of failure, and
this is precisely the shop where it's most likely wrong — an AI session editing a
shared token may not realize it's L3, and a *buggy adapter that returns an empty
affected set renders zero galleries and PASSES* (the false-PASS class — see §F;
`regression-gate.mjs:254` only errors on an unknown `--only`, not on an
empty-because-mis-scoped set). Scoped-only would let that ship.

**Why not (b) alone:** 10 min on every PR, across many parallel sessions, is the
exact cost the maintainer is trying to avoid — and ~90% of PRs are L1/L2 and
touch a handful of galleries, so full-corpus is mostly wasted work.

**Why not (c) alone:** `main` going red between merge and the nightly means a
human (the solo maintainer) wakes up to a red `main` and a revert — the worst
outcome for a one-person shop.

**The hybrid, concretely:**
- **Per-PR:** run `regress --only <set>` where the set comes from the L0–L3
  adapter (§B). **If the adapter returns L3 (shared CSS/theme/engine/`package.json`),
  run the full corpus on that PR** — these are the changes that actually need it,
  and they're rarer. If it returns L0, skip. **Guardrail against false-PASS:** the
  per-PR job must *fail* if the affected set is empty **but** `detectScope`
  classified the change as visual (L1/L2/L3) — an empty render set on a visual
  change is a map bug, not a pass.
- **Nightly (scheduled workflow on `main`):** full corpus, all 65×2. On red, it
  is the authoritative "drift reached `main`" signal — open an issue / ping the
  maintainer. This is the net under the per-PR scoping map.

This mirrors the codebase's own instinct: `preview.js` fails closed to L3, the
pre-push integration guard fails open ("if the diff can't be resolved, run it").
The hybrid applies the same "when unsure, run more" bias at the corpus level.

---

## E. Staged migration plan

Each step annotated with the guarantee it weakens and the failure mode it adds.
Do them in order; stop if any reveals churn.

**Step 1 — wire the regression gate per-PR, scoped, with the full-on-L3 + empty-set
guardrail (P4 Step 2).**
- Add a `regression` job to `ci.yml`, gated on the `code` tier. Compute the
  affected `--only` set from the L0–L3 adapter; L3 → full corpus; L0 → skip.
- *Weakens:* nothing yet vs the (not-yet-existing) gate. *Failure mode added:* a
  map bug under-scopes → mitigated by the empty-set guardrail (§D) **and** Step 2.

**Step 2 — add the full-corpus nightly workflow (`.github/workflows/regression-nightly.yml`,
`schedule: cron` + `workflow_dispatch`).**
- Runs `npm run regress` (full) on `main`. On red: upload the montage artifact,
  open/append an issue.
- *Weakens:* nothing — it's purely additive insurance. *Failure mode added:* none;
  it can only catch more.

**Step 3 — retire `engine-parity` (P4 Step 3).** Once Steps 1–2 are trusted, the
~8–9 min parity job is dead weight (marp is being removed). Delete the job.
- *Weakens:* the marp *oracle* — accepted by P4 (the engine is now canonical).
  *Failure mode added:* none beyond what P4 already reasoned through.

**Step 4 (optional, lowest priority) — drop the pre-push `integration` copy,
keep CI's.**
- *Weakens:* the "nothing red reaches the remote" boundary — a session could push
  a transiently-red branch. *Failure mode added:* a red push that CI then blocks
  from merge. For a fleet that already watches every PR to green (CLAUDE.md §7),
  the cost is a few seconds of "CI is red, fixing" rather than a blocked push.
  **Only do this if pre-push latency is an observed pain** — otherwise the
  redundancy is cheap insurance (warm cache makes it near-instant). Recommend
  **keep as-is** unless measured.

### Keep-as-is (cheap + high-value — do NOT touch)

- biome lint (pre-commit + always-CI)
- `build:check` + all 9 `*-freshness` gates + `check:ownership` + `capabilities`
- commit-msg format
- deck lint (pre-commit + pre-push + CI)
- the unit node-22/24 matrix
- the CI `changes` classifier and the single `ci` required-check aggregator
- **the pre-push↔CI integration redundancy** (unless Step 4 is measured-worth-it)

---

## F. Honest counterpoint — the case AGAINST lightening the gates here

This shop is the *worst* case for trusting change-detection, and the argument
deserves its full weight:

1. **No single AI session sees the whole picture.** A human refactoring a shared
   token *knows* it fans out; an AI editing `lib/_base.css` to fix one slide may
   not register that it just changed all 65 galleries. Change-detection that
   relies on the *author* having scoped correctly is fragile here — which is
   exactly why the map must fail **closed** (L0–L3 already does) and why scoping
   must never be the *only* line of defense.

2. **Ephemeral sandboxes let staleness creep in silently.** CLAUDE.md's whole
   "Cloud sandbox" section exists because each session re-discovers missing
   `CHROME_PATH`, missing `pdfinfo`, stale `dist/`, stale playground bundles. A
   *local* gate that "passed" may have passed because the tool wasn't installed
   (the pre-push guard even warns `pdfinfo missing … gate was skipped`,
   `lefthook.yml:220`). **This is the core reason the pre-push↔CI duplication is
   load-bearing, not wasteful** — CI is the one environment that can't lie.
   Lightening it would remove the only trustworthy floor.

3. **The false-PASS bug is real and recent.** An inspector just caught a
   false-PASS in the regression gate. A *scoped* gate multiplies that risk: a
   green-because-it-rendered-nothing run is indistinguishable from a
   green-because-it-matched run unless you assert the affected set is non-empty
   for visual changes. Per-PR scoping (§D option a) without the empty-set
   guardrail and the nightly backstop would convert "we caught drift" into "we
   silently shipped it."

**The synthesis:** these objections argue against *scoped-only* and against
*moving render gates off CI entirely* — and the recommendation honors all three
(fail-closed map, keep CI as the un-lyable floor, full nightly backstop, empty-set
guardrail). They do **not** argue against scoping the *per-PR* render cost when a
full-corpus nightly stands behind it. The lightening is real (typical PR drops
from ~10 min full-corpus regression to ~1–3 min scoped) without surrendering the
floor.

---

## Checker addendum (2026-06-13)

Independent verification. The 6 factual claims are **all CONFIRMED** except two
precision nits, but §B/§D's central "thin adapter" premise has a **real,
unstated gap** that an implementer would hit:

1. **Gallery-name collision the adapter map ignores.** `regression-gate.mjs`
   scopes `--only X` by *gallery file basename* (`deckName`, `:83–85`), and
   `deckName` is **not unique** across the corpus. Three buckets ship a bucket
   *survey* gallery whose basename equals a same-named component gallery:
   `code/code.gallery.md` (bucket) vs `code/code/code.gallery.md` (component);
   ditto `diagram` and `math`. So `--only code` selects **both** files in the
   gate's `decks.filter` (`:253`), and `--bless --only code` re-blesses both
   (the `bless()` try-both-builders loop, `:137–157`). Worse for the adapter:
   `preview.js`'s `componentGallery` regex *also matches the bucket survey
   files* and extracts `code`/`diagram`/`chart` as if they were component names
   (verified by running the regexes), so an edit to a **bucket** gallery is
   misclassified as an L2 *component* change. The doc's "the component name is
   *exactly* the `--only` token" (§B, ~:110) is true by luck for the 3 collision
   cases (both get rebuilt) but the change→`--only` map is **not** the clean 1:1
   the doc presents — it needs an explicit bucket-vs-component disambiguation,
   not just the two gaps §B lists. **This is the single most important omission.**

2. **§D/§F false-PASS citation is IMPRECISE.** The doc says `regression-gate.mjs:254`
   "only errors on an unknown `--only`, not on an empty-because-mis-scoped set"
   and that an empty set "renders zero galleries and PASSES." As wired *today*
   that is wrong: a missing/`undefined` `--only` falls through `if (only)` and
   runs the **full** corpus; an unknown token hits `:254` and **errors (exit 2)**.
   The false-PASS hole only opens under §B's *proposed* multi-gallery design (a
   per-gallery loop of `--only X` invocations, where zero iterations = zero runs
   = trivially green). The empty-set guardrail (Rec #2) is still the right fix,
   but it guards a hole the *new adapter* introduces, not one at `:254` today —
   the doc should attribute it correctly so the implementer builds the guardrail
   at the loop driver, not inside `regression-gate.mjs`.

Everything else verified CONFIRMED: lefthook steps are per-glob scoped
(`:14,28,44,57–162`); pre-push `integration` has the inline `git diff` guard
mirroring CI's `code` filter, fail-open (`:210–222`); CI splits `code`/`docs`
via `dorny/paths-filter` and gates unit/integration/engine-parity on `code`,
docs-build on `docs` (`ci.yml:38–57,89,124,157,191`); `detectScope` fails closed
to L3 on an unrecognized `lib/` file (`preview.js:210–217`); engine-parity is
retired in P4 Step 3 (`2026-06-12-…:263–281`). Recommendations #1–#3 are
**sound in shape**; #1 needs the collision fix folded in before it's safe to
build, and the maker should note that `concurrency: cancel-in-progress`
(`ci.yml:11–13`) and a **merge-queue** are unexamined cheaper alternatives to
the nightly for serializing the round-the-clock PR fleet.
