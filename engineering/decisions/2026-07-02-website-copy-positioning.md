---
status: proposed
summary: Pre-GA website copy & positioning review — personas, Munger inversion, per-surface from→to copy changes, landing IA restructure, and the broken getting-started funnel (P0)
last-updated: 2026-07-02
---

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
willing to concede weaknesses. The problem is aim, not craft. The
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
  layout. Judgment call, not a sourced claim: this looks like the wedge with
  the most momentum in 2026, and Lattice has real substance here (machine
  catalog, published spec, deterministic render) — but the landing page never
  says it. Biggest upside per word changed. One tension to manage: an
  agent-authoring section on a page whose hero positions *against* AI deck
  tools only works if it keeps the split-layers framing (the model drafts,
  the engine owns the pixels) — see §5.5.
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
   introduction and features page say 53, and the README manages three counts
   by itself — "20+ more" (line 13), "Fifty-two components" (line 26), and
   "53 components." (line 109). The engine actually ships **55** (`loadAll()`
   count; `contact` and `wifi` are in no marketing count), across **13**
   buckets — the features page still says 12 in three places. It even prints
   "Counts are live against the engine" over hardcoded numbers. ← Present on
   five surfaces.
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
7. **Keep your best evidence off the page that gets the traffic.** The
   fact-check receipts (best AI tool: 20% of claims verified), the Tome
   shutdown, the Copilot brand-violation story — the strongest conversion
   material on the site — appear only on /comparison. The top nav does link
   it (one click), but the landing body gives it zero salience; a visitor has
   to already want a comparison to find the receipts. ← Present.
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
- To: `Write the *words*. The design is settled.`
- Why: keeps the cadence, kills the Gamma echo, and states the actual
  mechanism — the design decisions were made before you arrived, and they
  hold. The checker pass rejected two earlier candidates for real defects:
  "The design is already done" misreads as a release note ("we finished
  designing the product"), and "Nothing drifts." uses "drift" as jargon at
  headline altitude, before the page has defined it. "Settled" carries both
  pre-built and won't-move, which is the deterministic claim §3 asks for.

**Hero paragraph**
- From: `You write the deck as a Markdown file and pick a named layout for
  each slide. Lattice assembles every page against one shared palette — no
  dragging, no nudging, no formatting drift.`
- To: `Your deck is one plain text file — a few lines of Markdown per slide,
  and the name of a layout for it. Lattice sets every page in the same
  palette and type scale: no dragging, no nudging, no drift.`
- Why: "one plain text file" is the concrete image; "named layout" was doing
  quiet work that "the name of a layout" does plainly; "palette and type
  scale" names both things the engine actually locks.

**Trust line** — keep as is (`No install to try it. Runs on your laptop or
in CI. Fully offline. MIT-licensed.`). An earlier draft appended an
early-access clause here; the checkers flagged that saying pre-GA twice on
one page reads contradictory next to "v1" and dampens P1, the persona who
can adopt today. The early-access message lives once, in the §5.5 strip.

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
- To: `Write plain Markdown. Get the notation your field already uses.`
- Why: the current line reads as if Markdown *is* the native language; the
  point is the output notation. (An earlier "Markdown in / notation out"
  draft was cut by the prose check — it echoed the garbage-in-garbage-out
  template.)

**Card order** — from: math → project leads → engineers → lawyers → analysts
→ basics; to: **project leads → analysts & consultants → engineers → lawyers
→ math → basics.** Leading with KaTeX theorem cards signals "for academics"
to everyone else. Project timelines and evidence layouts are the broadest
on-ramp; math still gets its card.

**Analysts card**
- From: title `Analysts`, body `Radar, quadrant, KPI, stats, progress, pie,
  and word-cloud — the evidence layouts that turn numbers into an argument.`
- To: title `Analysts & consultants`, body `Radar, quadrant, KPI, stats,
  progress, pie, and verdict grids: the evidence layouts that turn numbers
  into an argument. Built for the QBR, the board pack, the client readout.`
- Why: consultants are the deck-heaviest profession alive and currently
  unnamed; the named artifacts (QBR, board pack, readout) are the search
  terms in their heads. `verdict-grid` really exists and earns its spot;
  `word-cloud` was the weakest name-drop. Keep `pie` — it is the one chart
  name every reader recognizes (checker catch). Split into two sentences so
  the list doesn't bury the verb.

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
  a derivation, a statute stack — the name says what the slide does. "Which
  layout do I want?" has an answer that isn't *scroll the gallery*.`
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
2. `Name a layout — big-number, gantt, verdict-grid, statute-stack.`
3. `Build — one command renders the PDF, PPTX, PNG, or HTML.`

**Proof strip** (after "Why"; one stat + one link):
- Headline (reused from /comparison, its best line): `The artsy deck wins the
  demo. The deterministic deck wins the boardroom.`
- Body: `When one team fact-checked six AI deck generators, the best got 20%
  of its claims right — a one-shot test, but the mechanism is the point: a
  model predicts plausible text; it doesn't look facts up. Lattice never
  invents a number or reshuffles a layout. It renders what you wrote, the
  same way every time.`
- Link: `Read the comparison — including where Lattice loses. →`
- Why: the receipts are the site's highest-converting material (inversion
  #7), and "including where Lattice loses" is the credibility hook. Two
  checker corrections folded in: the stat keeps the source's own "one test,
  directional" hedge (/comparison hedges it; the landing must not promote it
  harder than the source), and "honest" was cut from the link — material
  that calls itself honest undercuts the clause that proves it.

**Agent-era section** (after the proof strip; serves P2):
- Eyebrow: `AI authoring`
- Title: `Point your copilot at Lattice.`
- Body: `Lattice ships a machine-readable layout catalog and a published
  authoring spec, so Claude, Cursor, or any agent can draft a valid deck —
  and the engine renders it deterministically, on brand, without the model
  touching a single visual decision.`
- Link: `How AI authoring works →` (features page § AI authoring, or the spec)
- Why: the argument already exists on /comparison ("So split the layers");
  P2 should not have to find it there. Prose-check corrections folded in:
  the original eyebrow and closing sentence were the third and fourth
  "X verbs. Y verbs." couplets on one page — the device stays reserved for
  the two protected lines (§10); and "it" in the title had no antecedent.

**Early-access strip** (before "Pick a starting point"):
- `Lattice is in early access. The engine is stable and MIT-licensed, and it
  runs from the command line today; the SlideWright desktop app is on the
  way. Star the repo to follow along — or open the playground and make a
  slide right now.` CTAs: `Star on GitHub` / `Open the playground`.
- Why: inversion #9 — gives P3 an action that isn't "install Node." This is
  the page's *only* early-access mention (see §5.1 trust line).

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
  Chromium for rendering. There's no account and nothing to configure.`
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
  compare-prose, split-panel, verdict-grid, and dozens more —`
- From: `Fifty-two components, one syntax you already know`
- To: `More than fifty components, one syntax you already know`
- Also fix line 109's `**53 components.**` to the same "more than fifty"
  form — the README alone currently carries three different counts ("20+
  more", "Fifty-two", "53"), the doc's single best exhibit for §4 item 2.
- Why: "20+ more" undersells by 30; every fixed number rots (§7.3 — and note
  "fifty more" would just be 55 in disguise, which is why it's "dozens").
- README's Testing section repeats the broken-path claims (§4 item 5):
  lines ~344–347 call `examples/gallery.md` and `examples/gallery-mermaid.md`
  "the authoritative test fixtures" and say "The two galleries are committed
  to examples/" — neither is true; the fixture is
  `test/integration/baseline-decks/gallery.md`. Fix together with §5.8's P0.

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
- **Introduction meta description contradicts the site's flagship claim
  (checker catch).** From: `description: Lattice is a Marp-based slide-deck
  engine that turns plain Markdown into polished, repeatable,
  version-controlled PDFs.` To: `description: Lattice turns plain Markdown
  into polished, repeatable, version-controlled slide decks.` Why: the
  "What is Lattice?" page's search-visible description calls it "Marp-based"
  while getting-started and /comparison stress that Marp was dropped at
  v1.0.0 — a first-touch contradiction on the exact point the brand leans on.
- Everything else on /comparison: **keep the substance.** It is the best
  page on the site. The #21 spelling fixes still apply there too
  ("colour-blind-safe," "never name a colour" around line 483) — "keep"
  covers the arguments, not the British spellings.

### 5.11 Features (`features.astro`)

- The bucket counts (Anchor (3) … Imagery (1)) sum to 53 while the engine
  loads 55 manifests (`contact`, `wifi` are missing from the catalog table),
  and the footer claims "Counts are live against the engine." The bucket
  count is stale the same way: "12 buckets" appears in the catalog row, the
  meta description, and the footer, while the ownership gate itself reports
  **13** (the new `connect` bucket). Generate the table (or at least the
  counts) from `loadAll()` the way the landing already loads manifests —
  this page's honesty bar is its whole personality.
- From: `Every palette ships a dark variant. Switch the whole deck in one
  line.` To: `Nearly every palette pairs a dark variant — carbone is
  dark-native. Switch the whole deck in one line.` Why: `themes/` has no
  `carbone-dark.css`; the README already hedges this correctly ("most with a
  paired dark-canvas variant") and the features page shouldn't overclaim
  what the README doesn't (checker catch).
- From: `4 colour-blind-safe palettes` / `Components never name a colour` /
  other British spellings → US forms per #21.

### 5.12 Story (`story.md`) and branding

- Add a byline. `I built Lattice because…` with no name reads as copy
  pretending to be conviction. One line fixes it: a name, optionally a link.
- **Dedupe the brand story, don't just demote it.** README §"Why Lattice
  Style exists" + §"The name" reproduce story.md nearly verbatim — the same
  drift-on-a-no-drift-product problem as overview/introduction, on a
  higher-traffic surface. The README keeps two sentences and links the
  story page; story.md stays the canonical telling.
- On demoting **Lattice Style**: the checker pushed back that the site lives
  at lattice.style, so the name sits in the visitor's address bar and every
  footer — explaining it is load-bearing, not clutter. Refined position:
  first-touch surfaces (landing, intro, README hero) lead with **one** brand
  (Lattice) plus at most one forward pointer (SlideWright, "the desktop app,
  on the way"); the *explanation* of Lattice Style lives on the story page,
  one link away, rather than being repeated inline. The README hero
  currently makes a newcomer parse three names in two paragraphs
  (inversion #10).

### 5.13 Retire "builds/assembles itself" everywhere (consistency sweep)

If the H1 changes on positioning grounds (§3), the same auto-generation
language has to leave its other first-touch homes, or the collision just
moves:
- `introduction.md` ("Authors… write the words, pick a component, and the
  deck assembles itself.") → `…write the words, pick a component, and the
  engine does the rest.`
- `docs/src/playground/theme-studio.js` sample slide headline
  (`# The deck builds itself.`) → `# The design is settled.` — the sample a
  visitor actually edits should model the same claim the hero makes.

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
copy-pasted — again, drift on a no-drift product. The same dedupe applies to
README ↔ story.md (§5.12).

Chrome nit while in there: the landing footer omits Features and Comparison
while the features-page footer includes both — one footer nav, shared.

## 7. Standing decisions this review proposes

1. **Position against the dice-roll, not alongside it.** The hero and every
   first-touch surface leads with deterministic design, never with
   auto-generation language ("builds itself," "instantly," "magic").
2. **One word for the thing: "layout" on marketing surfaces, "component" in
   reference docs**, glossed on first use in docs ("components — the named
   slide layouts"). Today the hero says layout, the intro says component, the
   features page says both. Pick per-surface and hold it — including within
   the landing itself: the next-steps card titled "Component reference"
   becomes "Browse the layouts" (the `/components/` URL can stay), or the
   landing still carries both words on one page.
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
   "stand-in." The `bin` alias already exists — `package.json` maps
   `lattice` → `dist/lattice-emulator.js`, and the README's "Use as a
   package" section documents `npx lattice …` (checker correction to an
   earlier draft of this flag). The actual gaps are that getting-started
   teaches the raw filename instead of the alias, and the package isn't on
   npm yet, so `npx lattice` only works inside a clone. Fix the docs today;
   publish when ready.
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
5. **Off-path tooling finding, logged per HARD RULE #18:** the US-English
   scan in `tools/check-ownership.js` counts gitignored generated artifacts
   when they exist on disk (`docs/public/components.md`,
   `docs/public/playground/v/<hash>/…` — written by the docs dev/build).
   A clean checkout passes; a tree that has run the docs site fails
   `build:check` and the pre-push hook at 1529 > 1364 through no change of
   its own. Reproduced both ways during this review (clean worktree of the
   same main commit: green; this tree with the artifacts present: red;
   deleting the artifacts: green). Fix direction: skip gitignored paths (or
   add these two generated paths to the scan's skip list).

## 9. Independent checks run on this review

Two independent agents reviewed the draft; everything accepted below is
already folded into the sections above.

**Prose check (AI-tell / read-aloud audit of every proposed "To:" string).**
Accepted: the agent-era section had re-created the doc's own protected
"owns the pixels" couplet twice more (eyebrow + closing sentence) — three
"X verbs. Y verbs." constructions on one page; both rewritten (§5.5).
"Point your copilot at it" had no antecedent for "it" → "at Lattice." The
field-section title echoed the garbage-in-garbage-out template → rewritten
as two plain sentences (§5.2). Card 5 carried an X-not-Y reversal → cut
(§5.3). The analysts card stacked two list-recitations in one sentence →
split (§5.2). The how-it-works strip ended a middle line on an ellipsis →
period (§5.5). "Read the *honest* comparison" self-applied the compliment →
cut (§5.5). The early-access strip recited a false-parallel rule-of-three →
split (§5.5). The doc's own verdict paragraph used the "not X; it is Y"
reversal template this review polices → rewritten (§1). Noted, partially
accepted: the "no X, no Y" negation-doublet recurs across the proposed copy;
kept as the hero's flagship move, removed from getting-started (§5.8), left
in the meta description (not read aloud). Rejected: rewriting §1's closing
four-part sentence (internal analysis prose, not shipping copy).

**Adversarial review (refute-first, claims re-verified against the tree).**
Confirmed: every quoted "From:" string verbatim at its cited path; the
55-manifest count; `contact`/`wifi` absent from all marketing counts;
`pricing`/`verdict-grid` exist; the features bucket sum (53) and the stale
"12 buckets"; the `marp: true` + emulator-filename first-run; the dialect
clashes; the overview/introduction duplication; the missing byline.
Accepted corrections to this doc: an earlier draft *claimed* verification
that `examples/gallery.pdf` was committed — it is not (no `examples/gallery*`
is tracked), exactly the unverified-"verified" HARD RULE #23 bars; §5.1 now
carries the prerequisite and §4 item 5 the P0 (this reviewer and my own
re-check found the broken funnel independently). The §8.1 bin-alias flag
misstated the gap (the alias exists; the docs and npm publishing are the
gaps). "Fifty more" was an exact count in disguise → "dozens more" (§5.9).
README line 109's third count, the Testing-section stale fixture claims, the
README↔story duplication, the "Marp-based" introduction meta description,
the comparison-page spellings, the carbone dark-variant overclaim, the
landing-footer drift, the theme-studio sample headline, and the
landing-internal layout/component mix (§7.2) were all missed by the draft →
added. Judgment challenges accepted: "The design is already done" misreads
as a release note → "The design is settled" (§5.1); the 20% stat needed its
source's own hedge (§5.5); early-access appeared twice on one page → once
(§5.1/§5.5); keep "pie" in the analysts card; "hide your best evidence"
overstated a one-click nav link → reworded (§4 item 7); "fastest-growing
wedge" was an unsourced claim in a doc that trades on receipts → stated as
judgment (§2). Rejected: dropping "boardroom" entirely (it stays as the
category modifier, §5.6); treating the agent-section-after-anti-AI-hero
tension as disqualifying (the split-layers framing carries it, §2).

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

- Copy quotes were read from source files at the paths cited, and the
  adversarial pass re-verified each quoted "From:" string verbatim.
- The rendered landing was screenshotted at 1440 / 820 / 390 from the local
  dev server (artifacts in the session scratchpad, shared in the PR
  conversation).
- The 55-component / 13-bucket counts came from executing `loadAll()` and
  `tools/check-ownership.js` in this repo; the broken getting-started
  commands were reproduced by running them (`error: source markdown not
  found`).
- No claim in this doc about live production behavior (lattice.style) was
  tested against production; all rendering evidence is from the local dev
  server build of this commit.
