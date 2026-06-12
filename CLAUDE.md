# Lattice — agent orientation

Lattice is a Marp-based slide-deck engine that renders boardroom-quality
PDFs from Markdown. It is the engine layer of the **SlideWright** org; a
Tauri desktop wrapper (also SlideWright) embeds the same engine.

**The visual contract is `lattice.css`.** Layouts are palette-blind: every
colour goes through `var(--token)`. Themes (`themes/indaco.css`,
`themes/cuoio.css`, …) supply the tokens.

This file is short on purpose. It orients you and points to the canonical
doc for each topic. **Read the pointed-to doc before non-trivial work in its
area — do not work from memory of it.**

---

## DEFAULT OPERATING MODE — act without being asked

The standing expectation is an agent that drives routine work to completion
on its own. Do NOT stop to ask permission for the steps below; only stop
when a decision is genuinely mine (irreversible, ambiguous *direction*, an
architectural fork) — and bundle those into one `AskUserQuestion`.

1. **Finish the loop.** A task is done when it's implemented, verified,
   documented, and shipped — not when it compiles. Don't hand back at the
   first green and wait for "now lint / now test / now push."
2. **Don't settle.** "Builds" and "tests pass" is the floor. Self-critique
   the result and raise it before returning it. For visual work, the bar is
   §Quality Bar below.
3. **Stay rebased — check, don't ask.** Before you push and before you call
   anything done, `git fetch origin main` and rebase the branch if it has
   drifted. Never ship from a stale branch; never wait to be told to rebase.
   (A Stop hook nudges you if you forget — see `.claude/hooks/stop-rebase-check.sh`.)
4. **Run the gates yourself, proactively.** `npm run lint`, the unit suite,
   `npm run build:check` (the CI/stale-artifact gate), and the integration
   tier — run them *before* declaring done, so "done" is true when you say
   it. (Hooks also enforce these at commit/push; that's a backstop, not a
   substitute for verifying first.)
5. **Keep docs + changelog in sync in the SAME change.** Any behavior change
   updates the matching `engineering/`/`design/` doc AND `CHANGELOG.md`
   `## Unreleased`. Generated docs (`dist/docs/*`) regenerate via build.
   Never return a behavior change with stale docs — don't make me ask.
6. **Open the PR yourself when the work is review-ready.** When the branch's
   meaty work is complete, verified, and pushed, open a PR using
   `.github/pull_request_template.md` — don't wait to be asked. Do NOT open a
   draft PR up front: that spams CI and the build agent. Wait until the work
   is genuinely ready for review, then open it once.
7. **Auto-watch the PR.** Immediately after creating a PR, subscribe to its
   activity and drive CI green / address review comments. Never ask "should
   I watch the PR?" — the answer is always yes.

Rules 6–7 deliberately override the harness defaults (which otherwise hold
off on PR creation and ask before watching). This file takes precedence;
treat them as the standing instruction. The `doneMeansMerged` setting in
`.claude/settings.json` reinforces this — keep working to a merge-ready state.

---

## QUALITY BAR — 10/10 boardroom, or it isn't done

For anything a human sees — themes, `lattice.css`, layouts, the docs site,
UI/UX — **"it renders" is the floor, not the goal.** The target is the
boardroom 10/10 rubric (`engineering/decisions/2026-06-06-layout-audit/`).
Before handing visual work back:

- Rebuild and **actually look at it**: `SendUserFile` / `tools/rasterize-for-review.sh`
  for PDFs; build + run the Astro docs site and `tools/screenshot.js` for
  web/UI. The sandbox CAN do both — see `engineering/development.md`.
- Run `tools/pixel-check.js` to catch unintended drift.
- Fix what's short of excellent without being told — spacing, alignment,
  contrast, type hierarchy, register, dead canvas.
- If a tool genuinely cannot run here, **say so**; never claim visual
  quality you did not verify.

### Website / responsive UI — desktop · tablet · mobile

The docs site (landing, Drawing Board, Workbench, component pages) ships to
three form factors with distinct real estate and capabilities. Treat all
three as first-class:

- **Responsive across every breakpoint.** Each website change must hold up on
  desktop (~1440px), tablet (~820px), and mobile (~390px). Keep the
  experience *familiar* across platforms — one visual language, not three
  different apps.
- **Respect real estate.** On mobile (and largely on tablet), icon+text
  controls eat space and break layouts — favor **icon-only** controls there,
  keeping the text label for desktop. For tablet specifically, **assess each
  feature's viability** rather than assuming the desktop layout just scales.
- **No jank.** No shaky / jumpy / jittery layout shift, reflow, or animation
  glitches. Reserve space for async content; avoid cumulative layout shift.
- **Always screenshot-verify all three breakpoints.** No website change is
  done without `tools/screenshot.js` evidence at desktop, tablet, AND mobile
  widths (see `engineering/development.md`). "It builds" is not verification.
- **Export changes require MY inspection — STOP and show me.** Anything that
  affects exported content (PDF export, deck rendering, font embedding) is the
  one exception to "act without being asked": generate a representative demo
  deck, render it in **both dark and light mode**, and send both PDFs for my
  sign-off before considering the work done.

---

## MAKER-CHECKER — verify non-trivial work with parallel agents

Separate *making* from *checking*. For any change that is non-trivial or hard
to reverse — infra/hooks/CI, engine transforms, a visual pass, a refactor —
after you (the maker) finish, spawn independent checker agents **in parallel**
and split the review two ways, for sanity and speed:

- **Inspection** — bug-hunt the actual diff: correctness, edge cases,
  shell/CSS/JS footguns, "does it do what it claims."
- **Assessment** — judge fit and risk: does it meet the goal, does it weaken a
  guarantee, scope/altitude, what's missing.

Run them concurrently (one message, multiple `Agent` calls), fold the findings
back in, *then* commit. Skip it for trivial edits — this is for when a second,
independent set of eyes earns its latency.

---

## HARD RULES (these override convenience; a violation is a defect)

1. **Three render paths must agree.** Any authoring transform lands in all
   three or the paths drift: `lattice-emulator.js` (build-time CLI),
   `marp.config.js` → `lib/core/*` + chart-family + integrations (marp-cli),
   and `dist/lattice-runtime.js` (vscode preview). Each kernel documents its
   siblings in a header comment. See `engineering/architecture.md`.
2. **Never hand-edit `dist/`.** It is generated. Regenerate with
   `npm run build` (behind the collision gate).
3. **No hex literals in layout CSS — always `var(--token)`.**
4. **Typography is the 12-token system** (`--fs-*`). Never t-shirt sizes
   (`fs-md`/`fs-lg`); those are retired. See `engineering/typography.md`.
5. **Card-style layouts forbid inline `- **Title.** body`.** Use the nested
   form `- Title` / `  - body`. `deck-authoring.test.js` enforces it; the
   8-layout set is in `lib/authoring/lint-core.js` (`CARD_STYLE_LAYOUTS`).
6. **Before authoring any `<!-- _class: X -->` slide**, in the SAME turn:
   open `lib/components/<bucket>/X/X.docs.md` (find with
   `find lib/components -name X -type d`) AND grep
   `test/integration/baseline-decks/gallery.md` for a live example. For base
   modifiers (`tint-*`, `with-*`, `dark`, …) open `lib/base/base.docs.md`.
7. **Edit lint rules in `lib/authoring/lint-core.js` only** — pure, fs-free,
   shared by the CLI, `validate()`, and the browser. Never duplicate.
8. **Isolate feature/fix content from the six long-running galleries.**
   Layouts graduate in a separate post-review commit. See `engineering/workflow.md`.
9. **Ship a per-feature demo deck** `examples/<slug>.md` (+ committed `.pdf`),
   6–10 slides, title → demo → close. Contract in `engineering/workflow.md`.
10. **Record every user-visible change in `CHANGELOG.md` `## Unreleased`
    as it lands.** Lead with `**Breaking:**` for anything that breaks an
    existing deck/consumer. Pure-internal work needs no entry. See `RELEASE.md`.
11. **Use the old per-theme token names** (`--c1-light`, `--c-stroke`, …)
    until the canonical universal-token flip. `tokens: universal` is a
    Drawing-Board-only A/B. See `lib/base/base.docs.md`.
12. **Avoid `:not(:has(...))` / `:is(:has(...), …)` in theme CSS** — silently
    broken in the Marp preview Chromium. See `engineering/gotchas.md`.
13. **Commit messages are `area(scope): short summary`.** PRs follow
    `.github/pull_request_template.md` (Problem → What changed → Tests →
    Caveats), titled the same way.
14. **A hook failure is a root cause to fix, never a `--no-verify` to skip.**

---

## Read the canonical doc before working in its area

| Working on… | Read first |
|---|---|
| What a component/modifier/token *is*, catalog shape | `design/design-system.md` |
| Branching, feature decks, share-the-PDF, rebase, 3-renderer gate | `engineering/workflow.md` |
| Node, npm scripts, tests, lint, hooks, CI, "add X also do Y" | `engineering/development.md` |
| Something behaving strangely (symptom index) | `engineering/gotchas.md` |
| Engine internals, where transform kernels live | `engineering/architecture.md` |
| The CSS cascade / `@layer` (declared-but-inert; the trap) | `engineering/cascade.md` |
| Typography scales | `engineering/typography.md` |
| Palette tokens, Mermaid contract | `design/theming.md` |
| Prose rules for galleries/decks | `design/editorial.md` |
| The deck-authoring contract | `design/skill.md` |
| Cross-cutting authoring (eyebrow, subtitle, base modifiers) | `lib/base/base.docs.md` |
| A specific component's slots/variants/anti-patterns | `lib/components/<bucket>/<name>/<name>.docs.md` |
| Picking a component as an agent (machine catalog) | `dist/docs/components.json`, `AGENTS.md` |
| The 10/10 visual rubric | `engineering/decisions/2026-06-06-layout-audit/` |
| Release / publish | `RELEASE.md` |
| Durable investigation notes | `engineering/decisions/YYYY-MM-DD-topic.md` |

The 12 component buckets: anchor, statement, inventory, comparison,
progression, evidence, imagery, chart, diagram, math, code, legal.

---

## The build, tests, and gates (the machine polices these — don't re-police)

- `npm run build` regenerates every `dist/` artifact in dependency order
  behind `npm run check:ownership` (the collision guard). `build:check` is
  the CI/stale gate.
- `npm test` is the inner loop; `npm run test:integration` is the
  cross-renderer + PDF-page-count tier; `test:<scope>` runs one slice.
  Counts and scopes live in `engineering/development.md` — don't memorize them.
- **Hooks make the checklist blocking** so you don't run it from memory:
  pre-commit (lint + affected tests + deck-footgun lint + PDF rebuild +
  freshness gates), pre-push (full lint + repo deck lint + `build:check` +
  full unit + full integration), commit-msg (format). Per §Default Operating
  Mode, run these yourself *before* you reach the hook — the hook is the backstop.

---

## Visual iteration loop

- **Iterate with `npm run preview` + `SendUserFile`** — no per-iteration
  commits. The tool auto-detects scope (L0–L3 from `git diff`), rebuilds only
  what's affected, and pixel-diffs against the last commit. Loop:
  `edit → npm run preview [-- <deck>] → SendUserFile <files>`.
- **Lint drafts with `npm run lint:deck -- <file>`** before rendering.
- **The final PR commit includes all rebuilt PDFs** (external reviewers need
  raw-URL access); the raw `raw.githubusercontent.com` URL goes only in the
  final PR reply.
- `marp-cli` works here once `CHROME_PATH` points at the puppeteer chromium
  (`engineering/gotchas.md`). The SessionStart hook sets this up on the web.

---

## Design-before-code on "rethink X" requests

When asked to rethink something, write the design model first — name the
axes, list candidate moves, recommend one, confirm in one `AskUserQuestion`
round trip — before editing CSS or transforms. Bundle adjacent decisions.

`.scratch/` is for throwaway experiments (14-day lifecycle, `npm run clean:scratch`).
