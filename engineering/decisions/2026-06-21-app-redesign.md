---
status: proposed
summary: Unify Playground + Drawing Board + Workbench into one Studio — one app shell, a context command bar, a deck Inspector vs workspace Settings split, deck-scoped Share, and a first-class reader (read-aloud + AI reshape) — built as an incremental stack of independently-shippable wins.
---

# The Studio redesign — one workspace, three intents, one chrome

> Status: **PLAN — awaiting author approval (of Win 0 only; see §11.5 PM-2).** No
> production code has moved. Read **§0 (ratified forks)** for what the author
> chose, then **§11.5 (pre-mortem)** + the **§16 amendment** (v2→v3 shell) for the kill-criteria that constrain it — a
> few PM-# override the §0 defaults. The rest is reasoning and build order. This continues the work in
> `2026-06-09-shadcn-migration.md` (now landed): that effort gave us the
> *component spine* (React + Tailwind v4 + shadcn, the token bridge, the shared
> `SiteHeader`). This effort fixes the *information architecture* the spine
> still wears — three overlapping tools, four scattered settings surfaces, an
> export menu that mixes two intents, and no front door for the reader.

## 0. Ratified forks (2026-06-21)

The author reviewed the diagnosis below and ratified four decisions. **These are
the contract; everything else in this doc serves them.**

1. **One unified Studio; the three tools become *modes* (intents).** Playground,
   Drawing Board, and Workbench stop being three destinations you choose between.
   They become three *intents* — **Compose · Present · Fabricate** — of one
   workspace that shares identity, chrome, and the deck under the cursor.
   Playground becomes the **zero-setup entry state of Compose** (no deck saved
   yet), so "try it" and "build it" stop being a fork.
2. **Settings split by scope: deck vs workspace.** A non-modal **Deck Inspector**
   (right side, **collapsed-by-default — the preview is sacred, see PM-4**) owns
   *this deck* (theme, size, pagination, header/footer, reader/voice prefs,
   lenses). One global **Workspace Settings** surface owns *your setup* (AI model +
   tier, cloud auth, spend/budget, standing instructions, prompt caching, deck
   storage). Location encodes scope — the user never wonders "is this per-deck or
   global?"
3. **Share belongs to the deck and lives in the global chrome** (reachable in
   both Compose and Present). Print **offers both targets**: *Print deck*
   (rendered, vector — default) and *Print source* (the Markdown, for
   review/markup). Source exports (Markdown, Marp bundle) sit in a clearly
   separated "developer / portability" group, apart from audience artifacts
   (Present link, PDF, PPTX, Print).
4. **First deliverable is this design doc; then we build in stacked wins.** Each
   win is one branch → one PR (HARD RULE 17), independently builds/tests on
   `main`, and is independently revertible. §12 is the order.

**Pre-GA context (author, 2026-06-21):** nothing has shipped publicly — we are in
final polish before GA. So **renaming and route changes carry no external cost**
(no public URLs, bookmarks, or SEO to break); the author is comfortable renaming
*carefully*. The remaining cost is internal: every reference moves in the same PR,
and a rename must **honor the reasoning past decisions encoded** (a name is often a
decision in disguise). The one immovable internal coupling is the OAuth callback
path (PM-8). This relaxes PM-9 / RD3 / PM-I from "forever-URLs" to "disciplined
internal migration."

**Carry-over constraints from the shadcn migration (still binding):**

- **No engine touch.** No PR under this effort edits `lib/`, `themes/`, or
  `dist/`. The slide engine and `lattice.css` are untouched; this is *chrome and
  app IA only*.
- **Docs-site changes get NO `CHANGELOG.md` entry** — the changelog drives the
  published *engine* package; the website is pure-internal (HARD RULE 10 scopes
  to user-visible *engine* changes). Update the relevant `engineering/` doc + this
  decision doc's changelog instead.
- **Keep new website tooling out of the root `package.json` `scripts`** — the
  emulator bundle inlines the root `package.json`, so a new root script staling
  `dist/` forces a forbidden rebuild. Website gates run from `docs/` / the unit
  suite.
- **Wrap, don't reinvent the irreducible engine.** CodeMirror, the `srcdoc`
  deck-render iframe, the export/PDF/PPTX pipeline, the IndexedDB store, driver.js
  tours, the TTS worker — wrapped in React lifecycle (single-init refs,
  StrictMode-guarded), never reimplemented.
- **Reuse the *logic*, rebuild the *view*.** A recurring precision point from the
  checker pass: the existing deck-config, settings, and export modules
  (`deck-config.js`, `drawing-board-settings.js`, `drawing-board-export.js`) have
  **pure, often unit-tested cores** (parse/serialize, model routing, the export
  entry points) that are genuinely reusable — but their *control surfaces are
  vanilla `document.createElement` DOM*, not React. Each Inspector/Settings/Share
  win therefore **reuses the pure core and rebuilds the panel against the `ui/`
  primitives.** "Re-house" below always means that, never "move the DOM as-is."
- **Export bytes are sign-off-gated.** Anything that changes the *bytes* of an
  exported artifact STOPS for author inspection (CLAUDE.md Quality Bar). Moving
  *where the export controls live* does not change bytes and is in scope; touching
  `drawing-board-export.js` output is not.

## 1. Why — where the cognitive load actually comes from

The shadcn migration made every surface a clean React + shadcn app over one token
system. That fixed *craftsmanship*. It did not fix *information architecture*:
the surfaces were ported one-for-one, so the structural friction survived intact.
Five concrete load sources, each measured against "minimize cognitive load,
minimize clicking, intuitive by default":

1. **Two tools answer the same question.** Playground and Drawing Board are both
   "type Markdown → see slides." The very first decision a user makes — *which one
   do I open?* — is pure overhead, and the answer ("Playground is the lite one,
   Drawing Board is the real one") is a thing you have to *learn*, not infer.
2. **The chrome is split-brained below the shared header.** The top `SiteHeader`
   is shared and excellent. But each app then grows its *own* control vocabulary
   under it — the Playground `.pg-bar`, the Drawing Board's top-bar chips +
   Refine menu, the Workbench faculty Tabs + `.studio-mode-btn`s. Move between
   surfaces and you re-learn the controls each time. This is precisely the
   "context-sensitive menu bars" the author flagged: there is no single
   command-bar *pattern*, just N bespoke ones.
3. **Settings are scattered and modal-heavy.** Deck config (theme/size/
   pagination) is one drawer; AI + cloud + spend is another drawer; export is a
   dropdown; galleries is a sheet. Four separate *click-into-a-panel, lose your
   place, click-out* surfaces, with no spine telling you which knobs are about
   *this deck* and which are about *your account*.
4. **Export conflates two intents.** Handing off the **artifact** (PDF / PPTX /
   Print / a present link) and handing off the **source** (Markdown / Marp
   bundle) live in one undifferentiated dropdown — different audiences, different
   mental models. And "which mode owns export?" has no clean answer because
   export belongs to the *deck*, not to a mode.
5. **The reader has no front door.** Present + read-aloud exist only as *lazy
   full-screen takeovers buried inside one tool* (Drawing Board's Present /
   Practice). Yet "meet the reader, read it aloud with synchronized highlight,
   reshape the deck into the form the reader wants" is the exact area the author
   most wants to grow. A buried takeover is the opposite of a front door.

The redesign is structural, not cosmetic: it removes the *forks*, unifies the
*chrome pattern*, gives *settings a scope spine*, splits *export by intent*, and
gives *the reader a first-class home*.

## 1.5 Personas — who the Studio serves, and how

Five personas anchor every decision below. Each one's primary journey is a path
through the **Compose · Present · Fabricate** intents — the model earns its keep
only if these journeys get *shorter and calmer*, not just prettier. (The fifth,
the *recipient*, is the one today's app has no front door for — and the one the
"meet the reader where they want to go" brief is about.)

### P1 — Maya, the operator (founder / COO)
- **Goal:** a board-ready deck by tomorrow morning; look sharp, spend zero time on
  tooling.
- **Frustrates today:** "Playground or Drawing Board?"; hand-editing front matter;
  hunting for export; no confidence the deck is actually *good*.
- **Journey:** lands in **Compose**'s zero-setup state → types/pastes content →
  the **Architect** aside says "board-ready, tighten 2 slides" and she clicks the
  fix chips → **Inspector** to pick the brand theme → **Share → PDF / Present
  link**. Saves once; it's now a deck in her Library.
- **Lives in:** Compose + Share. Touches the Inspector once. Never opens Fabricate.

### P2 — Devin, the analyst (strategy / finance IC)
- **Goal:** a dense, accurate deck — charts, tables, real numbers — authored in
  Markdown, versioned, portable.
- **Frustrates today:** export mixes source and artifact; no clean "give me the
  Markdown / a portable bundle"; wants to mark up a printout.
- **Journey:** **Compose** with the editor primary, ⌘K to insert components,
  **Inspector** for size/pagination/header-footer → **Share → Markdown / Marp
  bundle** (the developer group) and **Print source** to red-pen a draft →
  checkpoints in the Inspector history.
- **Lives in:** Compose (editor-weighted) + the Share *source* group + ⌘K.

### P3 — Priya, the brand steward (design-system owner)
- **Goal:** every deck in the org looks like one team; she owns the palettes and
  the layout vocabulary, and she enforces WCAG.
- **Frustrates today:** the Workbench is a separate destination disconnected from
  where decks are actually made; no shared chrome.
- **Journey:** **Fabricate** → Theme Studio crafts a palette (live WCAG audit) and
  Layout Studio authors a CSS-only component → it flows straight into every
  author's **Inspector** theme list. Rarely authors a full deck; governs the look.
- **Lives in:** Fabricate + Workspace Settings (storage/governance).

### P4 — Marcus, the consultant (client-facing storyteller)
- **Goal:** one engagement deck, reshaped for many audiences — the exec readout,
  the technical annex, the leave-behind one-pager — presented live and remotely.
- **Frustrates today:** maintains three divergent copies by hand; presenting and
  rehearsing are buried takeovers.
- **Journey:** **Compose** the canonical deck → **Reshape** into *lenses* (exec /
  technical / one-pager) without forking the source → **Present** live (dual-screen
  presenter) and send a **Present link**; switches lens per audience on the fly.
- **Lives in:** Compose + Reshape/lenses + Present. The heaviest lens user.

### P5 — Lena, the recipient (board member / stakeholder) — *the new first-class user*
- **Goal:** consume a deck the way *she* wants — skim the one-pager, or have it
  read aloud while the spoken text highlights, on her phone, between meetings.
- **Frustrates today:** she is not a user of the app at all — she gets a static
  PDF and that's it. The deck cannot meet her where she is.
- **Journey:** opens a **Present link** → picks a **lens** (exec summary) from the
  reader-facing switch → taps **read-aloud**; the spoken sentence highlights as it
  plays; reads on mobile. No account, no authoring.
- **Lives in:** Present (read + lens switch), often on mobile. **This persona is
  why Present is a first-class intent and why lenses + read-aloud-with-highlight
  are designed-for now** (§6) — the recipient, not just the author, is someone the
  Studio serves.

**What the personas prove about the model:** P1/P2 justify *Compose as one merged
surface with an entry state* (not Playground-vs-Drawing-Board); P2 justifies the
*Share source/artifact split + both print targets*; P3 justifies *Fabricate as an
intent wired into the same chrome*, not an island; P4 justifies *Reshape/lenses
+ a real Present*; P5 justifies *the reader as a first-class user* with their own
controls. No persona benefits from the status-quo three-tools fork — which is the
case for the redesign in one line.

## 2. The model — one Studio, three intents

A deck has a lifecycle. You **Compose** it, you **Present/Read** it, and sometimes
you **Fabricate** the parts it is built from (themes, layouts). Today those are
three routes; the redesign makes them three *intents* of one workspace, sharing
identity, chrome, and the deck under the cursor.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ L Lattice ▾   Deck ▾   …   ⌘K · 🎨 · ▶Present · Share · ▤ ▥ · ⚙ · acct │  ← ONE ~54px bar (v3, §17)
├──────────────────────────────────────────────────────────────────┬─────┤
│  Architect │  Edit (+Insert ✶Reshape)  │   Preview (16:9, big)    │ Deck│
│  (toggle)  │                           │                          │ ▕rail│  ← Inspector collapsed (PM-4/VR-4)
└────────────┴───────────────────────────┴──────────────────────────┴─────┘
   ↑ brand = launcher (Decks · Fabricate · New)     ▶ Present = a verb, not a tab (§17 W-4)
```

### 2.1 The four shell elements

- **One lean top bar (PM-5 → v3 / §16, refined by the §17 red-team).** **Compose
  is home; `▶ Present` is a verb** — a button that enters the full-screen
  reader/presentation and exits (not a persistent toggle, §17 W-4). The **brand is
  a launcher** opening Decks · **Fabricate (Theme & Layout Studio)** · New — so
  Fabricate stays discoverable without being a false deck-mode peer (§17 W-2). One
  ~54px bar, same on desktop/tablet/mobile (no top↔bottom relocation). This
  *replaces* the nav "Tools" disclosure and every per-app navigation idiom.
  (History: v2 = two-row tab header → §16 red-team → v3 lean bar → §17 red-team →
  Present-as-Play + launcher. Superseded mockups: `v2-tabs/`, `v1-rail/`; the
  canonical shell is `v3/`.)
- **AppBar (top, slotted, context-sensitive).** *One* bar, three slots:
  - **Left = deck identity + switcher.** The current deck's title; click to
    switch / new / rename (replaces the Drawing Board's Decks-drawer gateway).
  - **Center = the active intent's primary actions** — this is the
    "context-sensitive menu bar." It re-fills by intent: Compose → Architect
    toggle · insert component · preview toggle; Present → play · rehearse · voice;
    Fabricate → Theme ⇄ Layout faculty switch · validate. One bar, content
    swapped — not N bespoke bars.
  - **Right = always-present shared chrome** — palette/theme · **Share** ·
    Workspace Settings · account. Constant across every intent, so the
    deck-level verbs never move.
- **Deck Inspector (right, persistent, collapsible).** Scoped to *this deck*:
  theme/palette, size/orientation, pagination, header/footer, reader/voice
  defaults, and (future) lenses. **A non-modal inspector, not a modal drawer** —
  the master-UX move for frequently-touched, object-scoped settings: you change a
  knob and *see the deck react* without losing your place. This is today's
  "settings drawer for configuring decks," reborn as an inspector.
- **Work surface (center).** Compose = editor + live preview (Drawing Board's
  three-pane, with the Architect demoted to a left *aside within Compose* rather
  than a third competing top-level panel); Present = the reader experience;
  Fabricate = the theme/layout studio.

### 2.2 The ⌘K command palette as the keyboard-first spine

The universal command palette already exists (`CommandMenu.tsx`). Elevate it from
"navigate + search docs" to the **"type what you want"** spine: insert a
component, change theme, run an export, jump to a deck, switch intent, start
read-aloud. Every AppBar action is *also* a palette command. This is the deepest
click-minimizer: power users never touch a toolbar.

### 2.3 What each of today's surfaces becomes

| Today | Becomes | Notes |
|---|---|---|
| Playground | **Compose, zero-setup entry state** | No deck saved yet; fast, no commitment. Save/name → it joins your Library and is just "a deck in Compose." Kills the Playground-vs-Drawing-Board fork. |
| Drawing Board | **Compose, full state** (+ feeds Present) | Its 3-pane editor/preview is the Compose work surface; Architect → left aside; Present/Practice → the Present intent. |
| Workbench | **Fabricate** intent | Theme Studio + Layout Studio become the Fabricate work surface, faculty switch in the AppBar center. |
| Decks drawer | **Library** (a future 4th tab + AppBar deck switcher) | Space axis (switch/new) in the switcher; time axis (checkpoints) in the Inspector's history. |
| Deck-Setup drawer | **Deck Inspector** | Non-modal, persistent. |
| Settings drawer (AI/cloud/spend) | **Workspace Settings** | One global surface (§4). |
| Export dropdown | **Share** surface (§5) | Two intents, both print targets. |
| Components reference, Landing, Docs | **unchanged** | Landing's visual language is the *source* the Studio extends (§8); the reference and Starlight docs stay as they are. |

## 2.4 Mockups (high-fidelity — real tokens, real type)

High-fidelity mockups render the model with the **actual** indaco palette tokens
(from `lattice-tokens.generated.css`) and the real type stack (Outfit · Playfair
Display wordmark · JetBrains Mono) + lucide-style icons — faithful, not
approximated. They come in **two shell options** for the intent switch (fork
PM-5): **v1 — activity rail** ([`mockups/v1-rail/`](./2026-06-21-app-redesign/mockups/v1-rail/))
and **v2 — top tabs** ([`mockups/v2-tabs/`](./2026-06-21-app-redesign/mockups/v2-tabs/),
**chosen — PM-5 / §15**). Only the intent-switch/brand chrome differs; every work surface
is identical. The annotated diff:
[`compare/compare-compose.png`](./2026-06-21-app-redesign/mockups/compare/compare-compose.png).
Full index + rebuild steps: [`mockups/README.md`](./2026-06-21-app-redesign/mockups/README.md).

| Mockup (v2-tabs) | Shows | Width / mode |
|---|---|---|
| [`compose.png`](./2026-06-21-app-redesign/mockups/v2-tabs/compose.png) | Compose: top-tab intents · context bar · Architect aside · editor + preview · Deck Inspector (Look / Read / **Lenses**) | 1440 · light |
| [`fabricate.png`](./2026-06-21-app-redesign/mockups/v2-tabs/fabricate.png) | Fabricate (Workbench): Theme Studio — 4 core colours → 18-token derived contract → live WCAG audit → live specimen + auto dark | 1440 · light |
| [`present.png`](./2026-06-21-app-redesign/mockups/v2-tabs/present.png) | Present: the reader — **read-aloud with synchronized highlight**, reader-facing **lens switch**, the play/scrub dock | 1440 · dark |
| [`share.png`](./2026-06-21-app-redesign/mockups/v2-tabs/share.png) | The Share sheet: **hand off the deck** (Present link · PDF · PPTX · Print deck) vs **hand off the source** (Markdown · Marp bundle · **Print source**) | 1440 · light |
| [`settings.png`](./2026-06-21-app-redesign/mockups/v2-tabs/settings.png) | Workspace Settings ("your setup"): generation tier · OpenRouter connect · spend + budget — distinct from the deck Inspector ("this deck") | 1440 · light |
| [`mobile-compose.png`](./2026-06-21-app-redesign/mockups/v2-tabs/mobile-compose.png) | Full mobile Compose (Preview + Edit + Present in `mobile-*`): bottom intent bar · pane tabs · read-aloud dock. v1's mobile uses a hamburger→drawer instead — see `v1-rail/mobile-*.png` | 390 · light/dark |

These are *visual specs* (zero behavior, PM-12), not shipped code — but they are
built from the real token bridge, so Win 1 inherits the exact palette + type they
show.

## 3. The chrome contract — the `StudioShell`

One component, `StudioShell`, owns the top-tab intent bar + slotted AppBar +
collapsible Inspector and renders `{children}` as the work surface. Every intent
mounts inside it; the irreducible engine pieces are *wrapped*, slotted into the
surface, never reimplemented (carry-over rule).

```
StudioShell
  ├─ <IntentTabs intent= onIntent= />            // Compose · Present · Fabricate (+ Library?) — top bar; bottom bar on mobile
  ├─ <AppBar>
  │     left:   <DeckSwitcher deck= />            // title ▾ → switch/new/rename
  │     center: {intentActions}                   // the context-sensitive slot
  │     right:  <PaletteControls/> <Share/> <SettingsButton/> <Account/>
  ├─ <main>{children}</main>                      // the work surface
  └─ <DeckInspector open= deck= />                // this-deck settings (§4)
```

Contract rules:

- **The center slot is the only context-variable region.** Rail, deck switcher,
  and right chrome are constant across intents → the deck-level verbs and the
  "where am I" anchor never move. Only the *intent's own* actions change. This is
  what makes "context-sensitive" feel calm instead of shifty.
- **One overlay vocabulary.** Drawers/sheets/dialogs/popovers come from the
  existing `ui/` primitives (HARD RULE 15). The Inspector is a non-modal panel
  (collapses inline at width); the Library/switcher is a `Popover`/`Command`; the
  Share surface and Workspace Settings are `Sheet`s; transient confirmations are
  `Dialog`s. No bespoke overlay is introduced.
- **Keyboard-first parity.** Every AppBar action registers a ⌘K command (§2.2)
  and a documented shortcut; the intent tabs get `g c` / `g p` / `g f`
  (go-Compose/Present/Fabricate) style chords later.
- **Couplings the shell must preserve (not fight).** The Drawing Board page
  hard-codes bespoke pieces beyond the editor/preview: two **panel resizers**
  (`db-resizer`), the **mobile pane switcher** (`db-mobile-tabs`), the slide-in
  **Decks/Versions drawers**, and a **Present mode that opens a separate browser
  window** (`window.open` + `postMessage` dual-screen presenter). The shell keeps
  the resizers/pane-switch *inside* the Compose surface (they are that surface's
  internal layout, not shell chrome) and treats the dual-screen presenter as a
  Present-intent capability it launches, not something it absorbs. Win 1's
  per-surface adapter (RD1) is where these are reconciled.

## 4. Settings — Deck Inspector vs Workspace Settings

The scope spine, stated as one line the UI must make obvious:
**the Inspector is about *this deck*; Workspace Settings is about *your setup*.**

### 4.1 Deck Inspector (right, non-modal, collapsed-by-default — PM-4)

Owns everything that lives in the deck's front matter or per-deck prefs. Reuses
the **pure parse/serialize core** of the existing `deck-config.js` (it already
reads/writes the managed front-matter block — theme/finish/split/size/paginate/
header/footer/class/islands/math/lang — and that core is unit-tested). The
**control surface is rebuilt** as a React non-modal inspector against the `ui/`
primitives (today's `createConfigPanel()` is vanilla `createElement` DOM, so the
view does not port as-is — see the §0 "reuse the logic, rebuild the view" rule).

- **Look:** theme/palette, size/orientation, pagination, header/footer.
- **Read:** reader/voice defaults (TTS voice, pace), and the **Lenses** section
  (§6) — the reader-shaped variants of this deck.
- **History:** checkpoints (the time axis from today's Decks/Versions drawer).

The palette control inside the Inspector keeps the Drawing Board's
deck-theme-writing semantics (a pick writes the deck's `theme:` line via the
existing `window.__dbChrome` bus) — distinct from the *site* palette control in
the right chrome, which restyles the app. Both can coexist: app chrome vs deck
theme are genuinely different objects. (We make the distinction legible rather
than hiding it: the right-chrome palette restyles the Studio; the Inspector's
theme field restyles the *deck*.)

### 4.2 Workspace Settings (one global surface)

Consolidates today's AI/cloud Settings drawer into a single `Sheet` opened from
the top-bar Settings (and ⌘K). Sections:

- **AI model** — on/off (force deterministic Floor for privacy/offline), tier
  (Floor · Transformers.js · WebLLM · OpenRouter), on-device weight management.
- **Cloud** — OpenRouter OAuth (PKCE), prompt-caching toggle.
- **Spend** — all-time + session cost, per-model breakdown, budget cap + warning
  level, floor-balance warning.
- **Instructions** — standing instructions appended to every generative turn.
- **Storage** — local decks management, checkpoint retention, export of the
  whole workspace.

All localStorage/IndexedDB-backed exactly as today — this is a *re-housing*, not
a behavior change. "Cloud settings that configure the workspace and cloud
features" is precisely this surface.

## 5. Share / Export / Print

One **Share** action in the right chrome, present in Compose *and* Present (it
belongs to the deck). It opens a `Sheet` with two clearly separated groups:

- **Hand off the deck (audience artifact)** — Present link · PDF · PPTX ·
  **Print deck** (rendered, vector — the default print).
- **Hand off the source (developer / portability)** — Markdown · Marp bundle ·
  **Print source** (the Markdown, monospace, for review/markup).

Decisions made legible:

- **"Does export belong in edit or preview?"** → *Neither exclusively.* It
  belongs to the **deck**, so it lives in the always-present right chrome and is
  reachable from every intent. The question dissolves once Share is deck-scoped.
- **"Are we printing the Markdown or the rendered deck?"** → **Both, as an
  explicit choice** (ratified fork 3). *Print deck* = the rendered, paginated
  vector output (today's behavior). *Print source* = the Markdown for editing/
  markup/review. The two targets are labeled, never guessed.
- **Bytes unchanged.** Share re-houses the existing `drawing-board-export.js`
  entry points; it does not alter export *output*. The "Print source" path is the
  only genuinely new output and prints the editor's own text (no engine render),
  so it is not an export-pipeline byte change. If any increment is found to touch
  artifact bytes, it STOPS for sign-off.

## 6. The reader-shaped deck (designed-for; built in later wins)

This is the part the author most wants room for, so the architecture names the
contracts now even though the build lands in §12 Wins 6–7. A deck is not a fixed
artifact; it has a **canonical source** plus **lenses** and **voice**.

### 6.1 Read-aloud with synchronized highlight

Present/Rehearse plays the deck and **highlights the spoken text as it is read**.
The TTS already exists (Kokoro worker / OpenRouter in today's Practice mode); the
redesign gives it a first-class home (the Present intent) and adds the
*synchronization*. **This is mostly net-new** — the checker confirmed there are
no word-boundary/timing marks today (Practice "timing" is presenter pacing math),
and today's read-aloud narrates the slide's **speaker note** (the talk track), not
the on-slide body — so a spoken-token→on-slide-node map does not yet exist. The
contract:

- The TTS path emits **timing marks** (token/sentence boundaries → timestamps) —
  net-new for both the Kokoro and OpenRouter paths.
- The preview host highlights the active token/sentence from those marks. **Note:
  the engine-side focus machinery (`2026-06-16-focus-highlighting.md`) is *not* a
  drop-in reuse** — it is `status: proposed` and lives in `lib/` (off-limits per
  §0). The reader-highlight is a **preview-host overlay** that borrows the *idea*
  (a "look here" emphasis) but is implemented in the host, not the engine.
- Decide the highlight target: narrate-and-highlight the **speaker note** (matches
  today's TTS source, lowest-friction) vs narrate the **on-slide body** (needs the
  new text→node map). Plan defaults to speaker-note first, body as a follow-on.
- Reader-facing controls (play/pause, pace, voice) live in the Present AppBar
  center; defaults live in the Inspector's Read section.
- **No engine/export touch** — highlight is a preview-host overlay, not a render
  change.

### 6.2 Reshape to the reader's chosen form (AI lenses)

"Meet the reader where they want to go… reorient and even rewrite the deck so it
takes the shape the reader chooses." Modeled as **lenses over a canonical
source**, never destructive edits:

```
deck.source            // the canonical Markdown — the single source of truth
deck.lenses: [         // derived, regenerable, switchable — never overwrite source
  { id, label: "Exec summary",  shape: <descriptor>, generatedFrom: <sourceHash> },
  { id, label: "Technical deep-dive", … },
  { id, label: "One-pager", … },
]
```

- A **Reshape** action (Compose AppBar + ⌘K) asks the AI to reorient/rewrite the
  source into a chosen shape, producing a *lens* — the canonical source is
  untouched, so reshaping is non-destructive and reversible.
- The Inspector's **Lenses** section manages them (create, regenerate when the
  source drifts past `generatedFrom`, delete, set default).
- Present mode offers a **reader-facing lens switch** — so the *reader* (not just
  the author) can pick the form, and ask for it read aloud. This is the literal
  "meeting the reader where they want to go."
- Built on the existing Architect/Converse generative path (`architect-*.js`) and
  Workspace Settings' model ladder — no new model infrastructure.

These two are *designed-for* now (contracts named, reuse identified) and *built*
in Wins 6–7. Naming them now is what keeps the shell from having to be re-cut
later — "redesign without compromise" means the architecture has room for them
from the first win.

## 7. Information architecture & routing

The site is an Astro MPA (separate routes, fresh load per nav). The unified
Studio does **not** require an SPA rewrite, and forcing one would violate
"cheapest path that meets the bar." The route strategy is incremental:

1. **First, unify the chrome under the existing routes.** `/playground/`,
   `/drawing-board/`, `/workbench/` each render the *same* `StudioShell` with
   their existing work surface as `{children}`. Chrome unifies (Win 1) before any
   route moves — the biggest cognitive-load win at the lowest risk.
2. **Then collapse the routes** into `/studio/` with the intent as state (and
   optionally `/studio/[intent]` for deep links), retiring the three separate
   routes and the nav "Tools" disclosure (Win 8). Cross-intent state lives in
   the existing localStorage/IndexedDB layer (MPA-safe, as the shadcn doc
   established).
3. **Nav change:** the "Tools" disclosure (Playground/Drawing Board/Workbench)
   collapses to a single **"Open Studio"** primary entry in `nav.mjs`. Docs,
   Components, Features, Comparison are unchanged.
4. **Landing is untouched** in structure — it is the funnel and the visual
   source-of-truth (§8). Its CTAs simply point at the Studio.

## 8. Visual language — extend the landing, don't invent

The landing page is the ratified visual source. The Studio *extends* it; it does
not introduce a second language (HARD RULES 3, 11, 15).

- **Type:** `--font-sans: Outfit`, `--font-mono: JetBrains Mono` (unchanged).
- **Color:** the palette token bridge only (`var(--token)`), all 14 palettes ×
  light/dark; zero hex in chrome CSS.
- **Primitives & icons:** the 16 shadcn `ui/` components + lucide only. No new
  widget, no new icon set.
- **Density:** marketing uses generous `clamp()` spacing; apps need a tighter
  tier. Introduce **app-density spacing tokens** (`--app-gap-*`) as the compact
  cousins of the landing scale — *added*, not forked, so both languages share one
  ramp. (This is the one net-new token family; it is palette-blind structural,
  same discipline as `--radius`.)
- **Motion:** restrained and purposeful only — Inspector collapse, intent
  crossfade, sheet slide. No decorative animation. Respect
  `prefers-reduced-motion`.
- **Accessibility — colour is never the only channel (PM-13).** Status, severity,
  and intent use the shape-coded **intent-tag** system: a corner tag carrying a
  silhouette-distinct icon + text label (circle-✓ `READY` · triangle-! `REVIEW` ·
  octagon-× `FIX` · circle-i `INFO`). The engine already ships CVD palettes
  (deuteranopia, protanopia, tritanopia, achromatopsia); the chrome holds the same
  bar — every status cue is verified to read in greyscale (WCAG 1.4.1), and the
  coloured text itself stays ≥ AA. See the mockups' `intent-proof.png`.

## 9. Responsive contract (all three first-class)

Every Studio win ships verified at **390 / 820 / 1440** (CLAUDE.md: no website
change is done without `tools/screenshot.js` evidence at all three widths).

- **Desktop (~1440):** intent switch · AppBar · work surface · Inspector all
  visible; up to three panes (Architect · Editor · Preview).
- **Tablet (~768–1180): a hybrid, not a third design — it *leans by orientation*.**
  It takes its **chrome from desktop** (the top-tab header stays — *never*
  the mobile bottom bar) and its **density + side-panel behaviour from mobile**
  (touch targets, icon-only secondary controls; Architect and the Inspector are
  **summoned slide-overs, never resident** — protects the preview, PM-4). Panes are
  orientation-gated: **landscape (~1180) ≈ desktop** (two panes, Editor + Preview);
  **portrait (~820) ≈ a roomy mobile** (one primary pane + an Edit/Preview
  segmented toggle). *Tablet is also a quiet argument for v2/tabs (PM-5): a 66px
  rail costs proportionally more at ~800px, while tabs degrade to icon-only
  cleanly.*
- **Mobile (~390):** the intent switch becomes a **bottom intent bar** (v2) or a
  **hamburger → drawer** (v1); Inspector + Architect + Share → `Sheet`s; work
  surface = single pane with the Edit/Preview `Tabs`. Icon-only throughout; no
  horizontal overflow (the `check:overflow` gate covers this).

## 10. Reuse map (HARD RULE 15 — don't reinvent)

| Redesign piece | Built from (reuse) | Net-new |
|---|---|---|
| StudioShell | layout CSS + `.lx-ui` scope | the shell component (slots) |
| Intent tabs (top; bottom bar on mobile) | `Tabs`/`Button` + lucide | the tab strip + mobile bottom bar |
| AppBar (slotted) | `Button`/`DropdownMenu`/`Tabs` | the 3-slot contract |
| Deck switcher | `Popover` + `Command` | — |
| Deck Inspector | `deck-config.js` logic, `Collapsible`, `Select`, `Input` | non-modal host |
| Workspace Settings | `drawing-board-settings.js` logic, `Sheet`, `Tabs`, `Select` | one consolidated host |
| Share surface | `drawing-board-export.js` entry points, `Sheet`, `DropdownMenu` | two-group layout + Print-source |
| ⌘K commands | `CommandMenu.tsx` | new command registrations |
| Read-aloud highlight | TTS worker (Kokoro/OpenRouter) | timing-mark emission + host-side highlight overlay (engine focus path is `lib/`, off-limits) |
| Reshape / lenses | `architect-edits.js` generative edit-block + diff/Apply, model ladder | the lens data model |
| App-density tokens | the landing spacing ramp | `--app-gap-*` (palette-blind) |

Nothing here forks an existing widget; every piece either re-houses proven logic
or composes existing primitives.

## 11. Risks

| # | Risk | Mitigation |
|---|---|---|
| RD1 | **The three surfaces have three *different* orchestration buses — the shell must bridge all three, not one.** Drawing Board → `window.__db*` (`__dbChrome`/`__dbExport`/`__dbEditor`/`__dbStore`/`__dbConfig`/`__dbModel`/`__dbSetPane`/… ~12 globals, over an `is:inline` controller on the 1251-line page + 15 `drawing-board-*.js` modules); Playground → `window.LatticePlayground` + `window.LatticeDeckPreview` (a *different* convention); Workbench → no page-level global of this family (the React `WorkbenchApp` boots the vanilla studios directly). | Win 1 *slots each existing surface into the shell as `{children}`* and the shell's AppBar + tabs drive each surface through a thin **per-surface adapter** that maps shell intents → that surface's native bus. The buses, controllers, and modules are untouched; only the chrome around them changes. This is the real cost of Win 1 — it is **not** "chrome-only," it is "one shell + three adapters." Strangler-fig, never a rewrite. |
| RD2 | **Inspector palette vs right-chrome palette confusion** (one writes deck `theme:`, one restyles the app). | Make the two objects legible by label + placement (§4.1); keep the existing dual-bus behavior; never silently merge them. |
| RD3 | **Route collapse leaves stale *internal* references** (not public bookmarks — pre-GA, nothing has shipped) — `nav.mjs`, the landing CTAs, docs, tests, tours still point at `/playground/` etc. | Win 8 updates **every internal reference in the same PR** (a `grep` gate proves none remain); old paths get a dev-time redirect only as a convenience, not a forever-contract (PM-9). |
| RD9 | **Route collapse silently breaks the OpenRouter OAuth callback.** Auth is PKCE: `beginOpenRouterAuth` uses `location.origin + location.pathname` as the callback, and the `?code=` return is handled on load by the Drawing Board page. A redirect that drops the query or moves auth off a stable path breaks cloud-connect (OpenRouter also validates the registered callback). | Win 3 (Workspace Settings) **pins the OAuth callback to one stable Studio path** and the Win 8 redirects **preserve `?code=`** (and any PKCE state) end-to-end; an integration check completes a real connect after the route change. The PKCE primitives live in `architect-model.js`; the UI wiring moves with Settings. |
| RD4 | **Reshape/lenses tempt a destructive rewrite of `source`.** | The data model forbids it — lenses are *derived* with a `generatedFrom` source hash; source is append-only from the user's edits. |
| RD5 | **Read-aloud highlight drifts into the engine/export path.** | Highlight is a preview-host overlay reading TTS timing marks; it never changes render or export bytes. Export-byte STOP gate stands. |
| RD6 | **Scope creep / a "big bang" PR.** | §12 is a stack of independently-shippable wins; HARD RULE 17 (one branch/PR, builds on `main` alone). Wins 1–3 are the cheap base; the meaty wins (4–7) each stand alone. |
| RD7 | **Unlayered legacy CSS silently beats new shell utilities** (the shadcn-migration P3 trap). | Delete each migrated surface's bespoke chrome CSS in the *same* PR; per-win integration check that the shell's styles win. |
| RD8 | **No screenshot evidence → unverified "10/10" claim.** | Every win ships `tools/screenshot.js` at 390/820/1440 × ≥3 palettes × light/dark; `check:overflow` green; for large sweeps, fan out reviewer agents (`visual-review.md`). |

## 11.5 Pre-mortem & kill-criteria (red-team via inversion)

Munger's inversion applied to this plan: instead of "how do we make the Studio
succeed," assume **it is 12 months on and the redesign was a clear mistake** —
then enumerate how we got there and convert each death into a precondition. The
checker pass (§14) verified the plan's *facts*; this pass attacks its *judgment*.
**Several kill-criteria below override defaults stated earlier — where they
conflict, the earlier text yields to PM-#** (including the §0 forks: §0 records
what the author chose, PM-# records what the red-team proved we must constrain).

**How it becomes a mistake**

- **PM-A — We unified navigation while the real pain was elsewhere.** The premise
  (Playground-vs-Drawing-Board is the load) rests on N=1. If the true churn driver
  was deck *quality*, AI *cost*, or a *broken export*, we rearranged toolbars while
  the value-loser went untouched. "Minimize cognitive load" is *unfalsifiable as
  written* — it can retroactively justify any change.
- **PM-B — We optimized for the first-timer and nerfed the pro.** Dense pro tools
  (Figma, VS Code, Bloomberg) are high-load *by design*. "Minimize clicks" is right
  for the recipient (Lena) and possibly *wrong* for the daily author (Devin/Marcus);
  applied uniformly it makes the power user slower inside a calmer shell — an
  invisible regression.
- **PM-C — The app became permanently under construction.** shadcn *just* landed on
  these surfaces; Win 4 strangler-figs the 1251-line Drawing Board *again*. Two
  back-to-back rewrites of the same code is a treadmill that erodes trust.
- **PM-D — Win 1 was a tar pit that held everything hostage.** "One shell + three
  buses" (RD1) is canonical integration glue that looks small and becomes a
  multi-week swamp of subtle state bugs — and *every* win stacks on it.
- **PM-E — The always-on Inspector ate the preview.** On a 13″ screen,
  rail+editor+preview+inspector shrinks the rendered deck below a judgeable size.
  The product's entire value *is* seeing the deck at boardroom scale.
- **PM-F — Lenses silently diverged from the source in a boardroom.** Edit source →
  the exec lens is stale. Auto-regenerate = silent content change before a board
  meeting (and cost); don't = outdated numbers shown. Either is credibility-fatal.
- **PM-G — Read-aloud over-promised.** No timing marks exist today; TTS speaks
  *speaker notes* not slide text; the models may not emit word boundaries at all.
  "Word-level sync highlight" can burn weeks and ship a drifting, broken-looking
  demo that taints trust in everything else.
- **PM-H — The rail was cargo-culted from VS Code.** A left activity rail earns its
  66px tax and indirection at 6+ activities; for *three* intents a top segmented
  control does the same job with less chrome and no left-edge cost.
- **PM-I — A rename left the codebase internally inconsistent.** *(Pre-GA, so the
  external half of this risk — public bookmarks, SEO, third-party links — does not
  apply: nothing has shipped, and the author is comfortable renaming carefully.)*
  What remains is real: a half-applied rename leaves stale references in docs,
  tests, `nav.mjs`, examples, tours, and the decision docs — and silently discards
  the *reasoning a name encoded* (e.g. "Drawing Board" vs "Playground" marked a
  deliberate try-it/author split). The OAuth callback path (RD9/PM-8) is the one
  coupling that is immovable regardless of GA — it is a correctness bug, not SEO.
- **PM-J — One app, one blast radius.** Behind one shell, a single bad deploy blanks
  all three tools at once (today a Drawing Board bug leaves the other two standing).
- **PM-K — Thin ratification + confident mockups.** Four forks approved in one
  question round became an 8-PR mandate; zero-behavior mockups manufactured an
  "almost done" feeling none of the 30 real modules justify.

**Therefore — kill-criteria & invariants** (binding; later defaults yield to these)

| # | Invariant the plan must hold | Changes the plan? |
|---|---|---|
| PM-1 | **Symptom-first or cut it.** Every win names a measurable symptom + target (clicks-to-first-render, time-to-export, preview legible-size). No symptom → decoration → drop. | adds a gate to every win |
| PM-2 | **Plan-approval authorizes only a de-risking *spike*, not Wins 1–8.** Prove the three-bus adapter on the *simplest* surface (Playground) against a written kill-criterion before committing the program. | **new Win 0; re-scopes §0-4** |
| PM-3 | **Wins 1–3 stand alone; pause & *measure* before 4–8.** Stop after 3 = strictly ahead, never mid-rewrite. | sequencing gate |
| PM-4 | **The preview is sacred — Inspector collapsed-by-default**, summoned not resident; gate that the preview never drops below a legible threshold. | **flips §0-2 / §4.1 default** |
| PM-5 | **Intent switch = top-tabs, not a rail (ratified v2); then hardened to the v3 lean shell** — one ~54px bar, a compact Compose⇄Present toggle, Fabricate re-housed (§16). Tabs beat the rail on every §15 lens; the v2 red-team then beat v2's *two-row* form on vertical budget. | **resolved → §15 + §16** |
| PM-6 | **Lenses never silently mutate or silently stale** — explicit regenerate, loud staleness badge, never auto-regenerate before Present. | strengthens RD4 / §6.2 |
| PM-7 | **Read-aloud is feasibility-spiked before roadmapped** — no word-level promise until timing-mark emission is proven; else sentence-level via duration estimate, or cut. | gates Win 6 / §6.1 |
| PM-8 | **Auth path is immovable infra** — pinned + a real-connect integration test before any route work. | strengthens RD9 |
| PM-9 | **Renaming is allowed (pre-GA — no public URLs/SEO at stake), but disciplined.** Every reference moves in the *same* PR (docs, tests, `nav.mjs`, examples, tours, decision docs); the rename honors the *reasoning a name encoded*. The OAuth callback path is the one immovable internal coupling (PM-8). | reframed by author (pre-GA); folds into Win 8 |
| PM-10 | **Per-surface graceful degradation** — a shell/Workbench fault can't blank Compose; surfaces stay independently loadable. | adds a Win-1 requirement |
| PM-11 | **Optimize per-persona, not uniformly** — density for the author, low-load for the recipient; "minimize clicks" is a *reader* goal, not universal. | scopes the headline goal |
| PM-12 | **Mockups are zero-behavior specs** — they never set the schedule; each is paired with its integration cost. | framing |
| PM-13 | **Never signal status / severity / intent by colour alone (WCAG 1.4.1).** Pair every such cue with a **shape-distinct icon + text** corner tag — circle-✓ `READY` · triangle-! `REVIEW` · octagon-× `FIX` · circle-i `INFO` — verified to read in greyscale and across the CVD palettes. Colour reinforces; it never carries the meaning. | author-raised; new convention |
| PM-14 | **Stop refining mockups — the next dollar buys evidence, not v4.** The v1→v2→v3 inversion loop hit negative returns once critiques became "needs a user to know" (§17 W-8). Freeze v3 as the *starting hypothesis*; carry the unresolved v3 critiques (W-1/3/5/6/7) as **Win-0 acceptance checks**, not redesigns. The next artifact is running code. | author-requested red-team; stop rule |

**Net:** inversion does not kill the plan; it demotes "merge → start Win 1" to
"merge as *direction* → buy evidence first" (PM-2). The load-bearing risk
(RD1/PM-D) and the highest-regret items (PM-E/F/G/H) are exactly what a Win 0
spike plus the default-flips (PM-4/5) retire cheaply, before the program is
committed.

## 12. The stack of wins (build order)

Each win is **one branch → one PR**, builds/tests on `main` alone (HARD RULE 17),
ships responsive screenshot evidence (§9), and is independently revertible. Order
= cheapest-high-leverage first; the reader vision (6–7) after the shell carries
it; cleanup last. **Per PM-1, every win names a measurable symptom + target before
it starts; per PM-2, approving this plan authorizes only Win 0 — each subsequent
win re-gates.**

- **Win 0 — The de-risking spike (buy evidence, not a shell).** Prove the
  *hardest* assumption cheaply: wrap the **simplest** surface (Playground, the
  `LatticePlayground` bus) in a throwaway `StudioShell` + adapter, behind a
  **written kill-criterion** (e.g. "the adapter drives render + theme + export
  without forking the bus, in < N days; preview stays legible at 1280px"). Also
  spike PM-7 (can Kokoro/OpenRouter emit timing marks?) on paper. **Exit:** either
  a green light to start Win 1 with the adapter pattern proven, or a documented
  "stop — the three-bus glue is a tar pit" that saved the program. No user-facing
  change ships from Win 0.
- **Win 1 — `StudioShell` chrome + three surface adapters (the foundation).** One
  shared shell (top-tab intent switch [PM-5] + slotted AppBar + **collapsed-by-
  default** Inspector skeleton [PM-4]) rendered by the three existing routes,
  replacing the per-surface toolbars with the slotted command bar. **Not
  chrome-only:** the AppBar drives each surface through a thin per-surface adapter
  mapping shell intents → that surface's native bus (`__db*` / `LatticePlayground`
  / the Workbench boot) — see RD1. Surfaces stay **independently loadable** so one
  fault can't blank the others (PM-10). `nav.mjs` "Tools" disclosure → single "Open
  Studio" entry; pre-GA we may **rename freely**, updating every internal reference
  in the same PR and honoring what the old names encoded (PM-9). *Maker-checker
  (high blast radius).*
- **Win 2 — Deck Inspector.** Re-house `deck-config.js` from its modal drawer
  into the persistent right Inspector. Theme/size/pagination/header/footer +
  checkpoints.
- **Win 3 — Workspace Settings.** Consolidate the AI/cloud/spend/instructions/
  storage drawer into one global `Sheet` opened from the top-bar Settings (and ⌘K). Pure re-housing.
- **Win 4 — Compose unification.** Playground becomes Compose's zero-setup entry
  state; Architect demotes to a left aside within Compose; one editor+preview
  core. Strangler-fig the Drawing Board panels into the shell. *Maker-checker.*
- **Win 5 — Share / Export / Print.** The two-group Share `Sheet` with both print
  targets; source exports demoted to the developer group. Bytes unchanged
  (STOP-gate if the pipeline is touched).
- **Win 6 — Present / Read mode.** First-class Present intent; read-aloud with
  synchronized highlight (builds on Practice TTS + focus-highlight). Reader
  controls in the Present AppBar.
- **Win 7 — Reshape / lenses.** AI reshape to reader-chosen forms; the lens data
  model + Inspector management + reader-facing lens switch in Present.
- **Win 8 — Route collapse.** `/studio/[intent]`; old routes → redirects; retire
  the Tools-disclosure remnants. Cleanup + the final IA simplification.

Wins 1–3 are the cheap base that already removes most of the diagnosed load
(§1.1–§1.3); 4–7 are the meaty wins (the merged Compose, the export split, the
reader vision); 8 is the IA cleanup. After each, we pause for the standing
merge-authorization gate (CLAUDE.md), then post the standup.

## 13. Open decisions for the author

1. **Intent switch — RESOLVED (author, 2026-06-21): v2 / top tabs.** Scored across
   all three device lenses in §15; tabs win desktop, tablet, and mobile, and the
   rail's only edge (scaling past ~5 intents) doesn't bind at three (+ a possible
   Library = a 4th tab). Implementation uses the v3 lean shell (a compact Compose⇄Present toggle in one top bar; Fabricate in the ⚙ Workspace menu) — the v2 two-row tab header was hardened by the §16 red-team.
2. **Inspector default: collapsed (recommended, per PM-4) vs resident.** The
   preview is sacred; the Inspector should summon, not sit. Confirm collapsed-by-
   default (it overrides the "persistent" wording in §0-2 / §4.1).
3. **Library as a switcher-only affordance vs also a top-level tab.** If
   redundant, keep only the AppBar deck switcher.
4. **Route collapse timing.** Plan does it *last* (Win 8) to de-risk. Pre-GA there
   is no external-URL cost, so it *could* move earlier; the only gates are
   updating internal references in-PR (PM-9) and pinning the OAuth path first
   (PM-8). Say if you'd rather pull it forward.
5. **Does the right-chrome (app) palette stay, given the Inspector owns deck
   theme?** Plan keeps both (app chrome vs deck theme are different objects); say
   if you'd rather the Studio chrome simply follow the deck theme.
6. **Scope of approval (PM-2).** Confirm that merging this plan authorizes only
   **Win 0 (the spike)**, with each later win re-gated — not the full 8-win program.

## 14. Changelog of this plan

- 2026-06-21 — Maker draft. Grounded in a two-agent recon (surface map +
  shared-UI inventory) and the landed shadcn-migration architecture. Four forks
  ratified by the author up front (§0).
- 2026-06-21 — **Adversarial checker pass + fold.** Verified every reuse claim
  against `docs/src/`. Two blockers fixed: (B1) the three surfaces use three
  *different* buses, so Win 1 is "one shell + three adapters," not chrome-only —
  RD1 + Win 1 rewritten; (B2/RD9) the OpenRouter OAuth callback is bound to
  `location.pathname`, so the route collapse must preserve `?code=` on a stable
  path — RD9 added. Systematic imprecision corrected: the deck-config/settings/
  export modules have reusable *pure cores* but vanilla-DOM *views that get
  rebuilt in React* (new §0 rule; §4.1 tightened). §6.1 corrected — read-aloud
  highlight is mostly net-new (today's TTS speaks speaker notes; the engine focus
  path is `lib/`, off-limits). §3 now names the resizers + multi-window Present as
  couplings the shell preserves.
- 2026-06-21 — Added **§1.5 personas** (P1 operator · P2 analyst · P3 brand
  steward · P4 consultant · P5 recipient) tying each intent to a real journey,
  and **§2.4 high-fidelity mockups** (Compose / Present / Share / Workspace
  Settings / mobile) built from the real token bridge — committed under
  `2026-06-21-app-redesign/mockups/`.
- 2026-06-21 — **Red-team via Munger inversion → §11.5 pre-mortem.** Twelve
  kill-criteria (PM-1…PM-12), several overriding earlier defaults: approval now
  buys only a **Win 0 de-risking spike** (PM-2; new in §12), the **intent switch
  defaults to top-tabs** not a rail (PM-5; §13-1 flipped), the **Inspector is
  collapsed-by-default** to protect the preview (PM-4; §0-2 / §4.1 reworded),
  lenses must never silently stale (PM-6), read-aloud is feasibility-spiked before
  it is promised (PM-7), and the goal is scoped per-persona, not uniform (PM-11).
  Net: "merge → start Win 1" demoted to "merge as direction → buy evidence first."
- 2026-06-21 — **Pre-GA reframe (author).** Nothing has shipped, so the *external*
  half of PM-9 / RD3 / PM-I (public URLs, SEO, bookmarks) is dropped — renaming is
  permitted, done carefully. The surviving cost is internal consistency (every
  reference moved in-PR) + honoring what past decisions/names encoded; the OAuth
  callback path (PM-8) stays immovable. §0 gains a pre-GA context note; PM-9 / RD3 /
  PM-I / Win 1 / §13-4 reworded.
- 2026-06-21 — **Mockups v2 + v1/v2 organisation (author: "I love it").** Refreshed
  the set to the recommended **top-tab** shell (Playfair wordmark + avatar; PM-5),
  added the missing **Fabricate / Theme Studio** screen, and kept the **v1 rail**
  set for the open fork. Reorganised `mockups/` into `v1-rail/`, `v2-tabs/`,
  `compare/` (annotated side-by-side), and `src/` (rebuildable); §2.4 repointed.
- 2026-06-21 — **Full mobile mockups (v1 + v2).** Added complete 390×844 mobile
  screens (Compose-Preview, Compose-Edit, Present) for both shells, making the
  mobile intent switch explicit: v2 = thumb-friendly **bottom intent bar**, v1 =
  the rail collapses into a top **hamburger → drawer**. In `v1-rail/mobile-*.png`
  and `v2-tabs/mobile-*.png`.
- 2026-06-21 — **Tablet mockups + §9 sharpened.** Added tablet Compose
  (landscape 1180 + portrait 820) and reframed §9's tablet row as an explicit
  *hybrid leaning by orientation* — desktop chrome, mobile density/overlays, panes
  orientation-gated. In `v2-tabs/tablet-compose-*.png`. Now mocked at all three
  widths (390 / 820 / 1440).
- 2026-06-21 — **Colour-independent status signalling (author-raised → PM-13).**
  Status/severity no longer relies on colour (WCAG 1.4.1): the Architect cards gain
  a shape-coded **intent tag** (circle-✓ READY · triangle-! REVIEW · octagon-× FIX
  · circle-i INFO) with a text label; titles de-coloured. Added PM-13, a §8 a11y
  rule, and `intent-proof.png` (full-colour vs greyscale). Compose v1+v2 updated.
- 2026-06-21 — **PM-5 ratified: v2 / top tabs (author).** Scored the intent-switch
  fork across the desktop/tablet/mobile lenses (new **§15** appendix); tabs win all
  three. §13-1 marked resolved, PM-5 updated, §2.1 + the shell diagram rewritten to
  the top-tab shell, the `StudioShell` contract de-railed. v2 is the implementation
  shell; v1/rail retained as the documented rejected alternative.
- 2026-06-21 — **v2 red-team → v3 lean shell (author-requested, §16).** Munger
  inversion of the *ratified v2* exposed V-1…V-9 (the two-row header spends the
  scarce vertical budget; Fabricate is a false peer tab; §15's rigor was thin).
  Amended via VR-1…VR-7: **one ~54px top bar**, a compact **Compose⇄Present**
  toggle, **Fabricate re-housed** to the ⚙ Workspace menu, Inspector **collapsed to
  a rail** (bigger preview), one metaphor across devices. v3 mocked at all three
  widths (`mockups/v3/`); §2.1 + the shell diagram + PM-5 + §13-1 repointed. v3
  supersedes v2 as the implementation shell.
- 2026-06-21 — **v3 red-team → §17 + PM-14 (stop rule).** Inverting v3 surfaced
  W-1…W-8; the meta-finding (W-8) is that the mockup-inversion loop hit negative
  returns. Resolved two model forks by judgment — **Present-as-Play** (W-4; Present
  is a verb, the `Compose|Present` toggle retired) and **Fabricate in a discoverable
  brand-launcher menu** (W-2) — reconciled the canonical `v3/v3-compose.png` once,
  and **froze the shell (PM-14): no v4**; W-1/3/5/6/7 become Win-0 acceptance
  checks. §2.1 + diagram updated.
- _pending_ — Author approval (per PM-2, of **Win 0 only**). Shell **frozen at v3**
  (Present-as-Play + launcher; §17/PM-14). Still open: Library placement,
  route-collapse timing, app-palette-vs-deck-theme — all decidable in-build.

## 15. Appendix — intent-switch decision (PM-5), scored

v1 and v2 differ **only** in the shell chrome (every work surface is identical →
delta 0, unscored). The decision reduced to six chrome choices, scored for UX fit
per device (**1 = poor · 3 = acceptable · 5 = excellent**); device columns read
**v1 / v2**.

| # | Design choice (the delta) | v1 — Activity rail | v2 — Top tabs | Desktop v1/v2 | Tablet v1/v2 | Mobile v1/v2 |
|---|---|---|---|:---:|:---:|:---:|
| 1 | Intent switch pattern | Left vertical rail (66px, icon+label) | Horizontal top tabs + underline | 4 / 5 | 3 / 5 | — / — |
| 2 | Header structure | One bar (rail + single AppBar) | Two rows (global topbar + deck-context bar) | 4 / 5 | 4 / 4 | 4 / 4 |
| 3 | Brand & account identity | Small “L” tile on rail | Playfair “Lattice” wordmark + avatar | 3 / 5 | 3 / 5 | 3 / 4 |
| 4 | Mobile intent nav | Hamburger → slide-in drawer | Thumb-reach bottom intent bar | — / — | 3 / 4 | 3 / 5 |
| 5 | Horizontal space economy | Permanent 66px rail tax | 0px — work area to the edge | 4 / 5 | 3 / 5 | — / — |
| 6 | Scalability to a 4th/5th intent | Rail holds 6+ comfortably | Tabs/bottom-bar crowd past ~5 | 5 / 3 | 4 / 3 | 5 / 3 |
| | **Average (applicable rows)** | | | **4.0 / 4.6** | **3.3 / 4.3** | **3.75 / 4.0** |

(— = not applicable on that device: the rail/tabs pattern and the 66px tax don't
exist on mobile; the mobile-nav choice doesn't exist on desktop.)

**Verdict.** v2 / top tabs wins every lens — modestly on desktop (4.6 vs 4.0),
**decisively on tablet** (4.3 vs 3.3, where the 66px rail costs ~8% of an 800px
width and an icon-only rail hides its labels), and narrowly on mobile (4.0 vs
3.75, bottom bar > hamburger on reach + discoverability). v1's *only* lead is
choice 6 (future intents); at three intents — plus a possible **Library** as a
4th tab — that edge doesn't bind. **Ratified: v2 / top tabs is the implementation
shell.** The v1-rail mockups are retained under `mockups/v1-rail/` as the rejected
alternative.

## 16. Amendment — red-team of v2 → v3 (the lean shell)

Munger inversion applied to the *just-ratified v2 shell* (author-requested). v2
won the §15 lenses, but those lenses were generic; inverting v2 specifically
("12 months on, the **top-tab** shell is what we're ripping out — why?") exposed
that **v2 is the *heavy* tabs design**. The findings and the guardrails that
amend it:

**How v2 specifically fails**

- **V-1 — Wrong axis.** v2's two-row header spends ~100px of *vertical* on a tool
  whose job is a 16:9 preview; the rail spent *horizontal* (cheap on wide screens).
  v2 has ~46px more top chrome than v1 before the slide. §15 never weighted preview
  budget — the variable that should dominate a slide tool.
- **V-2 — Prominence ≠ frequency.** Intent-switching is rare (you pick Compose and
  stay), yet tabs give it the loudest slot while the constantly-used deck actions
  drop to row two.
- **V-3 — Tabs imply peers; the intents are a pipeline.** Compose→Present→Fabricate
  is a lifecycle, not parallel sections you bounce between.
- **V-4 — Fabricate isn't a deck mode.** Compose/Present are about *a deck*;
  Fabricate is about *themes/components* (no deck). v2's deck-context row sits,
  contradictorily, under a non-deck tab.
- **V-5 — Two metaphors for one control:** top tabs on desktop, bottom bar on
  mobile — the switch relocates top↔bottom across devices.
- **V-6 — Re-created the multi-bar problem** (§1.2) we set out to kill, stacked
  vertically (row 1 + row 2 + ⌘K + pane headers).
- **V-7 — Closer scalability cliff** than admitted: 4 icon+label tabs (~440px)
  share the bar with brand + ⌘K + chrome → icon-only tabs at laptop widths.
- **V-8 — Brochure signal:** Playfair wordmark + avatar read marketing-site, not
  pro instrument; eat bar width.
- **V-9 — False rigor:** §15's uniform weights manufactured a mandate from a
  ~0.3-pt gap on invented 1–5 scores, and omitted V-1 (preview budget).

**Guardrails that amend v2 → v3** (binding):

| # | Guardrail | Fixes |
|---|---|---|
| VR-1 | **One top row in the steady state**, ~54px; deck-context actions move to the pane header / appear contextually. | V-1, V-6 |
| VR-2 | **Intent switch = a compact segmented control**, not a full-width tab strip; deck actions stay most prominent. | V-2, V-7 |
| VR-3 | **Re-house Fabricate** out of the deck-lifecycle set: the switch is **Compose ⇄ Present** (the deck's two modes); Fabricate is launched from the Workspace (⚙) menu. | V-3, V-4 |
| VR-4 | **Preview-size is a scored gate** — the 16:9 preview must hold ≥ a legible threshold at 1280×800; Inspector **collapses to a rail** by default to honour it. | V-1, V-9 |
| VR-5 | **One intent-switch metaphor across devices** — the Compose⇄Present segmented control sits in the top bar on desktop, tablet, *and* mobile (no bottom bar). | V-5 |
| VR-6 | **Density over flourish** in the bar — brand mark-only at narrow widths; avatar earns space only with accounts. | V-8 |
| VR-7 | **§15 is directional, not decisive** — the tie-breaker is VR-4 (preview budget), which the lean shell wins. | V-9 |

**v3 — the resolved shell.** A single ~54px top bar: brand mark · **`Compose |
Present`** compact toggle · deck switcher · ⌘K · palette · Share · Architect/Inspector
panel toggles · ⚙ Workspace (holds Fabricate + Settings) · avatar. Insert/Reshape
live in the editor pane header; the **Deck Inspector is collapsed to a rail** so the
preview reclaims the width. Mocked at all three widths:
[`mockups/v3/`](./2026-06-21-app-redesign/mockups/v3/) — `v3-compose.png` (1440),
`v3-tablet.png` (1180), `v3-mobile.png` (390). **v3 supersedes v2 as the
implementation shell; v2-tabs/v1-rail are retained as superseded references.**

## 17. Red-team of v3 + the stop rule (PM-14)

Munger inversion of v3 ("12 months on, the lean shell is what we regret — why?").
It found real but mostly *second-order* issues — and, more importantly, that the
inversion loop itself had become the risk.

**How v3 fails**

- **W-1 — Fixed vertical by overcrowding horizontal.** ~10 controls in one ~54px
  bar overflow at 1280px + a long deck title → forced icon-only (the V-7
  discoverability loss, self-inflicted).
- **W-2 — Burying Fabricate in a ⚙ menu** hides a flagship and demotes a ratified
  intent; the brand-steward persona never discovers it. **→ resolved (see below).**
- **W-3 — Inspector-collapsed-by-default punishes the daily author** (constant
  theme/size changes) and hides **Lenses** behind a click.
- **W-4 — v3 only half-fixed the pipeline problem:** a persistent `Compose|Present`
  toggle still implies Present is a place you *dwell*, when it's a *verb* (enter a
  takeover, exit). **→ resolved (see below).**
- **W-5 / W-6 — Density bit back:** unlabeled panel-toggle icons (guess-the-glyph);
  Insert/Reshape demoted into a low-salience pane header.
- **W-7 — Cross-device sameness (VR-5) cost mobile thumb-reach** (toggle moved to
  the hardest-to-reach top).
- **W-8 — The meta-failure (the one that matters):** v1→v2→v3, each inversion
  overturning the last, **all on static mockups with zero user contact**. The real
  unknowns (three-bus adapter, TTS timing marks, whether users feel the hypothesised
  load) don't move on paper. Inverting the *process*: we fail **by never shipping
  anything to learn from.**

**Two forks resolved now (best judgment), the rest deferred to the build:**

- **W-4 → Present-as-Play (adopted).** Compose is *home*; **Present is a verb** — a
  `▶ Present` action that enters the full-screen reader/presentation and exits.
  Removes the false-sibling toggle and a bar element. (Refines §16's
  `Compose|Present` toggle.)
- **W-2 → Fabricate gets a discoverable, labelled home in the brand *launcher*
  menu** (Decks · **Fabricate — Theme & Layout Studio** · New), *not* the settings
  gear. Discoverable for the brand steward; still not a false deck-mode peer.
- **W-1, W-3, W-5, W-6, W-7 → Win-0 / early-build validation gates, not redesigns:**
  bar must not overflow at 1280px + 40-char title (W-1); Inspector default +
  Lenses access tested per-persona and likely *remembered per user* (W-3); label
  the panel toggles (W-5); keep Insert top-level/prominent (W-6); re-test mobile
  one-handed reach on a real device (W-7). These need a prototype and a user — they
  are *unresolvable on paper.*

**PM-14 — STOP refining mockups; the next dollar buys evidence, not v4.** The
inversion's returns went negative once v3 critiques became "needs a user to know."
v3 (with the two resolutions above) is **frozen as the starting hypothesis.** The
canonical desktop mockup (`v3/v3-compose.png`) is reconciled to it once; tablet +
mobile inherit the same pattern (Present button + launcher) and are **not** re-cut.
**No v4.** The next artifact is running code — **Win 0** (the de-risking spike,
PM-2), whose acceptance checks now also carry W-1/3/5/6/7.
