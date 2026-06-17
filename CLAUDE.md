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

**Fire these as standing triggers, not reference prose** — act on the
precondition; don't wait to be asked, and don't surface a settled step as a
choice:

| When… | Do, automatically |
|---|---|
| a branch's meaty work is complete, verified, pushed — a design/decision doc counts, the doc *is* the deliverable | **open the PR** via the template (§6) |
| a PR is open | **subscribe + drive CI green**; rebase before each push (§7) |
| the PR is green and rebased | **ask to merge** — the *one* user gate in this flow |
| merge confirmed + local `main` synced | **post the standup** |

**Tie-break:** where the harness default ("don't open a PR / don't watch unless
asked") conflicts with this file, **this file wins** — apply that *at decision
time*, not after a nudge. **Decision filter:** before any `AskUserQuestion` or
"want me to…?", ask *"is the next step already dictated by CLAUDE.md /
workflow.md?"* If yes, **do it**; reserve questions for genuine forks
(irreversible, ambiguous *direction*, architectural). "Want me to take this on,
or leave it?" after a finished, pushed unit is the tell that you're offloading a
decision the workflow already made.

1. **Finish the loop.** A task is done when it's implemented, verified,
   documented, and shipped — not when it compiles. Don't hand back at the
   first green and wait for "now lint / now test / now push."
2. **Don't settle.** "Builds" and "tests pass" is the floor. Self-critique
   the result and raise it before returning it. For visual work, the bar is
   §Quality Bar below.
3. **Stay *mergeable* — rebase right before you push.** Before every push (and
   before you call anything done), `git fetch origin main` and rebase if the
   branch has drifted — behind or conflicted. Folding the check into the push you
   were already doing keeps an open PR current at the one moment it costs nothing;
   you do **not** run a background watch or chase every `main` movement (that
   thrashes CI and floods the chat — HARD RULE #16). Re-check once more right
   before an authorized merge. Never ship from a stale branch; never let an open
   PR *merge* conflicted, stale, or CI-red. (A Stop hook nudges you if you forget
   — see `.claude/hooks/stop-rebase-check.sh`.)
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
7. **Auto-watch the PR and drive it green — then ASK to merge; never merge
   unasked.** Immediately after creating a PR, subscribe to its activity and
   drive CI green / address review comments — never ask "should I watch the
   PR?", the answer is always yes. ("Watch" = subscribe to PR activity for
   CI/review events. Keep the branch mergeable by **rebasing before each push**,
   NOT by arming a background drift poller — HARD RULE #16.) When it's green and
   review-ready, **stop and ask me for merge authorization.** A human stays in the loop to review and
   approve every merge: **never merge without my explicit, current go-ahead.**
   Prior authorization does NOT carry forward — "merge it" on one PR authorizes
   that merge only, never the next. (`doneMeansMerged` means keep working until
   the PR is ready for *me* to merge — not merge-it-yourself.) Once I authorize,
   **squash-merge** by default: never a merge commit; rebase-and-merge only for
   a deliberately curated, atomic commit series. Across many parallel AI
   sessions a PR can carry 20+ noisy commits, so squashing keeps `main` one
   reviewable, revertable commit per PR. **After every merge — once local `main`
   is synced — post a brief standup** (swimlane · card · completed · on deck
   for *this* thread) so I can re-orient across my many parallel sessions; it's
   the closing beat of the merge, derived from existing repo/GitHub signals, not
   an optional extra. See `engineering/workflow.md` (§Merging, §Post-merge standup).

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
- **For a *large* visual sweep — every gallery, a whole-bucket audit, a theme
  across all components, a responsive pass over many pages — fan out parallel
  reviewer agents** (one per deck/bucket/breakpoint, maker-checker), each
  viewing *whole* slides. Don't tile a single slide across agents (it destroys
  the composition); don't review a big sweep serially. See
  `engineering/visual-review.md`.
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

1. **The render paths share one source of truth — land transforms in the shared
   kernel, not one path.** Authoring transforms live in `lib/integrations/markdown-it/plugins.js`,
   `lib/transformers/*`, and `lib/core/*` so both render paths stay in step: the owned
   `lib/engine` (the `lattice` CLI/emulator **and** the docs playground) and
   `dist/lattice-runtime.js` (the vscode preview / published-HTML runtime). The
   owned engine is canonical; Marp is fully retired as a render path (no BYO
   marp-cli config) — visual correctness gates via the per-component
   semantic-invariant suite. The one remaining Marp surface is the **export-to-Marp**
   feature (`lib/core/marp-bundle.js`, the Drawing Board) — a one-way bundle for
   recipients, not a Lattice render path. Each kernel documents its siblings in a
   header comment. See `engineering/architecture.md`.
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
11. **Themes declare the universal role-based names** (`--cat-*`, `--diagram-*`,
    `--surface-inverse`, `--scheme-dark-*`, `--seq-*`) — the canonical flip is
    **done**; the legacy per-theme names (`--c1-light`, `--c-stroke`, `--bg-dark`,
    `--scale-*`, …) are **retired**, and a regression is blocked by the post-flip
    lint (`tools/check-ownership.js` → `checkRetiredTokenNames`). Never name a
    token for a colour-scheme (`-light`/`-dark` suffix) — that lives in the
    `light-dark()` value; name it for its ROLE. The old→new map is
    `lib/tokens/crosswalk.js` + ADR §7. In the Drawing Board `tokens: universal`
    is the default; `tokens: current` is the legacy opt-in. See
    `lib/base/base.docs.md`.
12. **Avoid `:not(:has(...))` / `:is(:has(...), …)` in theme CSS** — silently
    broken in the Marp preview Chromium. See `engineering/gotchas.md`.
13. **Commit messages are `area(scope): short summary`.** PRs follow
    `.github/pull_request_template.md` (Problem → What changed → Tests →
    Caveats), titled the same way. **Before a PR merges, the issue(s) it closes
    must also read true** — the merge freezes the card's text as the permanent
    record, so reconcile a drifted title/body or point it at the PR. See
    `engineering/workflow.md` § Merging.
14. **A hook failure is a root cause to fix, never a `--no-verify` to skip.**
15. **Don't reinvent — reuse, for tooling AND UI.** *Tooling:* before building any
    script, harness, benchmark, or framework, consult `engineering/capabilities.md`
    (generated from every npm script + `tools/` file; `npm run` and `ls tools/` are
    the live source) — extend it, don't rebuild it; new tools must be described
    there (the `capabilities:check` gate enforces it). *Docs-site UI:* before
    building any control/widget, check `docs/src/components/ui/` (the shadcn
    primitives — `select`, `dialog`, `dropdown-menu`, …) AND the shared chrome
    (`PaletteControls`, `site-chrome.ts`, `theme-fetch.ts`) and extend those. A
    surface-specific control that re-implements an existing one — a second
    theme/palette dropdown, say — is a defect: different *behaviour* per surface is
    fine, but share the presentational component and wire its callback, don't fork
    the widget. (No gate enforces the UI half — it's on you to look first.)
16. **Keep an open PR mergeable by rebasing right before you push — NOT with a
    background watch.** GitHub never delivers "`main` moved", "now conflicted", or
    "CI passed", so there is no cheap event that tells you a parked PR has drifted.
    **Don't try to watch for it.** A continuous drift watch — a polling loop that
    auto-rebases on every `main` movement — thrashes CI against a merge train (N
    rebases, N cancelled runs, a spurious red gate) *and* floods the chat with
    poll/timer/force-push churn. Both failures are documented:
    `engineering/decisions/2026-06-14-drift-watch-rebase-thrash.md` and
    `2026-06-15-retire-drift-watch.md`. Instead, fold the check into the moment you
    already touch the remote: **before every push, `git fetch origin main` and
    rebase if behind or conflicted**, then push. Re-check once more immediately
    before an authorized merge executes (re-fetch; rebase if behind/conflicted, let
    CI re-confirm). Under squash-merge a `clean`-but-behind parked PR is harmless
    until then — let it sit, don't poll it. Resolve the recurring `CHANGELOG`/`dist`
    conflicts mechanically, then `git push --force-with-lease`, silently (surface
    only a real code conflict needing my judgment). Never let an open PR **merge**
    while conflicted, stale-at-merge, or CI-red. See `engineering/workflow.md`.
17. **One feature = one branch → one PR; never a stacked PR chain.** Increment a
    feature in place (many commits, one PR — review commit-by-commit if large, the
    way PR #272 phased the shadcn migration). Do **not** open a PR per slice, and
    do **not** base a PR on another unmerged branch: a stacked chain only composes
    in the author's head, never CI-tests as a unit (each PR runs against its
    *parent branch*, not `main`), and forces retarget/rebase as each link merges —
    HARD RULE #16's thrash at PR granularity. A slice that builds/tests with only
    `main` is independent → its own branch off `main`, merged on its own (parallel,
    not stacked); a slice that needs another open PR's branch is **not** — keep it
    on that branch. See `engineering/decisions/2026-06-17-stacked-pr-fragmentation.md`.

---

## Read the canonical doc before working in its area

| Working on… | Read first |
|---|---|
| What a component/modifier/token *is*, catalog shape | `design/design-system.md` |
| Branching, feature decks, share-the-PDF, rebase, 2-renderer gate | `engineering/workflow.md` |
| Node, npm scripts, tests, lint, hooks, CI, "add X also do Y" | `engineering/development.md` |
| Something behaving strangely (symptom index) | `engineering/gotchas.md` |
| Engine internals, where transform kernels live | `engineering/architecture.md` |
| Where we stand vs Marp (independence scorecard, living) | `engineering/marp-independence.md` |
| The CSS cascade / `@layer` (declared-but-inert; the trap) | `engineering/cascade.md` |
| Typography scales | `engineering/typography.md` |
| Running the render pipeline (PDF/HTML/PPTX output formats) | `engineering/pipeline.md` |
| Authoring/rendering Mermaid diagrams (the `<div class="mermaid">` contract) | `engineering/mermaid.md` |
| Adding a treatment — `tint-*` / `mark-*` peripheral accents | `engineering/treatments.md` |
| Palette tokens, Mermaid contract | `design/theming.md` |
| Core visual design principles (hierarchy, restraint) | `design/design-principles.md` |
| How a slide is composed — the Form vocabulary | `design/forms.md` |
| Prose rules for galleries/decks | `design/editorial.md` |
| The deck-authoring contract | `design/skill.md` |
| A rendered gallery of the design-system model | `design/design-system.gallery.md` |
| Cross-cutting authoring (eyebrow, subtitle, base modifiers) | `lib/base/base.docs.md` |
| A specific component's slots/variants/anti-patterns | `lib/components/<bucket>/<name>/<name>.docs.md` |
| Picking a component as an agent (machine catalog) | `dist/docs/components.json`, `AGENTS.md` |
| What scripts/tools/frameworks already exist (don't reinvent) | `engineering/capabilities.md` |
| The 10/10 visual rubric | `engineering/decisions/2026-06-06-layout-audit/` |
| A large visual sweep / parallel reviewer fan-out | `engineering/visual-review.md` |
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

## Cloud sandbox — standard practice (applies every web session)

The SessionStart hook provisions everything and **exports `CHROME_PATH`**: root
`node_modules`, poppler-utils, ImageMagick (best-effort), the emoji font, the
`docs/` package's deps, and the lefthook gates. These are the recurring
frictions — each one cost a prior session a debugging cycle. Don't re-discover
them; this block is canonical, the per-topic docs are the deep reference.

- **Render/test need `CHROME_PATH`** (the hook sets it). If a render says "no
  suitable browser found", re-export:
  `export CHROME_PATH=$(ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome | head -1)`.
- **See a slide without a browser:** render with the owned engine
  `node dist/lattice-emulator.js <deck> .scratch/x.pdf` then rasterize →
  `tools/rasterize-for-review.sh .scratch/x.pdf --overview --check` (poppler-only;
  ImageMagick is needed *only* for `--crop`/`--region`) → it writes one PNG per
  slide → `Read` it (renders inline).
- **Lint is `npm run lint`** — never `npx biome` (the registry `biome` is the
  wrong package).
- **One test file:** `node --test <file>` — the `<dir>` form errors; use
  `npm test` for the suite.
- **The docs site is a SEPARATE npm package** (the hook installs its deps).
  Serve it with **`cd docs && npm run dev`** — it runs the two sync steps
  (`sync:portal` + `sync:playground`) THEN `astro dev`, and npm puts
  `node_modules/.bin` on PATH so `astro` resolves. (Running `astro` BARE in a
  plain shell fails — it isn't global; and the bare-`./node_modules/.bin/astro`
  path SKIPS the sync, so after any `lib/` rebuild the preview silently serves a
  **stale bundle as a 200** — `npm run dev` re-syncs, so prefer it.) Stop the
  server **by port** (`fuser -k 4321/tcp`), never `pkill -f astro` (it
  self-kills). Screenshot with `node tools/screenshot.js <url> <png>` → `Read` it.
- **After a squash-merge, sync local `main`** (`git fetch origin && git reset
  --hard origin/main`) before branching/rebasing — a stale local `main` is what
  triggers the Stop hook's "unverified / rewrite history" nag. **Never** rewrite
  shared history; GitHub is the verification source of truth.

Deep reference: `engineering/development.md` (tooling), `engineering/gotchas.md`
(symptom index — e.g. the stale-bundle trap), `engineering/workflow.md`
(rebase/merge). Cross-cutting render facts (fonts fall back to serif here, the
TLS proxy MITMs CDN webfonts) live in `engineering/gotchas.md`.

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
- `marp-cli`/`CHROME_PATH` and the browser-free PNG preview live in
  §"Cloud sandbox" above — that's the canonical env reference.

---

## Design-before-code on "rethink X" requests

When asked to rethink something, write the design model first — name the
axes, list candidate moves, recommend one, confirm in one `AskUserQuestion`
round trip — before editing CSS or transforms. Bundle adjacent decisions.

`.scratch/` is for throwaway experiments (14-day lifecycle, `npm run clean:scratch`).
