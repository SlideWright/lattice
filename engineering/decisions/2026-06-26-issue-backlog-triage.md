---
status: proposed
summary: A one-pass deep triage of the 45 open issues plus a docs↔codebase honesty audit, run by four independent cluster agents against the actual code + git history (not the issue text). Verdict: recommend 6 closes (DONE/superseded — #284 @layer vetoed, #356 cell-tree shipped it, #295/#296 Layout Studio + graduation bridge shipped, #306 generated index now comprehensive, #441 self-refreshing nightly artifact), 2 dedupes (#198+#300 gallery-jargon, #466→#476 kanban), and 8 re-scopes whose premises drifted (notably #279 is backwards — README's "25" is correct). Docs are largely aligned where canonical/generated; drift is concentrated in un-flipped ADR status front-matter (#307/#308), counts hardcoded into secondary surfaces (#305/#281/#282/#309), and frozen historical log blocks. Shovel-ready high-leverage build work: #515 (Drive BYO storage), #506 (runtime auto-split), #476, #500, #519, #287. Recommendation only — no tracker changes applied.
---

# Issue backlog triage + docs↔codebase alignment (2026-06-26)

**Why:** the open-issue queue grew to **45** items and lost legibility — it was
no longer clear what is still worth doing, what has been quietly superseded by
the portrait / cell-tree / autosplit programs (#496–#535), and whether the docs
still describe what the engine ships. This is a one-pass deep assessment to
restore that grip. It is **a recommendation, not an applied change** — no issues
were closed or edited; see *Recommended actions* for the gated next step.

Method: four independent agents triaged disjoint clusters against the *actual*
codebase + git history (not the issue text), and an independent docs-honesty
audit cross-checked every counts/status claim against ground truth.

---

## Headline

- **45 open** → recommend **6 close now**, **2 dedupe**, **8 re-scope**, leaving
  **~30 genuinely-live** (mostly low-priority debt), of which **~6** are
  shovel-ready and high-leverage.
- **Docs↔codebase: largely aligned where it counts.** The *canonical* docs and
  all *generated* surfaces are accurate (52 components · 12 buckets · 14
  palettes). Drift is concentrated in three predictable places: (1) **ADR
  front-matter `status:` never flipped** after the work shipped, (2) **hardcoded
  counts duplicated into secondary surfaces** that drifted, and (3) **frozen
  historical log blocks** that read as if current. Several filed "drift" issues
  are **already self-resolved** by generated surfaces.

---

## Close now (6) — DONE or premise dead

| # | Title | Why close | Evidence |
|---|---|---|---|
| **#284** | activate `@layer` | **Superseded / vetoed.** `2026-06-18-layer-activation-scope.md` is `blocked`: Stage 1 shipped (#435); Stage 2 vetoed because export-to-Marp styles decks with marp-core's *unlayered* scaffold Lattice can't wrap. The inert `@layer` stays inert *by design*. | decision doc + "UNLAYERED" comments in component CSS |
| **#356** | Frame/Cell/Tile self-contained folders | **DONE.** This *is* the cell-tree epic (#522–535). `lib/forms/{tile,cell,frame}/<name>/` now carry co-located `.css`+`.transform.js`+`.manifest.json`, kernel+adapter dedup met. | `lib/forms/tile/meta/meta.transform.js` (applyToHtml+applyToDom) |
| **#295** | Layout Studio (CSS-only component asset) | **DONE.** `lib/layout/{gate,scaffold,starters}.js` + `component-studio.js initLayoutStudio`, wired into `WorkbenchApp.tsx` as Faculty 2. | shipped ~#484 |
| **#296** | graduation bridge (export as PR scaffold) | **DONE.** `lib/layout/scaffold.js scaffoldFiles()` emits the `lib/components/<bucket>/<name>/…` file set; `bridge.js` runs it on export. | — |
| **#306** | decisions/README lists 12 of 76 ADRs | **Already fixed.** README is machine-generated and now lists ~135 of 138 ADRs. "12 of 76" no longer describes reality. | `engineering/decisions/README.md` |
| **#441** | [perf-nightly] docs perf regression | **Artifact, not a task.** `perf-nightly.yml` opens/appends *one rolling self-labelled issue* off the `[perf-nightly]` title marker (was #384). Body shows runner-variance noise — the same flapping that retired the #327 gate. Closing is safe; it self-reopens on a genuine sustained regression. | `perf-nightly.yml:134-152` |

## Dedupe (2 cards → 1 each)

- **#198 + #300** (gallery-jargon): same file, two framings ("won't rebuild
  deterministically" vs "should it exist?"). **Merge into one**; answer
  retire-vs-keep *first* (cheap if retired), then either delete deck+pdf+refs or
  fix reproducibility. Standing HARD RULE #9 artifact-integrity violation either
  way. → keep **#198**, fold #300 in.
- **#466 ↔ #476** (chart Tier-2 detail): #466 is an umbrella whose gantt (#475)
  and state-chart children **already shipped**; only **kanban** remains, which
  *is* #476. **Convert #466 to a 2/3-done checklist** and keep **#476** as the
  actionable card (gantt PR #475 is a ready template).

## Re-scope (premise drifted, core ask still valid)

| # | Re-scope to | Reason |
|---|---|---|
| **#279** | **flip it**: fix `diagram.gallery.md:19` "26"→"25" (+ VERIFICATION.md note) | Premise is backwards — README's "25" is **correct**; 5 surfaces agree. The gallery caption is the lone wrong one. |
| **#283** | audit the **~55 authorial** `!important` (not "~490") | True count 453; 348 are spec-correct library overrides (out of scope). "@layer prereq" rationale is dead (#284). |
| **#285** | drop the "transitional" wording; keep the bump | Only 2 of 3 markers remain; the `@layer` ordering that would retire them was vetoed, so the specificity bump is now the *permanent* fix. |
| **#297** | **add thumbnails to the existing catalog** | Card-grid catalog already ships (`ComponentCard.tsx`); only the rendered-thumbnail pipeline is missing. |
| **#414** | finish the **Theme-Studio** remainder | Header + Drawing Board already share `PaletteControls`; only Theme Studio's `innerHTML` native select remains. |
| **#180** | mark **7 of 13** chart types done; enumerate the rest (pictograph + px holdouts) | cqi sweep shipped for 7; fixed-px geometry persists in `pictograph.css` etc. |
| **#305** | fix `skill.md:21` "53"→52 + stale `design.md` link label | Not a table-vs-table contradiction; the two indexes serve different scopes. The real defects are the count + label. |
| **#281 / #282** | **date/fence** `design-system.md` §13 "Status" log (lines 757-799) | Canonical body is correct (52/twelve). The stale 58/9/89 figures survive *only* in the frozen historical log — quarantine it. |

## Update checklist (further along than the issue shows)

- **#380** Narrative step model — Step 2 ("derive steps from structure") is
  effectively shipped: `lib/transformers/build.js` registered, stamps
  `data-build-step(s)`, 0-pixel reveal via `base.build.css`. Remaining:
  overlay-PDF export, motion vocabulary, scroll driver, gated morph. Keep as the
  umbrella; tick step 2.

---

## Genuinely live work (keep), by leverage

**Shovel-ready / high payoff (do next):**
- **#515** Google Drive BYO storage — *med.* Decision settled (#513: Route B,
  PKCE, `drive.file`, no server). Zero impl yet. Highest net-new user value;
  gates save/open in the playground.
- **#506** runtime auto-split (Option B) — *med-high.* Only the decision
  (#507) landed; today only build-time Option A ships, so portrait decks **clip
  live** in preview/published-HTML/playground where the export would split.
  Closes the live-vs-export gap the whole #504–535 program opened.
- **#476** kanban Tier-2 detail — *med.* Last piece of the detail family; #475
  is a copy-ready template. Closing it lets #466 close.
- **#500** obligation-matrix cover-paginate — *med.* Now unblocked by the #496
  cover-paginate engine + #499 compare-table template; wide legal matrices
  currently clip instead of paginate.
- **#519** four portrait demo decks + PDFs — *low but cheap.* The retire-
  landscape program (#508–514) merged; the four `examples/*-portrait.md` + PDFs
  are still missing (HARD RULE #9 debt). **Now doable here** (Chrome via
  `CHROME_PATH`).
- **#287** LPM Phase 1 — *med.* Unbuilt (0 manifests carry a `render` block).
  Converts chart authoring + #299 + part of #288 from kernel edits to folder-
  drops. The unlock several smaller issues sit behind.

**Keep, lower urgency:**
- Engine: **#286** (variant/component class collisions — real cascade-bug
  class), **#288** (front-matter deck-config) + **#289** ($-sigil; do #288
  first), **#299** (function-plot own home — natural #287 rider), **#511**
  (runtime+emulator consolidation + "emulator" rename — byte-neutral debt; Move 1
  rename is high-blast-radius → maker-checker).
- Infra: **#290** (3-renderer parity test), **#291** (per-component pixel CI
  tier), **#292** (deck archive policy + `examples/MANIFEST.md`), **#293**
  (graduation-commit automation), **#294** (document `pixel-check`), **#298**
  (`.latticepack` zip interchange).
- Charts/components: **#477 + #478** (state-chart polish — *bundle into one PR*,
  same file), **#501** (glossary range-pill stale on split — already `ready`),
  **#527** (alignment-as-universal-modifier — *explore*; needs a design-model
  pass first).
- Docs (low, mechanical): **#280** (phantom `--hljs-name/-meta` rows — replace
  with the 6 real tokens), **#307** (flip treatments-rename ADR front-matter to
  `shipped`), **#308** (flip P4 ADR front-matter to `shipped`), **#309** (Mermaid
  "9 vs 12" override-set contradiction — make `theming.md` canonical), **#310**
  (strip legacy "Part 1–11" headings + fix dangling cross-refs).

---

## Docs↔codebase alignment — verdict

**Ground truth this run:** 52 components · 12 buckets · 14 base palettes · 25
Mermaid gallery types · 138 ADRs. Canonical docs and all *generated* surfaces
(`dist/docs/components.*`, the decisions README) match.

Three drift patterns, each with a cheap systemic fix:

1. **ADR `status:` front-matter not flipped after shipping** (#307, #308 — and
   the root cause of why "is it done?" is hard to answer from the docs). *Fix:*
   a `status:`-consistency check, or flip-on-merge discipline.
2. **Hardcoded counts duplicated into secondary surfaces** that drift from the
   generated count (`skill.md` "53", gallery caption "26", Mermaid "9 vs 12").
   *Fix:* cite the generated number, don't re-hardcode it.
3. **Frozen historical log blocks read as current** (`design-system.md` §13).
   *Fix:* date/fence them.

**New drift found (not previously filed), worth a card:** the Mermaid
"themeVariables-ignored" set genuinely contradicts itself — README/`mermaid.docs.md`
say **9** diagrams and name one set; `theming.md` enumerates **~12** and names a
*different* set. Neither reader can trust it. (Folds into #309; settle by parsing
`mermaid.css` for the true per-diagram override count.)

---

## Recommended actions (gated — needs your go-ahead)

Triage hygiene that would immediately shrink and clarify the queue:
1. **Close** #284, #356, #295, #296, #306, #441 (with the evidence above as the
   closing comment).
2. **Dedupe** #300→#198 and convert #466 to a 2/3 checklist (keep #476).
3. **Re-scope comments** on #279, #283, #285, #297, #414, #180, #305, #281/#282;
   tick step 2 on #380.

These touch the issue tracker (outward-facing), so I've left them unapplied. The
single highest-leverage *build* next is **#515** or **#506**; the cheapest
debt-payoff is **#519** (now unblocked here).
