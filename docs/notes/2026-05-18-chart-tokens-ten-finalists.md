---
last-status-update: 2026-05-18
status: design-proposal
supersedes: 2026-05-18-chart-styling-redesign.md
owner: chart-family
audience: design + engineering
---

# Ten chart-token designs — finalists

Reset from scratch. Per the brief: chart-specific tokens (not state-system reuse), tuned for indaco, AA-verified text-on-fill on every pair, ten distinct directions explored and the best of each presented.

Each design defines its own vocabulary under the `--chart-*` prefix. The scratch themes that render them are at `themes/chart-<name>.css` (10 files; not for production — they exist so the rendered PDFs are reproducible). The contrast verification tool at `.scratch/state-token-test/designs.py` will print AA reports for any pair.

This note replaces the earlier `2026-05-18-chart-styling-redesign.md`.

## What's in each design

Every design ships:

```
--chart-1 … --chart-N        fill tokens (light-dark pairs)
--chart-1-text … chart-N-text  AA-paired text per slot per canvas
--chart-accent                 single brand emphasis hue
--text-on-saturated            white-on-light, dark-on-dark inverse
                               (used wherever a label sits on a chart fill)
+ legacy aliases mapping --positive / --negative / --neutral / --inactive /
  --pass / --warn / --fail / --cN-light / --cN-dark at the design's
  slot cycle so existing chart code renders with no source changes.
```

Each design's slot count, hue spacing, intensity range, and text-pairing strategy is distinct.

## The ten finalists

### 1. Monochrome

**Concept.** Single indaco-navy ramp at five intensities. Categorical via brightness, not hue. Austere; reads like Tufte. Amber as the lone accent.

**Slots** (light fill / dark fill / light text / dark text):

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 | `#EAEFF5` | `#0F2538` | `#0A1628` | `#C7DCED` | 11.09 |
| chart-2 | `#B8C9DD` | `#1F3D5A` | `#0A1628` | `#C7DCED` |  7.95 |
| chart-3 | `#3D6890` | `#5BA0CC` | `#FFFFFF` | `#0A1628` |  5.96 |
| chart-4 | `#1F4A6E` | `#82C8E5` | `#FFFFFF` | `#0A1628` |  9.28 |
| chart-5 | `#082C4D` | `#C7DCED` | `#FFFFFF` | `#0A1628` | 12.85 |
| accent  | `#91450E` | `#E89F45` | — | — | — |

**Best for.** Long narrative decks where charts are evidence, not the main act. Brand-deeply indaco — every chart is the brand.
**Caveat.** Two-series-only at a glance can blur when bars are short. Five categories distinguishable but slow to read.
**Iteration notes.** Tried 4 stops (too few for typical 5-series charts), 6 stops (gets muddy mid-band), tonal arithmetic vs hand-tuning. Locked 5 hand-tuned with explicit AA per stop.

### 2. Dichromatic

**Concept.** Two hues only — indaco navy and heritage amber. Three intensities of each = six slots. Most restrained look possible while still allowing categorical variety. Reads as a deliberate two-color identity.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 | `#DCE5F0` | `#0F2538` | `#0A1628` | `#C7DCED` | 11.09 |
| chart-2 | `#1F4A6E` | `#82C8E5` | `#FFFFFF` | `#0A1628` |  9.28 |
| chart-3 | `#082C4D` | `#C7DCED` | `#FFFFFF` | `#0A1628` | 12.85 |
| chart-4 | `#F4E2C8` | `#2E1F0A` | `#0A1628` | `#F4E2C8` | 12.58 |
| chart-5 | `#91450E` | `#E89F45` | `#FFFFFF` | `#1A0F00` |  7.50 |
| chart-6 | `#5C2C04` | `#F4CA8A` | `#FFFFFF` | `#1A0F00` | 11.50 |

**Best for.** Brand-monogrammed decks. Looks like an indaco identity manual.
**Caveat.** Six categories total but only two hue families — for charts that need clear hue distinction (e.g., "do these match across hues") it's wrong.
**Iteration notes.** Tried navy + green (loses warm balance), navy + burgundy (alarm-coded), navy + slate (no contrast). Navy + amber stays canonical.

### 3. Spectrum

**Concept.** Sample indaco's brand spectrum literally — navy, mid-blue, sky, brand-bright green — plus amber as the warm balance. Five slots that all live "inside" the indaco identity gradient.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (navy) | `#1F4A6E` | `#82C8E5` | `#FFFFFF` | `#0A1628` |  9.28 |
| chart-2 (mid)  | `#005A8C` | `#4AB8E8` | `#FFFFFF` | `#0A1628` |  6.62 |
| chart-3 (sky)  | `#007AB5` | `#5BC4F0` | `#FFFFFF` | `#0A1628` |  4.96 |
| chart-4 (green)| `#3D7A0F` | `#8FD040` | `#FFFFFF` | `#0A1628` |  5.07 |
| chart-5 (amber)| `#91450E` | `#E89F45` | `#FFFFFF` | `#1A0F00` |  7.50 |

**Best for.** Indaco brand-heavy decks where charts are a visible identity touchpoint. Pie wedges in spectrum order look like the deck's logomark.
**Caveat.** Three blues + one green + one amber — the blues blur into each other in tight charts (gantt cells, small wedges).
**Iteration notes.** Tried 4-slot (lose mid-blue), 6-slot (add navy-deep — adds redundancy), hue-shifted green (more brand-bright #6CB516 — fails AA with white at 4.0:1). Locked at 5 with green darkened to pass AA.

### 4. Heritage

**Concept.** Five hand-curated boardroom hues — navy, slate, amber, forest, burgundy. Reads like a tasteful magazine palette (Economist, FT feature, Pentagram). Each hue carries an editorial role.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (navy)     | `#1F4A6E` | `#82C8E5` | `#FFFFFF` | `#0A1628` |  9.28 |
| chart-2 (slate)    | `#4A5C73` | `#A8B5C5` | `#FFFFFF` | `#0A1628` |  6.85 |
| chart-3 (amber)    | `#91450E` | `#E89F45` | `#FFFFFF` | `#1A0F00` |  7.50 |
| chart-4 (forest)   | `#2D6B3A` | `#6FB57F` | `#FFFFFF` | `#0A1628` |  6.41 |
| chart-5 (burgundy) | `#8A2E33` | `#D87277` | `#FFFFFF` | `#1A0608` |  6.14 |

**Best for.** Boardroom 10/10. Categorical and state both feel natural in this palette (forest = positive, burgundy = negative without re-pointing). Author can name a series and intuit a color.
**Caveat.** None significant. The palette is opinionated; some authors may want a 6th slot for "other."
**Iteration notes.** Tried 6-color (burgundy + plum — plum too purple-coded), tried desaturated (loses bite), tried more saturated (becomes Tailwind). Locked at restrained-but-confident.

### 5. Cool Quintet

**Concept.** Four cool hues (navy, sky, teal, slate) plus one warm accent (amber). Favors the blue family — every cool slot is in indaco's hue neighborhood. Amber breaks the pattern only when categorical position demands it.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (navy)  | `#1F4A6E` | `#82C8E5` | `#FFFFFF` | `#0A1628` |  9.28 |
| chart-2 (sky)   | `#005A8C` | `#4AB8E8` | `#FFFFFF` | `#0A1628` |  6.62 |
| chart-3 (teal)  | `#0E5A5B` | `#5BC4C4` | `#FFFFFF` | `#0A1628` |  7.78 |
| chart-4 (slate) | `#4A5C73` | `#A8B5C5` | `#FFFFFF` | `#0A1628` |  6.85 |
| chart-5 (amber) | `#91450E` | `#E89F45` | `#FFFFFF` | `#1A0F00` |  7.50 |

**Best for.** Decks where amber-as-signal is the editorial point ("our brand, with one warning"). Charts read as "indaco's family."
**Caveat.** Four cools can blur in pies — the sky/teal pair is similar enough that wedge boundaries matter more than hue identity.
**Iteration notes.** Tried 5 cools (no warm balance), tried 2 warms (becomes warm-quintet), tried teal swap for purple (off-brand). Locked at 4+1.

### 6. Warm Quintet

**Concept.** Inverse balance of #5. Navy as the lone cool anchor, four warm-leaning hues. Reads as the heritage end of indaco — closer to cuoio's leather identity than indaco's cool blue.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (navy)     | `#1F4A6E` | `#82C8E5` | `#FFFFFF` | `#0A1628` |  9.28 |
| chart-2 (amber)    | `#91450E` | `#E89F45` | `#FFFFFF` | `#1A0F00` |  7.50 |
| chart-3 (burgundy) | `#8A2E33` | `#D87277` | `#FFFFFF` | `#1A0608` |  6.14 |
| chart-4 (forest)   | `#2D6B3A` | `#6FB57F` | `#FFFFFF` | `#0A1628` |  6.41 |
| chart-5 (khaki)    | `#6B5318` | `#D5BD75` | `#FFFFFF` | `#1A0F00` | 10.22 |

**Best for.** Decks with editorial / publishing tone. Warmth gives stats slides a confident "annual report" feel.
**Caveat.** Indaco's spectrum is cool-leaning by brand — using this palette in indaco is mildly off-brand. Better fit for cuoio (heritage brown) if we ever port.
**Iteration notes.** Tried 3 warms (felt thin), 6 warms (loses the navy anchor), khaki vs cream (cream too pale — AA failure with white text). Locked at 1+4 with darkened khaki.

### 7. Pastel

**Concept.** Apple-style soft pastels. Light canvas = pale tints; dark canvas = deep tones. Text always reads (AAA on light, AA on dark). Reads as the most "designed" — least visually weighty.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (pale navy) | `#DCE5F0` | `#1F4A6E` | `#0A1628` | `#FFFFFF` |  9.28 |
| chart-2 (pale amber)| `#F4E2C8` | `#91450E` | `#0A1628` | `#FFFFFF` |  7.50 |
| chart-3 (pale mint) | `#DEEDDF` | `#2D6B3A` | `#0A1628` | `#FFFFFF` |  6.41 |
| chart-4 (pale rose) | `#F0DDDF` | `#8A2E33` | `#0A1628` | `#FFFFFF` |  8.34 |
| chart-5 (pale slate)| `#E2E6ED` | `#4A5C73` | `#0A1628` | `#FFFFFF` |  6.85 |

**Best for.** Narrative decks with a lot of charts. Charts recede into the deck flow; nothing shouts. Boardroom-soft.
**Caveat.** Low contrast with canvas (~1.2:1) means small fills (kanban stripes, dot scatter) may be hard to spot on a projector.
**Iteration notes.** Tried even paler (L 0.96 — drops sub-1:1 vs canvas), tried richer pastels (becomes Heritage). Pastel intensity locked at L ≈ 0.90 / 0.30.

### 8. Saturated Mid

**Concept.** Tailwind-500/400 vibe — vivid mid-tones in both modes. Product-grade colors. More dashboard than boardroom; included so the comparison covers the "should this look like a SaaS app" question.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (blue)    | `#1D4ED8` | `#60A5FA` | `#FFFFFF` | `#0A1628` |  6.66 |
| chart-2 (amber)   | `#B45309` | `#FBBF24` | `#FFFFFF` | `#1A0F00` |  4.97 |
| chart-3 (emerald) | `#047857` | `#34D399` | `#FFFFFF` | `#0A1628` |  5.16 |
| chart-4 (red)     | `#B91C1C` | `#F87171` | `#FFFFFF` | `#1A0608` |  6.49 |
| chart-5 (violet)  | `#6D28D9` | `#A78BFA` | `#FFFFFF` | `#0A1628` |  6.66 |

**Best for.** Product-team decks. Engineering dashboards. Anywhere the audience is technical and color-literate.
**Caveat.** Reads "tool-y," not boardroom. Off-brand for indaco's heritage identity.
**Iteration notes.** Tried 500/400 (failed AA at 3.76 on red), settled at 700/400. Tried 8 hues (becomes Carbon). Locked at 5.

### 9. Newspaper

**Concept.** FT-style restraint. Three quiet tints (slate gradient) carry most data; one navy "signal" hue and one burgundy alarm-only hue. Reads as a newspaper graphic — color is signal, not decoration.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (quiet-1)  | `#DDE3EB` | `#1A2A3D` | `#0A1628` | `#C7DCED` | 10.32 |
| chart-2 (quiet-2)  | `#B5C0D0` | `#2C3F58` | `#0A1628` | `#C7DCED` |  7.60 |
| chart-3 (quiet-3)  | `#5A6D85` | `#7C8DA7` | `#FFFFFF` | `#0A1628` |  5.30 |
| chart-4 (signal)   | `#1F4A6E` | `#82C8E5` | `#FFFFFF` | `#0A1628` |  9.28 |
| chart-5 (alarm)    | `#8A2E33` | `#D87277` | `#FFFFFF` | `#1A0608` |  6.14 |

**Best for.** Decks where the editorial voice is "we're not selling anything, we're showing what we found." Strong with title-led slides.
**Caveat.** Forces good chart authoring (one signal per chart). Some authors will fight it.
**Iteration notes.** Tried 4-slot (loses 3-stop gradient), 6-slot (adds 2nd alarm — competes with main alarm). Locked at 5 with explicit gradient + signal + alarm.

### 10. Dark-First

**Concept.** Designed for dark canvas first; light canvas uses muted derivatives. Jewel tones — sapphire, gold, emerald, garnet, amethyst. Reads as a luxury / event-deck palette.

| Slot | Fill light | Fill dark | Text light | Text dark | Min AA |
|---|---|---|---|---|---|
| chart-1 (sapphire) | `#1F4A6E` | `#5BB5F0` | `#FFFFFF` | `#0A1628` |  8.32 |
| chart-2 (gold)     | `#8C5612` | `#F5C45A` | `#FFFFFF` | `#1A0F00` |  7.84 |
| chart-3 (emerald)  | `#1F7A45` | `#5FE08A` | `#FFFFFF` | `#0A1628` |  5.35 |
| chart-4 (garnet)   | `#9B2A37` | `#F08585` | `#FFFFFF` | `#1A0608` |  7.55 |
| chart-5 (amethyst) | `#5B4082` | `#B59CE8` | `#FFFFFF` | `#0A0612` |  8.40 |

**Best for.** Conference keynote decks. Black-bg event identity. Charts read as luxury data graphics, not utilitarian.
**Caveat.** Strong opinion; less neutral than Heritage. Amethyst is brand-novel for indaco.
**Iteration notes.** Tried bright-on-bright (failed AA on light canvas), settled muted-on-light + bright-on-dark. Tried 4 jewel tones (felt incomplete), 6 (got muddy). Locked at 5.

## Comparison matrix

| # | Design | Hues | Brand-coherence | Boardroom feel | Author cognitive load | Best canvas mode |
|---|---|---|---|---|---|---|
| 1 | Monochrome | 1 (navy) + accent | 10/10 | 8/10 | low | both |
| 2 | Dichromatic | 2 (navy + amber) | 10/10 | 9/10 | low | both |
| 3 | Spectrum | 5 (sampled brand) | 10/10 | 7/10 | low | both |
| 4 | Heritage | 5 (curated) | 9/10 | **10/10** | low | both |
| 5 | Cool Quintet | 4 cools + 1 warm | 9/10 | 8/10 | low | both |
| 6 | Warm Quintet | 1 cool + 4 warms | 7/10 (off-brand) | 9/10 | low | both |
| 7 | Pastel | 5 hues, pale-tinted | 8/10 | 9/10 (soft) | medium | light leans best |
| 8 | Saturated Mid | 5 vivid hues | 5/10 (product-y) | 5/10 | low | both |
| 9 | Newspaper | 5 (3 quiet + 1 signal + 1 alarm) | 9/10 | **10/10** | medium (good chart authoring required) | light leans best |
| 10 | Dark-First | 5 jewel tones | 7/10 | 9/10 | low | dark leans best |

## My picks, ranked

1. **Heritage (#4)** — the killer general-purpose boardroom answer. Five hand-curated hues that map naturally to both categorical and state. Indaco-brand-coherent without being a single-note ramp. Authors won't fight it. AA passes everywhere with confident margins (≥ 6:1).
2. **Newspaper (#9)** — the killer narrative-deck answer. Most editorial; most "designed." Pick this if the deck is FT-style storytelling.
3. **Dichromatic (#2)** — the killer monogrammed-identity answer. Just navy + amber; the deck looks like an indaco style guide manifest.
4. **Pastel (#7)** — the killer soft-Apple answer. Pick if the deck has 15+ chart slides and you don't want them to fight.

I'd recommend **Heritage** as the canonical default and ship the others as opt-in themes for different deck registers.

## What's in the repo

- `themes/chart-<name>.css` — 10 scratch theme files, AA-verified, importable by any deck via front-matter `theme: chart-heritage` (etc.)
- `.scratch/state-token-test/designs.py` — the contrast verification tool. Run `python3 designs.py` to re-verify; `python3 designs.py emit` to regenerate the themes.
- `.scratch/design-renders/` — rendered PDFs of `chart-family-experiment.md` under each design, both modes (20 PDFs). Plus gantt / quadrant / kanban / radar galleries per design (80 more PDFs) for the full visual sweep.

## What to do in the morning

Open a few PDFs side-by-side. Pick a design. I'll:

1. Promote the chosen design's tokens from `themes/chart-<name>.css` into base (universal defaults) + `themes/indaco.css` (curated values).
2. Migrate every chart consumer (chart-family + the 9 non-chart components on the legacy axis) to use `--chart-N` / `--chart-N-text` directly, deleting the legacy `--pass` / `--warn` / `--fail` / `--positive` / `--negative` / etc. axis entirely. Single coherent system.
3. Delete the other 9 scratch themes from `themes/`.
4. Rebuild every example deck PDF so the gallery reflects the new design.

Result: one coherent chart token system, AA-verified everywhere, opinionated about indaco brand identity, no parallel axes.

## What I considered and cut

A sample of the iterations that didn't land:

- **Tonal 9-stop ramp** (Tailwind/Material-style) — too many slots; charts never use 9 categories.
- **CIE/OKLCH-only tokens** — runtime support uneven; debugging confusion when values fail.
- **Per-chart-type palette** (gantt has its own, pie has its own) — fights cohesion.
- **Diverging scale primitive** (`--diverging-neg-3` … `--diverging-pos-3`) — useful for heatmaps; out of scope for chart family.
- **8-color cycle** (carbon-style) — past 5–6 categories the perceptual distinction breaks down anyway; chart authors should consolidate.
- **State + categorical kept as separate vocabularies** (my earlier Design 4) — the right answer for data teams; too much cognitive overhead for boardroom decks.
- **No `light-dark()` — separate light and dark palettes** — would isolate dark-mode designs but doubles every theme's curation work.
- **Auto-derive from brand hue + chroma curve** — covered by Monochrome (#1); the auto-derive math added complexity without visual gain over hand-tuned.
- **Apple's UIColor-style semi-transparent text on color (rgba)** — fights printer / projector contrast in boardroom contexts.
- **Pin each design's accent to its slot-1** — tried; reads weird when slot-1 is amber (Warm Quintet).
