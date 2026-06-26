---
status: shipped
summary: Performance bake-off of Lattice's markdown-it engine against remark (unified/micromark/mdast) on Lattice's real workload — the engine bench's jargon + stress decks. Harness in test/benchmark/markdown-it-vs-remark-bench.mjs, three tiers (baseline parse→HTML, parse-only tokens-vs-mdast, full Lattice path) plus cold load, heap, and install footprint. Result: markdown-it parses ~33–40× faster, loads ~2× faster cold, holds ~6× less heap, ships ~5 packages vs ~77. remark's draw is the mdast tree/ecosystem, but Lattice already has a working token-stream kernel (HARD RULE #1), so migrating buys ergonomics at a large recurring throughput cost plus a full kernel rewrite. Verdict: markdown-it stays. Actionable side-finding — Lattice's own plugin/transformer kernel is ~25–30× the bare-parse cost, so render latency lives in the kernel and the per-render buildMd, not the parser.
---

# markdown-it vs remark — performance bake-off

**Date:** 2026-06-26
**Status:** Investigation note (no engine change). Confirms markdown-it stays.
**Harness:** `test/benchmark/markdown-it-vs-remark-bench.mjs` (tinybench, reruns
the engine bench's jargon + stress decks). Run:
`node --expose-gc test/benchmark/markdown-it-vs-remark-bench.mjs`.

## Why

Lattice's engine is built on **markdown-it** (`lib/engine/index.js`), which
produces a flat **token stream**. **remark** (unified/micromark/mdast) is the
AST-first alternative and the obvious "what if we'd used a tree" question. This
measures whether remark would be faster for *Lattice's actual workload* — parse
a deck's markdown → HTML, once per render, on a CLI/serverless cold start.

## Fairness — three tiers, because the two aren't drop-in equivalents

- **Tier 1 — baseline parse→HTML:** vanilla `markdown-it` (commonmark + GFM) vs
  `remark-parse` + `remark-gfm` + `remark-rehype` + `rehype-stringify`. Same
  input, same GFM surface, HTML out, no Lattice plugins on either side.
- **Tier 2 — parse-only:** `md.parse()` (tokens) vs `unified.parse()` (mdast) —
  isolates the cost of building the structure each plugin model walks.
- **Tier 3 — real Lattice path:** `api.render` (12 markdown-it plugins + ~10 HTML
  transformers + highlight.js + KaTeX). remark has **no** equivalent — shown to
  size the gap a migration would have to clear, not as a like-for-like race.

Plus cold module-load (fresh child process per engine), peak heap, and install
footprint.

## Results (Node 22, this sandbox; medians)

| Workload | markdown-it | remark | markdown-it advantage |
|---|---|---|---|
| **Baseline → HTML**, normal (jargon, 31 KB, 62 slides) | ~1.15 ms | ~39.6 ms | **~33×** |
| **Baseline → HTML**, stress (jargon ×6, 188 KB, 481 slides) | ~7.7 ms | ~297 ms | **~35×** |
| **Parse-only**, normal | ~0.96 ms | ~37.0 ms | **~37×** |
| **Parse-only**, stress | ~7.0 ms | ~258 ms | **~40×** |

- **Lattice production path** (tier 3, markdown-it + full kernel): ~29 ms normal,
  ~91 ms stress. So Lattice's *own* plugins/transformers/hljs/KaTeX cost
  **~25–30× the bare markdown-it parse** — the kernel, not the parser, dominates
  Lattice's render time.
- **Cold load:** markdown-it ~38 ms, remark ~80 ms (~2.1×), full Lattice engine
  ~165 ms.
- **Peak heap** (one stress render): markdown-it ~10 MB vs remark ~58 MB (~5.7×).
- **Install footprint:** markdown-it ≈ 5 packages / ~0.9 MB; the remark md→HTML
  stack pulls in **~77 micromark/mdast/unist/hast packages**.

The parse-only gap (~37–40×) ≈ the baseline gap (~33–35×), so the difference is
**the parser itself** (micromark vs markdown-it's tokenizer), not serialization.
markdown-it is among the fastest JS markdown parsers; micromark trades raw speed
for spec-precision and a composable AST.

## Verdict

**markdown-it stays.** For Lattice's workload it parses **~33–40× faster**, loads
~2× faster cold, and holds ~6× less heap. remark's draw is the mdast tree and its
plugin ecosystem — but Lattice already has a working token-stream kernel (12
plugins + ~10 transformers, HARD RULE #1), so adopting remark buys an
ergonomic AST at a large, recurring throughput cost *and* a full kernel rewrite.
No case for migrating.

The actionable finding isn't about remark at all: **Lattice's own kernel is
~25–30× the bare-parse cost** (tier 3 vs tier 1). If render latency ever needs
attention, the lever is the plugin/transformer kernel and per-render markdown-it
rebuild (`buildMd` runs every `render()`), not the choice of parser.

## Caveats

- Single-machine, in-sandbox numbers — ratios are stable and portable; absolute
  ms are not.
- Tier 3 is markdown-it-only by design; a true remark Lattice would need the
  whole kernel reimplemented against mdast before it could be timed head-to-head.
- remark configured for parity (GFM on, raw HTML passthrough). Enabling remark's
  sanitizer or extra plugins would only widen the gap.
