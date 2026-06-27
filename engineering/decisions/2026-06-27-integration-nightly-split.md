---
status: shipped
summary: Split the integration tier into a PR-blocking slice (wiring + export + correctness) and a nightly render-regression slice on main, to cut PR-critical-path time without losing the floor
---

# Integration tier — split the slow render-regression suites to nightly

**Status:** accepted, 2026-06-27. Implements the §D bias of
`2026-06-13-gate-strategy-change-detection.md` ("keep blocking gates blocking;
move work *later* only where a later catch is cheap to revert") for the
`integration` job specifically. Siblings: `perf-nightly.yml` and
`preview-e2e-nightly.yml` already moved their slow/runner-dependent gates off the
PR path the same way.

## Problem

The `integration` job is the longest required check on a `code` PR — ~3–5 min in
CI (~130–150s cold locally), and CI **disables the render cache** so every PR
pays the full Chromium cost. It runs 15 files across 8 directories; the bulk of
the wall-clock is fresh PDF renders (the exemplars suite alone renders **45 full
decks**). That tax lands on every engine PR and is the iteration drag this
change addresses.

## Two axes that sort the 15 files

**Essential vs incidental cost.** Five `parity/` suites render a full Chromium
PDF only to grep the HTML sidecar (their own headers say "avoids parsing PDF…
slow tier because the emulator always runs the Chromium PDF stage"). They are
slow *incidentally* — a future fast-path (emit HTML without the PDF stage) makes
them near-instant with zero coverage change. That is **out of scope here** and
tracked as a follow-up; this change only re-tiers, it does not touch the render
path.

**Correctness-gate vs regression-watch.** Some suites assert a contract that
must hold on every PR (a shared-kernel transform diverging across render paths,
a component overflowing or failing WCAG AA). Others detect *drift* — a page
count moved, a committed PDF went stale — where the stale-artifact half is
**already backstopped at pre-commit** (`tools/build-staged-pdfs.js` rebuilds
staged deck PDFs; the freshness gates catch "edited a generator, forgot to
rebuild"). For those, a next-morning catch on `main` is cheap to revert.

## Decision

Partition the tier by directory (no file is split), wired through two new npm
scripts whose union equals the old `test:integration`:

| Slice | Directories | Runs |
|---|---|---|
| `test:integration:pr` | `parity/`, `export/`, `invariants/` | every `code` PR (required `ci` gate) + pre-push opt-in |
| `test:integration:nightly` | `galleries/`, `components/`, `exemplars/`, `mermaid/`, `screenshot/` | `integration-nightly.yml` on `main` (cron + `workflow_dispatch`) |

- **Stays on the PR (blocking):** `parity/` (cross-render-path wiring contracts,
  HARD RULE #1), `export/` (the export pipeline — export bytes are sign-off
  sensitive), `invariants/` (the per-component computed-style correctness gate,
  the one deliberately kept after the marp pixel gate was retired).
- **Moves to nightly:** `galleries/` + `components/` (fresh-render page counts),
  `exemplars/` (45 decks + committed-PDF freshness — backstopped at pre-commit),
  `mermaid/` (render smoke), `screenshot/` (visual). On failure the nightly opens
  / appends one rolling `[integration-nightly]` tracking issue (title-marker
  lookup, self-labelled `area:engine`/`type:fix`/`priority:high`/`status:backlog`),
  mirroring perf-nightly so it never spams.

`test:integration` itself is unchanged (= every suite) and remains what the
pre-push hook runs under `LATTICE_FULL_PUSH=1` — the strongest local early
warning, now catching nightly-tier regressions before they reach `main`.

## What this trades away, and why it's acceptable

A render regression in a `[nightly]` suite — a transform silently dropping a
gallery slide, a stale committed exemplar PDF — now reaches `main` and is caught
the next morning rather than blocked on the PR. Acceptable because: (1) the
stale-artifact class is double-covered by the pre-commit rebuild + freshness
hooks, so it rarely escapes a well-formed commit in the first place; (2) the
nightly's rolling issue makes the catch loud and single-threaded; (3) the
`LATTICE_FULL_PUSH=1` pre-push path lets any session run the full tier on demand;
and (4) re-tiering is a one-line script edit, so if a `[nightly]` suite proves to
need PR-time blocking we pull it back into `:pr` trivially.

## Follow-ups

- **Fast-path the HTML-sidecar parity suites** (`deck-logo`, `deck-class-fm`,
  `deck-finish-fm`, `chart-family`, and `speaker-notes`' HTML assertions): emit
  the HTML sidecar without the Chromium PDF stage so they stay PR-blocking but
  near-instant. Bigger diff (touches the render path) — separate issue.
- **New integration suites must declare a tier.** `test:integration:pr` and
  `:nightly` are explicit directory lists, so a brand-new `test/integration/<dir>/`
  runs in neither until added to one. Note in review.
