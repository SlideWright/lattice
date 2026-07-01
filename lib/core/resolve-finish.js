/**
 * lib/core/resolve-finish.js
 *
 * The deck front-matter `finish:` register selects the deck's type + geometry
 * voice. It is a Lattice extension (Marpit has no native `finish:`): the three
 * render paths read it and APPEND the mapped CSS class tokens to every
 * `<section>`, exactly like the deck-wide `class:` directive.
 *
 *   finish: boardroom     → (no class)                 default Playfair/Outfit register
 *   finish: sketch        → `sketch`                   full hand finish
 *   finish: sketch-clean  → `sketch sketch-clean-body` hand heads + boxes, clean body
 *   finish: atrium        → `finish finish-atrium`     glow + grid + left rule
 *   finish: halo          → `finish finish-halo`       spotlight + rings + vignette
 *
 * Finish presets (the `field` zone) paint a palette-blind STACK of pure-gradient
 * layers behind every section — see lib/base/base.finish.css. The base `finish`
 * class carries the layer compositor; each `finish-<name>` sets the per-role
 * layer custom properties. They carry no url()/mask, so they are export-safe and
 * add no exfil surface.
 *
 * Open registry: add a row to FINISH_REGISTER + the matching base CSS to add a
 * finish — the same way `theme:` is an open set of registered palettes. There
 * is no opaque "default" value: `boardroom` is the named baseline, and omitting
 * the key renders it. An omitted, empty, or UNRECOGNIZED value resolves to NO
 * classes (boardroom); the deck-lint flags an unrecognized value so a typo
 * (`finish: sketchh`) surfaces instead of silently rendering boardroom.
 *
 * Pure + dependency-free so it bundles into the browser runtime (esbuild) and
 * is unit-testable in isolation. Shared by lattice-emulator.js,
 * lib/integrations/markdown-it/plugins.js, and lib/runtime/index.js so all three
 * render paths produce identical class lists.
 */

// Register name → the class tokens appended to every section. '' = boardroom
// (the baseline register: no class, the engine default applies).
const FINISH_REGISTER = Object.freeze({
  boardroom: '',
  sketch: 'sketch',
  'sketch-clean': 'sketch sketch-clean-body',
  // Finish presets — the parametric `field` zone (base.finish.css). Each maps to
  // the `finish` base class (the layer compositor) + its preset variant. Each
  // preset is a STACK of pure-gradient layers; palette-blind, export-safe.
  atrium: 'finish finish-atrium',
  meridian: 'finish finish-meridian',
  strata: 'finish finish-strata',
  halo: 'finish finish-halo',
  ledger: 'finish finish-ledger',
  // The 4 premium presets added in the Finish redesign extension — each leans into
  // a tunable/movable layer + a new layer type (mesh / lattice / pinstripe / frame).
  nimbus: 'finish finish-nimbus',
  loom: 'finish finish-loom',
  savile: 'finish finish-savile',
  gallery: 'finish finish-gallery',
});

/** The recognized finish names (for the deck-lint vocabulary + docs). */
const FINISH_NAMES = Object.freeze(Object.keys(FINISH_REGISTER));

/** Extract the raw `finish:` value from a deck source's front matter, or null. */
function readFrontMatterFinish(md) {
  if (!md) return null;
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return null;
  const f = m[1].match(/^\s*finish:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m);
  return f ? f[1].trim() : null;
}

/** True if `value` is a recognized finish register name. */
function isKnownFinish(value) {
  return typeof value === 'string'
    && Object.hasOwn(FINISH_REGISTER, value.trim().toLowerCase());
}

/** Map a finish value to its space-joined class tokens ('' for boardroom/unknown). */
function finishClasses(value) {
  if (typeof value !== 'string') return '';
  const key = value.trim().toLowerCase();
  return Object.hasOwn(FINISH_REGISTER, key) ? FINISH_REGISTER[key] : '';
}

/** Convenience: read the `finish:` value from a full deck source + map it. */
function finishClassesFromSource(md) {
  return finishClasses(readFrontMatterFinish(md) || '');
}

module.exports = {
  FINISH_REGISTER,
  FINISH_NAMES,
  readFrontMatterFinish,
  isKnownFinish,
  finishClasses,
  finishClassesFromSource,
};
