/**
 * crosswalk — the canonical old→new token rename map for the universal token
 * system (engineering/decisions/2026-06-11-universal-token-system.md), plus the
 * two pure string transforms that flip a stylesheet between the two systems.
 *
 * Single source of truth, consumed by:
 *   - test/unit/tokens/crosswalk.test.js (applies flip() inline; no build step)
 *   - docs/src/pages/drawing-board.astro — a build-time require() of this module
 *     for the "Token system: Current / Universal" toggle; PAIRS ships to the
 *     browser via db-data, where the client `flipTokens` (in
 *     docs/src/playground/drawing-board-render.js) mirrors flip()
 *
 * Scope: the groups whose OLD per-theme names are still the source and thus
 * still need flipping to NEW-canonical. As each group lands its canonical flip
 * (ADR §11), its pairs are REMOVED here — the names are no longer "old". It
 * excludes:
 *   - status (--pass/warn/fail stay the curated source; --status-* alias to them)
 *   - the chart triad (--chart-cat-* already flipped to canonical in phase 6)
 *   - sequential (--seq-* flipped to canonical, group 1 — ADR §11.3)
 *
 * Pure: no fs, no deps — bundles cleanly and runs in the browser.
 */

// ── The crosswalk: { old, new } pairs ────────────────────────────────────────
const PAIRS = [
  // categorical (phase 1): pale fill, deep mark, on-fill / on-mark ink
  ...Array.from({ length: 12 }, (_, i) => ({ old: `c${i + 1}-light`, new: `cat-${i + 1}-fill` })),
  ...Array.from({ length: 12 }, (_, i) => ({ old: `c${i + 1}-dark`, new: `cat-${i + 1}-mark` })),
  { old: 'c-ink-light', new: 'cat-on-fill' },
  { old: 'c-ink-dark', new: 'cat-on-mark' },

  // diagram-structural (phase 2)
  { old: 'c-stroke', new: 'diagram-stroke' },
  { old: 'c-line', new: 'diagram-line' },
  { old: 'c-accent-warm', new: 'diagram-accent-warm' },

  // diagram lifecycle / annotation (phase 3)
  { old: 'c-warm-light', new: 'diagram-active' },
  { old: 'c-warm-dark', new: 'diagram-active-mark' },
  { old: 'c-cool-light', new: 'diagram-done' },
  { old: 'c-cool-dark', new: 'diagram-done-mark' },
  { old: 'c-alarm-dark', new: 'diagram-critical-mark' },
  { old: 'c-alarm', new: 'diagram-critical' },
  { old: 'c-mark', new: 'diagram-today' },
  { old: 'c-note', new: 'diagram-note' },

  // surfaces / scheme (phase 4)
  { old: 'bg-dark', new: 'surface-inverse' },
  { old: 'dark-bg-alt', new: 'scheme-dark-bg-alt' },
  { old: 'dark-bg', new: 'scheme-dark-bg' },
  { old: 'dark-border', new: 'scheme-dark-border' },
  { old: 'dark-text-heading', new: 'scheme-dark-text-heading' },
  { old: 'dark-text-body', new: 'scheme-dark-text-body' },
  { old: 'dark-text-display', new: 'scheme-dark-text-display' },
  { old: 'dark-text-secondary', new: 'scheme-dark-text-secondary' },
  { old: 'dark-text-label', new: 'scheme-dark-text-label' },
  { old: 'dark-text-muted', new: 'scheme-dark-text-muted' },

  // sequential ramp (phase 5) — FLIPPED to canonical (group 1, ADR §11.3):
  // themes now declare --seq-500 directly and base.tokens.css derives the ramp
  // on --seq-*, so --scale-* no longer exists to flip. Pair removed.
];

// Longest old-name first so a literal-prefix scan never clips a longer token
// (belt-and-suspenders; the (?![\w-]) boundary already prevents it).
const ORDERED = [...PAIRS].sort((a, b) => b.old.length - a.old.length);

/** Escape a token name for use in a RegExp. */
function esc(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Flip a THEME stylesheet to new-canonical: rename every `--old` (definition
 * AND reference) to `--new`. The `(?![\w-])` boundary stops `--c1-light` from
 * touching `--c10-light`, or `--dark-bg` from touching `--dark-bg-alt`.
 */
function flipTheme(css) {
  let out = css;
  for (const { old, new: nu } of ORDERED) {
    out = out.replace(new RegExp(`--${esc(old)}(?![\\w-])`, 'g'), `--${nu}`);
  }
  return out;
}

/**
 * Flip ANY stylesheet (engine or theme) to the new-canonical system: rename
 * every old name to new (so every `var(--old)` consumer in mermaid.css /
 * component CSS and any derivation off an old name follow), then drop the
 * declarations that thereby became self-referential — the phase blocks'
 * forward aliases `--new: var(--old)` rename to `--new: var(--new)` and are
 * removed. The result reads the new names end-to-end and resolves identically
 * to the current system (asserted by test/unit/tokens/crosswalk.test.js).
 * Idempotent on already-new tokens (status, --chart-cat-*) — they aren't in the
 * crosswalk, so they're untouched.
 */
function flip(css) {
  return flipTheme(css).replace(/--([a-z0-9-]+)\s*:\s*var\(\s*--\1\s*\)\s*;?/gi, '');
}

module.exports = { PAIRS, flipTheme, flip };
