# Website copy & positioning review — pre-GA traction pass

**Date:** 2026-07-02
**Status:** Proposed (recommendations only; no site copy changed in this PR)
**Surfaces reviewed:** landing (`docs/src/pages/index.astro`, `HeroCopy.tsx`,
`sections.tsx`), `features.astro`, `comparison.astro`, `introduction.md`,
`overview.mdx`, `getting-started.md`, `story.md`, root `README.md`, site nav +
footer. Rendered landing screenshotted at 1440 / 820 / 390 via
`tools/screenshot.js` against the local Astro dev server.
**Method:** persona-first read, then a Munger inversion pass ("how would we
guarantee this site gets no traction?"), then per-surface from→to edits. An
independent prose checker and an adversarial reviewer were run on this doc's
proposed copy; their accepted findings are folded in (§9).

---

## 1. Verdict in one paragraph

The writing is far better than the median dev-tool site — concrete, specific,
willing to concede weaknesses. The problem is not craft; it is **aim**. The
hero promises the same thing Gamma and Tome promise ("the deck builds
itself"), so the one visitor segment that would love Lattice — people burned
by AI deck roulette — reads the headline and files it with the tools that
burned them. Meanwhile the site's strongest material (the comparison page's
receipts, the determinism argument, the agent-era split of "the AI writes, the
engine renders") sits two clicks deep. And a product whose entire pitch is
*consistency* publishes four different component counts across five surfaces.
Fix the aim, surface the receipts, make the numbers agree, and give the
non-terminal majority something to do besides leave.

## 2. Who this is for (personas, in priority order for pre-GA)

- **P1 — The plain-text native.** Engineers, quants, technical PMs already in
  Marp / Slidev / Beamer / Quarto or fleeing them. Can use Lattice *today*.
  They convert on: determinism, git-diffable decks, no design work, MIT.
  Current copy serves them well. Keep them first until GA — they are the only
  persona who can install the product this quarter.
- **P2 — The agent-workflow builder.** People who draft decks with Claude,
  Cursor, or a pipeline, and need a render target that cannot hallucinate a
  layout. This is the fastest-growing wedge in 2026 and Lattice has real
  substance here (machine catalog, published spec, deterministic render) —
  but the landing page never says it. Biggest upside per word changed.
- **P3 — The deck-burdened expert.** Consultants, analysts, lawyers, finance —
  the people who make the most decks on earth and own the "boardroom" framing.
  Today they can only touch the playground; the desktop app isn't shipped.
  Serve them with the playground plus an explicit "follow along" capture, not
  with silence.
- **P4 — The brand / design gatekeeper.** Buys consistency at scale, WCAG,
  no-telemetry. The "Why" section and comparison receipts speak to them;
  they arrive later via P1–P3, so no landing changes needed beyond what P1–P3
  get.
- **Explicitly not an audience:** executives and boards. They *receive* the
  PDFs; they don't visit tooling sites. "Boardroom" is the destination of the
  artifact, not the reader of the page — the copy mostly gets this right.

The mass-appeal product is SlideWright, and it hasn't shipped. Pre-GA, "mass
appeal" therefore means: convert P1 now, recruit P2 as evangelists, and
*collect* P3 (stars, release-watch, playground shares) so launch day has an
audience.

## 3. The positioning collision (the one strategic fix)

"Write the *words*. The deck builds itself." is the promise of every AI deck
generator on the comparison page. Two failure modes follow:

1. A visitor who wants that promise expects a prompt box, meets Markdown plus
   layout names, and bounces.
2. A visitor who *distrusts* that promise — Lattice's best prospect — bounces
   at the headline without scrolling.

Lattice's ownable claim is the one the comparison page already makes
brilliantly: **deterministic design**. The words are yours; the design is
finished before you arrive, and it renders the same way every time. The hero
should carry that claim, not the auto-magic one.

## 4. Munger inversion — how to guarantee no traction

Invert the goal: what would a site do to make sure Lattice never catches on?
Each item below is followed by where the current site stands.

1. **Sound exactly like the incumbents you beat.** ← Current hero does this
   (§3). *Worst offender; fix first.*
2. **Contradict your own core promise in the copy.** A consistency product
   with inconsistent numbers: landing says "Fifty-two layouts" (twice), the
   introduction and features page say 53, the README says 52 and "20+ more,"
   and the engine actually ships **55** (`loadAll()` count; `contact` and
   `wifi` are in no marketing count). The features page even prints "Counts
   are live against the engine" over hardcoded numbers. ← Present on five
   surfaces.
3. **Mix dialects mid-card.** One Why card is titled "Brand colors live in
   one file" and its body says "never name a colour." British spellings on
   the landing also violate HARD RULE #21. ← Present (landing, features).
4. **Speak internal jargon to first-time visitors.** "Function · Form ·
   Substance · Finish," "the authoring contract," "the owned engine" — team
   vocabulary leaking into first-touch surfaces. ← Present (landing card 5,
   next-steps card, getting-started).
5. **Make the very first documented command fail.** Getting-started's two
   flagship commands — `node lattice-emulator.js examples/gallery.md …` and
   `… examples/gallery-mermaid.md …` — both exit with
   `error: source markdown not found`. Neither file exists: the gallery lives
   at `test/integration/baseline-decks/gallery.md`, and no
   `gallery-mermaid.md` exists anywhere in the repo. The introduction's "See
   it first" link (`github.com/…/examples/gallery.pdf`) 404s for the same
   reason, and README line 232 repeats the broken command. The single most
   important proof artifact is unreachable from every path the site offers.
   ← **Present, verified by running the command. This is the P0 of the whole
   review** — everything else is optimization; this is a newcomer's session
   ending in an error message.
6. **Make the first command feel like a prototype.** Even once the paths are
   fixed, the first thing a newcomer types is `node lattice-emulator.js` —
   "emulator" reads as stand-in, not product — after a front-matter block
   whose first line is a competitor's name (`marp: true`). ← Present
   (getting-started, README). Product-level, not copy-level; flagged in §8.
7. **Hide your best evidence.** The fact-check receipts (best AI tool: 20% of
   claims verified), the Tome shutdown, the Copilot brand-violation story —
   the strongest conversion material on the site — appear only on
   /comparison, unlinked from the landing body. ← Present.
8. **Show single slides, never a deck.** The buyer question is "what does a
   *whole* deck look like?" The landing shows one hero slide and six card
   slides; `examples/gallery.pdf` is linked only from a docs page. ← Present.
9. **Give the majority persona nothing to do.** A consultant who can't
   install Node gets no waitlist, no "star to follow," no email capture —
   only a footnote that a desktop app is "under development." ← Present.
10. **Ship three brand names before shipping one product.** Lattice, Lattice
   Style, SlideWright — tripled surface area for a first-timer's confusion.
   ← Present (README hero, story, intro).
11. **Have an anonymous founder voice.** "I built Lattice because…" with no
    name attached anywhere. First-person conviction with no person. ← Present
    (story.md, README).

Everything in §5–§7 exists to un-do one or more of these.

## 5. Specific copy changes — from → to

House style is preserved: short declaratives, em-dashes, no marketing
superlatives. Counts follow the policy in §7.3.

### 5.1 Landing hero (`docs/src/components/landing/HeroCopy.tsx`)

**H1**
- From: `Write the *words*. The deck builds itself.`
- To: `Write the *words*. The design is already done.`
- Why: keeps the cadence, kills the Gamma echo, states the actual mechanism
  (a finished design system) instead of implying generation. Alternate if a
  sharper edge is wanted: `Write the words. Nothing drifts.`

**Hero paragraph**
- From: `You write the deck as a Markdown file and pick a named layout for
  each slide. Lattice assembles every page against one shared palette — no
  dragging, no nudging, no formatting drift.`
- To: `Your deck is one plain text file: a few lines of Markdown per slide,
  plus the name of a layout. Lattice sets every page in the same palette and
  type scale — no dragging, no nudging, no drift.`
- Why: "one plain text file" is the concrete image; "named layout" was doing
  quiet work that "the name of a layout" does plainly; "palette and type
  scale" names both things the engine actually locks.

**Trust line**
- From: `No install to try it. Runs on your laptop or in CI. Fully offline.
  MIT-licensed.`
- To: `No install to try it. Runs on your laptop or in CI. Fully offline.
  MIT-licensed. Early access — the engine is v1; the desktop app is on the way.`
- Why: honesty about pre-GA status, stated as confidence. Sets expectations
  before getting-started does it the hard way.

**CTAs** — keep `Try it in your browser` and `Get started`; add a tertiary
text link under the trust line:
- New: `Or skim a finished deck first — the full gallery, as a PDF. →`
- Why: answers "show me a real deck" without leaving the fold (inversion #8).
- **Prerequisite:** there is currently no committed `examples/gallery.pdf` to
  link (inversion #5) — the gallery lives at
  `test/integration/baseline-decks/gallery.pdf`. Either restore an
  `examples/gallery.pdf` (or copy the built PDF into `docs/public/`) and link
  that, or link the baseline-decks path directly. Do not ship this link
  before the artifact exists at a stable URL.

### 5.2 Landing "speaks your field" section (`index.astro`, `sections.tsx`)

**Section title**
- From: `Plain Markdown — in the native language of your work.`
- To: `Plain Markdown in. The notation of your field out.`
- Why: the current line reads as if Markdown *is* the native language; the
  point is the output notation. In/out states the transform.

**Card order** — from: math → project leads → engineers → lawyers → analysts
→ basics; to: **project leads → analysts & consultants → engineers → lawyers
→ math → basics.** Leading with KaTeX theorem cards signals "for academics"
to everyone else. Project timelines and evidence layouts are the broadest
on-ramp; math still gets its card.

**Analysts card**
- From: title `Analysts`, body `Radar, quadrant, KPI, stats, progress, pie,
  and word-cloud — the evidence layouts that turn numbers into an argument.`
- To: title `Analysts & consultants`, body `Radar, quadrant, KPI, stats,
  progress, pricing, and verdict grids — the evidence layouts that turn
  numbers into an argument, for the QBR, the board pack, and the client
  readout.`
- Why: consultants are the deck-heaviest profession alive and currently
  unnamed; the named artifacts (QBR, board pack, readout) are the search
  terms in their heads. `pricing` and `verdict-grid` really exist; `pie` and
  `word-cloud` were the two weakest name-drops.

**Basics card**
- From: `A bullet list becomes a card grid; a table becomes a comparison
  matrix. Fifty-two layouts, one Markdown syntax.`
- To: `A bullet list becomes a card grid; a table becomes a comparison
  matrix. More than fifty layouts, one Markdown syntax.`
- Why: §7.3 counts policy — the hardcoded 52 is already wrong twice over.

### 5.3 Landing "Why" cards (`sections.tsx`)

**Card 1 body**
- From: `Change a palette once; every deck picks it up on the next build.
  Layouts never name a colour — they read var(--token).`
- To: `Change a palette once; every deck picks it up on the next build.
  Layouts never name a color — they read var(--token).`

**Card 3 (Mermaid) body**
- From: `…No per-diagram styling, no recolouring by hand.`
- To: `…No per-diagram styling, no recoloring by hand.`
- Why (both): HARD RULE #21, and the title/body dialect clash inside card 1
  is exactly the drift the section says Lattice prevents.

**Card 5**
- From: title `Fifty-two layouts, one vocabulary.`, body `Function · Form ·
  Substance · Finish organizes the catalog, so "which layout do I want?" has
  an answer that isn't *scroll the gallery*.`
- To: title `Layouts you ask for by name.`, body `You ask for a verdict grid,
  a derivation, a statute stack — a name for what the slide *does*, not a
  template to redecorate. "Which layout do I want?" has an answer that isn't
  *scroll the gallery*.`
- Why: Function·Form·Substance·Finish is team vocabulary; it earns its place
  on the story page and in docs, not in a first-touch card. The three named
  layouts do the same job in words a visitor already owns.

### 5.4 Landing restyle section (`index.astro`)

- From (lead): `Watch a single slide move through every palette — in light or
  dark. Brand colours live in one file and the components never name a
  colour, so a whole deck restyles by editing one theme: line.`
- To: `Watch a single slide move through every palette — in light or dark.
  Brand colors live in one file and the layouts never name a color, so a
  whole deck restyles by editing one theme: line.`
- Why: #21 again, plus "components"→"layouts" per the terminology decision
  (§7.2).

### 5.5 Landing — two new sections (see §6 for placement)

**"How it works" strip** (after the hero; three steps, one line each):
1. `Write — a slide is a few lines of Markdown.`
2. `Name a layout — big-number, gantt, verdict-grid, statute-stack…`
3. `Build — one command renders the PDF, PPTX, PNG, or HTML.`

**Proof strip** (after "Why"; one stat + one link):
- Headline (reused from /comparison, its best line): `The artsy deck wins the
  demo. The deterministic deck wins the boardroom.`
- Body: `When one team fact-checked six AI deck generators, the best got 20%
  of its claims right. Lattice never invents a number or reshuffles a layout —
  it renders what you wrote, the same way every time.`
- Link: `Read the honest comparison — including where Lattice loses. →`
- Why: the receipts are the site's highest-converting material (inversion
  #7), and "including where Lattice loses" is the credibility hook.

**Agent-era section** (after the proof strip; serves P2):
- Eyebrow: `The AI writes. The engine renders.`
- Title: `Point your copilot at it.`
- Body: `Lattice ships a machine-readable layout catalog and a published
  authoring spec, so Claude, Cursor, or any agent can draft a valid deck —
  and the engine renders it deterministically. The model chooses the words.
  It never touches the pixels.`
- Link: `How AI authoring works →` (features page § AI authoring, or the spec)
- Why: the argument already exists on /comparison ("So split the layers");
  P2 should not have to find it there.

**Early-access strip** (before "Pick a starting point"):
- `Lattice is in early access. The engine is stable, MIT-licensed, and in use
  today from the command line; the SlideWright desktop app is on the way.
  Star the repo to follow along — or open the playground and make a slide
  right now.` CTAs: `Star on GitHub` / `Open the playground`.
- Why: inversion #9 — gives P3 an action that isn't "install Node."

### 5.6 Page metadata (`index.astro`)

- From (title): `Lattice — boardroom-quality slide decks from Markdown`
- To: `Lattice — Markdown to boardroom-ready slide decks (PDF, PPTX)`
- From (description): `Lattice turns a plain Markdown file into a
  boardroom-quality slide deck. Pick a named component per slide; the engine
  assembles every deck against one palette.`
- To: `Write plain Markdown, pick a layout per slide, and Lattice renders a
  polished PDF, PPTX, or HTML deck — one palette, no drift, no design work.
  Free, offline, MIT-licensed.`
- Why: nobody searches "boardroom-quality"; they search "markdown to
  slides/pptx/pdf." Put the searched phrase in the title, keep the positioning
  word ("boardroom-ready") as the modifier.

### 5.7 Next-steps cards (`index.astro`)

- From (Author decks body): `Learn the layout catalog and the authoring
  contract slide by slide.`
- To: `Every layout, what it's for, and the Markdown that feeds it.`
- Why: "the authoring contract" is internal vocabulary (inversion #4).

### 5.8 Getting started (`docs/src/content/docs/getting-started.md`)

**P0 — fix the broken first-run commands (inversion #5).**
- From:
  `node lattice-emulator.js examples/gallery.md examples/gallery.pdf`
  `node lattice-emulator.js examples/gallery-mermaid.md examples/gallery-mermaid.pdf`
- To (until the galleries are restored under `examples/`):
  `node lattice-emulator.js test/integration/baseline-decks/gallery.md gallery.pdf`
  — and drop the `gallery-mermaid` line entirely (no such deck exists; the
  Mermaid story is told by the diagram components in the main gallery).
- Also fix the follow-up sentence `Open examples/gallery.pdf — that is the
  fastest answer…` to match, the same command at README line 232, and the
  introduction's GitHub link to `examples/gallery.pdf` (currently a 404).
- Better (product-level, §8): restore `examples/gallery.md` + committed
  `examples/gallery.pdf` so the friendly path is real — the current path
  makes a newcomer's first artifact live under `test/integration/`.

**Opening**
- From: `Lattice runs on Node.js. npm install pulls in the Mermaid CLI and
  Puppeteer (which downloads a matching Chromium); it does **not** pull Marp —
  the owned engine renders every first-party path. Requires **Node 22+**.`
- To: `Fastest first look: the [playground](/playground/) runs the full
  engine in your browser — no install. To render locally you need **Node 22
  or newer**; npm install pulls in everything else, including a headless
  Chromium for rendering. Nothing to configure, nothing to sign up for.`
- Why: the Marp disclaimer answers a question no newcomer asked and plants a
  doubt they didn't have ("wait, what's Marp, and why are we defensive about
  it?"). "The owned engine" is team speak. And the page should open with the
  zero-install path.

**CLI sentence**
- From: `Build it with the bundled lattice CLI (the owned engine) — the
  output extension picks the format:`
- To: `Build it with the bundled CLI — the output extension picks the
  format:`
- Why: same jargon removal; also the sentence currently promises a `lattice`
  CLI and then shows `node lattice-emulator.js` (see §8.1).

### 5.9 README

- From: `…every slide is a deliberate component — title, diagram,
  compare-prose, split-panel, verdict-grid, and 20+ more —`
- To: `…every slide is a deliberate component — title, diagram,
  compare-prose, split-panel, verdict-grid, and fifty more —`
- From: `Fifty-two components, one syntax you already know`
- To: `More than fifty components, one syntax you already know`
- Why: "20+ more" undersells by 30; both fixed numbers rot (§7.3).

### 5.10 Introduction (`introduction.md`) and comparison (`comparison.astro`)

- From (intro): `Fifty-three components in all — and you reach every one of
  them with the same Markdown…`
- To: `More than fifty components in all — and you reach every one of them
  with the same Markdown…`
- From (comparison, weaknesses card): `Markdown, a CLI, 53 components, and an
  authoring contract with rules.`
- To: `Markdown, a CLI, more than fifty layouts, and an authoring contract
  with rules.` (the "authoring contract" phrase is fine *here* — this card is
  deliberately listing the learning curve.)
- Everything else on /comparison: **keep.** It is the best page on the site.

### 5.11 Features (`features.astro`)

- The bucket counts (Anchor (3) … Imagery (1)) sum to 53 while the engine
  loads 55 manifests (`contact`, `wifi` are missing from the catalog table),
  and the footer claims "Counts are live against the engine." Generate the
  table (or at least the counts) from `loadAll()` the way the landing already
  loads manifests — this page's honesty bar is its whole personality.
- From: `4 colour-blind-safe palettes` / `Components never name a colour` /
  other British spellings → US forms per #21.

### 5.12 Story (`story.md`) and branding

- Add a byline. `I built Lattice because…` with no name reads as copy
  pretending to be conviction. One line fixes it: a name, optionally a link.
- Demote **Lattice Style** everywhere except the story page. Pre-GA, every
  first-touch surface should carry exactly one brand (Lattice) plus at most
  one forward pointer (SlideWright, "the desktop app, on the way"). The
  README hero currently makes a newcomer parse three names in two paragraphs
  (inversion #10).

## 6. Landing information architecture (proposed order)

1. Hero (revised, §5.1) — with the gallery-PDF text link
2. **How it works** — new, three steps (§5.5)
3. Speaks your field — reordered cards (§5.2)
4. Why decks drift — revised cards (§5.3); keep the section head verbatim,
   it's the best line on the site
5. **Proof strip** — new (§5.5)
6. **Point your copilot at it** — new (§5.5)
7. Change one line, restyle the deck (§5.4)
8. **Early access / star** — new (§5.5)
9. Pick a starting point (§5.7)

Docs IA: `overview.mdx` and `introduction.md` open with the same "you have
been on the receiving end…" narrative nearly verbatim. Keep the narrative in
*one* place (introduction), and make Overview a pure hub (cards only), or
redirect it. Two near-identical entry pages split SEO and make the docs feel
copy-pasted — again, drift on a no-drift product.

## 7. Standing decisions this review proposes

1. **Position against the dice-roll, not alongside it.** The hero and every
   first-touch surface leads with deterministic design, never with
   auto-generation language ("builds itself," "instantly," "magic").
2. **One word for the thing: "layout" on marketing surfaces, "component" in
   reference docs**, glossed on first use in docs ("components — the named
   slide layouts"). Today the hero says layout, the intro says component, the
   features page says both. Pick per-surface and hold it.
3. **Counts policy:** an exact component/palette count may appear only where
   it is generated from the manifests at build time (the landing already
   loads `loadAll()` — use `manifests.length`). Hand-written prose says
   "more than fifty." This turns inversion #2 off permanently instead of
   patching today's numbers.
4. **Every first-touch surface gets a "what to do if you can't install this
   yet" action** (playground, gallery PDF, star/watch) until SlideWright
   ships.

## 8. Blocking traction but not copy-fixable (product-level flags)

1. **`lattice-emulator.js` is the newcomer's first command.** The name says
   "stand-in." A `bin` alias (`lattice`) or an npm package
   (`npx @slidewright/lattice deck.md deck.pdf`) would let getting-started
   read like a product. The docs sentence already promises "the bundled
   `lattice` CLI" — the filename is the only thing keeping that from being
   true.
2. **`marp: true` is the first line of front-matter a newcomer writes.**
   Whatever the engine needs for compatibility, the *authored* example
   should not open with a competitor's brand. If the engine can accept
   `lattice: true` (or nothing), the examples and docs should switch.
3. **No newsletter/waitlist mechanism for SlideWright.** Stars and
   release-watching are the free stand-in; a one-field email capture on the
   early-access strip is the upgrade when there's somewhere to point it.
4. **Restyle carousel rendered as an empty gray panel** in the full-page
   1440px screenshot (client:visible island; IntersectionObserver may simply
   not fire in a full-page headless capture). **UNVERIFIED as a real-user
   bug** — verify in a scrolled interactive session before treating it as
   one.

## 9. Independent checks run on this review

**Status: in flight.** Two independent agents are reviewing this draft — a
prose checker (AI-tell / read-aloud audit of every proposed "To:" string) and
an adversarial reviewer (refute-first pass on the factual claims and the
marketing judgment, claims re-verified against the codebase). Their accepted
and rejected findings will be recorded here, and folded into the text, before
this PR is marked review-ready. Findings already self-verified by running
code: the 55-manifest count (`loadAll()`), the features-page bucket sum (53),
the missing `contact`/`wifi` entries, and the failing getting-started
commands (§4 item 5, reproduced directly).

## 10. What NOT to change (protect list)

- `Every deck looks like it came from the same team — because it did.`
- `You choose meaning; the engine owns the pixels.`
- `The artsy deck wins the demo. The deterministic deck wins the boardroom.`
  (promote it to the landing; don't rewrite it)
- The whole "What it isn't" section of the introduction, and the /comparison
  weaknesses cards — the concessions are the credibility engine.
- `A text file in, a polished PDF out` (hero eyebrow)
- The footer line `Designed by humans. Refined with Claude.`

## 11. Verification note

- Copy quotes were read from source files at the paths cited; the rendered
  landing was screenshotted at 1440 / 820 / 390 from the local dev server
  (artifacts in the session scratchpad, shared in the PR conversation).
- The 55-component count came from executing `loadAll()` in this repo.
- No claim in this doc about live production behavior (lattice.style) was
  tested against production; all rendering evidence is from the local dev
  server build of this commit.
