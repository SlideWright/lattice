/**
 * Resolve whether a colour-vision-deficiency (CVD) accessibility palette
 * overrides the deck's theme — and which one. This sits ABOVE the four-tier
 * `theme:` chain in resolve-palette.js: an active accessibility setting ALWAYS
 * wins over `theme:` (engineering/decisions/2026-06-16-colour-blindness-
 * accessibility.md — "accessibility takes precedence, always").
 *
 * Two activation sources, highest precedence first:
 *
 *   1. Workspace setting — the live viewer's declared need (the Drawing Board /
 *      Present / Practice toggle, or the engine's LATTICE_ACCESSIBILITY env /
 *      --accessibility flag). Beats the deck, because the person actually
 *      viewing it has the real need; an explicit workspace `off` also wins.
 *   2. Deck front-matter `accessibility:` directive — travels WITH the deck so
 *      it renders correctly wherever the deck goes.
 *   3. Neither set → off; the theme stands.
 *
 * A resolved type maps to the curated palette `a11y-<type>` (e.g.
 * `a11y-deuteranopia`), which wins the palette name-resolution — so every
 * render surface, which already selects a theme by name, picks it up with no
 * new rendering layer.
 *
 * v1 ships the three dichromacies; achromatopsia is recognized but deferred to
 * phase 2 (it needs the redundant non-colour encoding to function), so a
 * request for it resolves to OFF and is surfaced via `unsupported` rather than
 * silently ignored.
 *
 * Pure: no fs, no repo requires beyond the (pure) CVD type vocabulary — bundles
 * cleanly for the browser, exactly like resolve-palette.js / lint-core.js.
 *
 * Consumed by:
 *   - the owned engine (lattice-emulator) palette resolution
 *   - lib/runtime + the Drawing Board client resolver (step 4)
 *   - test/unit/core/resolve-accessibility.test.js
 */

const { canonicalType, CVD_TYPES } = require('../theme/cvd.js');

/** Types recognized by the front-matter / workspace vocabulary but not yet
 * shipped as palettes — resolve to OFF, but reported so a caller can warn. */
const DEFERRED_TYPES = Object.freeze(['achromatopsia']);

const OFF_WORDS = new Set(['', 'off', 'none', 'false', 'no']);

/**
 * Classify a raw type string into one of three states the precedence logic
 * needs to tell apart:
 *   - `{ state: 'unset' }`           — not specified; defer to the next tier
 *   - `{ state: 'off' }`             — explicitly disabled; wins, stops here
 *   - `{ state: 'on', type }`        — a shipped dichromacy
 *   - `{ state: 'deferred', type }`  — recognized but phase-2 (→ off + warn)
 */
function classify(raw) {
  if (raw == null) return { state: 'unset' };
  const t = String(raw).trim().toLowerCase();
  if (t === '') return { state: 'unset' };
  if (OFF_WORDS.has(t)) return { state: 'off' };
  if (DEFERRED_TYPES.includes(t)) return { state: 'deferred', type: t };
  try {
    const canon = canonicalType(t);
    if (canon === 'normal') return { state: 'off' };
    return { state: 'on', type: canon };
  } catch {
    // Unknown token — treat as unset so a typo never silently disables an
    // accessibility setting the OTHER tier may legitimately provide.
    return { state: 'unset', unknown: t };
  }
}

/** Parse `accessibility: deuteranopia` (quoted or bare) from front matter. */
function readFrontMatterAccessibility(md) {
  if (!md) return null;
  const m = md.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const a = m[1].match(/^\s*accessibility:\s*["']?([A-Za-z-]+)["']?\s*$/m);
  return a ? a[1] : null;
}

/**
 * @param {Object} args
 * @param {string} [args.md]         Deck source (front matter included)
 * @param {string} [args.workspace]  Viewer/workspace setting (type, or off/none)
 * @param {Object} [args.env]        Process environment (engine: LATTICE_ACCESSIBILITY)
 * @returns {{
 *   active: boolean,            // an accessibility palette is in effect
 *   type: string|null,          // canonical dichromacy, or null
 *   palette: string|null,       // `a11y-<type>`, or null
 *   source: 'workspace'|'front-matter'|'off',
 *   unsupported: string|null,   // a deferred type that was requested (phase 2)
 * }}
 */
function resolveAccessibility({ md = '', workspace = null, env = process.env } = {}) {
  const ws = classify(workspace != null ? workspace : env?.LATTICE_ACCESSIBILITY);
  const fm = classify(readFrontMatterAccessibility(md));

  // Workspace decides whenever it expresses a preference (on / off / deferred);
  // only an unset workspace defers to the deck's front matter.
  const chosen = ws.state !== 'unset' ? { ...ws, source: 'workspace' } : { ...fm, source: 'front-matter' };

  if (chosen.state === 'on') {
    return { active: true, type: chosen.type, palette: `a11y-${chosen.type}`, source: chosen.source, unsupported: null };
  }
  if (chosen.state === 'deferred') {
    return { active: false, type: null, palette: null, source: chosen.source, unsupported: chosen.type };
  }
  if (chosen.state === 'off') {
    // An explicit disable — preserve which tier chose it (a viewer who turned
    // it off is distinct from nobody setting anything).
    return { active: false, type: null, palette: null, source: chosen.source, unsupported: null };
  }
  // Nothing set in either tier.
  return { active: false, type: null, palette: null, source: 'off', unsupported: null };
}

/** The shipped accessibility palette names (v1) — `a11y-<dichromacy>`. */
const A11Y_PALETTES = Object.freeze(CVD_TYPES.map(t => `a11y-${t}`));

module.exports = { resolveAccessibility, readFrontMatterAccessibility, A11Y_PALETTES, DEFERRED_TYPES };
