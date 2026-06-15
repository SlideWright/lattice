/**
 * Form manifest loader + validator — the engine-read single source of truth
 * for Lattice's Form composition model (Form = Frame + Cell + Tile).
 *
 * Mirrors lib/components/index.js (HARD RULE 15 — reuse the manifest-loader
 * pattern, don't clone it): a folder-per-noun catalog the engine reads, so
 * "author once, consumers select a Frame" is real and adding a Frame/Tile is a
 * folder, not edits to three render kernels (design/forms.md §11;
 * engineering/decisions/2026-06-15-form-implementation.md §6).
 *
 * On-disk layout (design/forms.md §11):
 *
 *   lib/forms/
 *     frame/<frame>/<frame>.manifest.json   slicers — the selectable structural "themes"
 *     tile/<tile>/<tile>.manifest.json       fillers — the registry rows, one folder each
 *     cell/<cell>/<cell>.cell.json           the shared, resolution-blind slot definitions
 *     schema/cell.schema.json                JSON-schema for a Cell
 *     schema/frame.schema.json               JSON-schema for a Frame
 *     schema/tile.schema.json                JSON-schema for a Tile
 *
 * NODE-ONLY: this loader reads the filesystem. It is consumed by the build
 * generator (tools/build-forms.js) and the Node render paths. The browser
 * playground bundle must NOT import it — plugins.js keeps the derived skip set
 * fs-free by deriving it at Node load and baking a fallback (see
 * lib/integrations/markdown-it/plugins.js header). See design/forms.md §5/§6.
 */

const fs = require('node:fs');
const path = require('node:path');

const FORMS_DIR = __dirname;

// Enums mirrored from the schemas (kept here so validate() is fs-free of the
// JSON-schema file at call time, like lib/components/index.js).
const Z_PLANES = Object.freeze([0, 1, 2, 3, 4]);
const CELL_REGIONS = Object.freeze([
  'masthead', 'masthead-lede', 'masthead-bay',
  'stage',
  'footer', 'footer-left', 'progress-centre', 'pagination-right',
  'overlay',
]);
const OCCUPANT_KINDS = Object.freeze(['surface', 'chrome', 'content', 'review', 'frame']);
const TILE_KINDS = Object.freeze(['surface', 'chrome', 'content', 'review']);
const FILL_MODES = Object.freeze(['start', 'center', 'optical-center', 'anchor', 'end']);
const CAPACITIES = Object.freeze(['one', 'stack']);
const FRAME_KINDS = Object.freeze(['root', 'framed', 'sovereign']);
const TILE_STATUSES = Object.freeze(['shipped', 'partial', 'new']);
// Mirrors lib/components FORMS (the twelve Frame types).
const FORMS = Object.freeze([
  'bookend', 'divider', 'canvas', 'grid', 'stack', 'ledger',
  'panel', 'matrix', 'scatter', 'spatial', 'timeline', 'split',
]);

const kebab = (s) => typeof s === 'string' && /^[a-z][a-z0-9-]*$/.test(s);

// ── validators ──────────────────────────────────────────────────────────────

function validateCell(c, source) {
  const errors = [];
  const p = source ? `${source}: ` : '';
  if (typeof c !== 'object' || c === null) return [`${p}cell must be an object`];
  if (!kebab(c.id)) errors.push(`${p}cell id must be kebab-case (got ${JSON.stringify(c.id)})`);
  if (!CELL_REGIONS.includes(c.region)) errors.push(`${p}cell region must be one of ${CELL_REGIONS.join(', ')} (got ${JSON.stringify(c.region)})`);
  if (!Z_PLANES.includes(c.z)) errors.push(`${p}cell z must be 0..4 (got ${JSON.stringify(c.z)})`);
  if (!Array.isArray(c.accepts) || c.accepts.length === 0) errors.push(`${p}cell accepts must be a non-empty array`);
  else for (const k of c.accepts) if (!OCCUPANT_KINDS.includes(k)) errors.push(`${p}cell accepts kind ${JSON.stringify(k)} must be one of ${OCCUPANT_KINDS.join(', ')}`);
  if (!CAPACITIES.includes(c.capacity)) errors.push(`${p}cell capacity must be one|stack (got ${JSON.stringify(c.capacity)})`);
  if (!FILL_MODES.includes(c.fill)) errors.push(`${p}cell fill must be one of ${FILL_MODES.join(', ')} (got ${JSON.stringify(c.fill)})`);
  if (c.gap !== undefined && typeof c.gap !== 'string') errors.push(`${p}cell gap must be a string token name if present`);
  if (c.clip !== undefined && typeof c.clip !== 'boolean') errors.push(`${p}cell clip must be a boolean if present`);
  if (c.geometry !== undefined && (typeof c.geometry !== 'object' || c.geometry === null || Array.isArray(c.geometry))) errors.push(`${p}cell geometry must be an object if present`);
  return errors;
}

function validateFrame(f, source) {
  const errors = [];
  const p = source ? `${source}: ` : '';
  if (typeof f !== 'object' || f === null) return [`${p}frame must be an object`];
  if (!kebab(f.id)) errors.push(`${p}frame id must be kebab-case (got ${JSON.stringify(f.id)})`);
  if (!FORMS.includes(f.form)) errors.push(`${p}frame form must be one of ${FORMS.join(', ')} (got ${JSON.stringify(f.form)})`);
  if (!FRAME_KINDS.includes(f.kind)) errors.push(`${p}frame kind must be one of ${FRAME_KINDS.join(', ')} (got ${JSON.stringify(f.kind)})`);
  if (typeof f.exemptFromChrome !== 'boolean') errors.push(`${p}frame exemptFromChrome must be a boolean`);
  if (typeof f.description !== 'string' || !f.description) errors.push(`${p}frame description must be a non-empty string`);
  if (!Array.isArray(f.cells)) errors.push(`${p}frame cells must be an array`);
  else for (const id of f.cells) if (!kebab(id)) errors.push(`${p}frame cells entry must be kebab-case (got ${JSON.stringify(id)})`);
  if (!Array.isArray(f.suppresses)) errors.push(`${p}frame suppresses must be an array`);
  else for (const id of f.suppresses) if (!kebab(id)) errors.push(`${p}frame suppresses entry must be kebab-case (got ${JSON.stringify(id)})`);
  return errors;
}

function validateTile(t, source) {
  const errors = [];
  const p = source ? `${source}: ` : '';
  if (typeof t !== 'object' || t === null) return [`${p}tile must be an object`];
  if (!kebab(t.id)) errors.push(`${p}tile id must be kebab-case (got ${JSON.stringify(t.id)})`);
  if (!TILE_KINDS.includes(t.kind)) errors.push(`${p}tile kind must be one of ${TILE_KINDS.join(', ')} (got ${JSON.stringify(t.kind)})`);
  if (!Array.isArray(t.fits) || t.fits.length === 0) errors.push(`${p}tile fits must be a non-empty array`);
  else for (const id of t.fits) if (!kebab(id)) errors.push(`${p}tile fits entry must be kebab-case (got ${JSON.stringify(id)})`);
  if (!Z_PLANES.includes(t.z)) errors.push(`${p}tile z must be 0..4 (got ${JSON.stringify(t.z)})`);
  if (typeof t.population !== 'string' || !t.population) errors.push(`${p}tile population must be a non-empty string`);
  if (t.hideToken !== undefined && t.hideToken !== null && typeof t.hideToken !== 'string') errors.push(`${p}tile hideToken must be a string or null if present`);
  if (!TILE_STATUSES.includes(t.status)) errors.push(`${p}tile status must be one of ${TILE_STATUSES.join(', ')} (got ${JSON.stringify(t.status)})`);
  return errors;
}

// ── loaders ──────────────────────────────────────────────────────────────────

function loadOne(filePath, validator, key) {
  const text = fs.readFileSync(filePath, 'utf8');
  let m;
  try {
    m = JSON.parse(text);
  } catch (e) {
    throw new Error(`${filePath}: invalid JSON — ${e.message}`);
  }
  const source = path.relative(process.cwd(), filePath);
  const errors = validator(m, source);
  if (errors.length) throw new Error(`Invalid ${key} manifest:\n  ${errors.join('\n  ')}`);
  return m;
}

/**
 * Load every <id>/<id>.<suffix> under a subdirectory, sorted by id.
 * Throws on a duplicate id or a validation failure.
 */
function loadDir(subdir, suffix, validator, kind) {
  const root = path.join(FORMS_DIR, subdir);
  const out = [];
  const seen = new Set();
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const file = path.join(root, entry.name, `${entry.name}.${suffix}`);
    if (!fs.existsSync(file)) continue;
    const m = loadOne(file, validator, kind);
    if (seen.has(m.id)) throw new Error(`duplicate ${kind} id: ${m.id} (in ${subdir}/${entry.name})`);
    seen.add(m.id);
    out.push(m);
  }
  out.sort((a, b) => a.id.localeCompare(b.id));
  return out;
}

const loadCells = () => loadDir('cell', 'cell.json', validateCell, 'cell');
const loadFrames = () => loadDir('frame', 'manifest.json', validateFrame, 'frame');
const loadTiles = () => loadDir('tile', 'manifest.json', validateTile, 'tile');

/**
 * Load the whole catalog (cells, frames, tiles) and run referential integrity:
 *   - every Tile.fits → a real Cell id
 *   - every Cell.accepts kind is satisfied by ≥1 real Tile (or 'frame', met by
 *     any Frame existing)
 *   - every Frame.cells / Frame.suppresses → a real Cell id
 * Throws on the first integrity failure (load-bearing — a broken catalog must
 * fail loud, like the component ownership guard).
 */
function loadCatalog() {
  const cells = loadCells();
  const frames = loadFrames();
  const tiles = loadTiles();
  const errors = checkIntegrity({ cells, frames, tiles });
  if (errors.length) throw new Error(`Form catalog integrity failed:\n  ${errors.join('\n  ')}`);
  return { cells, frames, tiles };
}

/** Pure referential-integrity check. Returns an array of error strings. */
function checkIntegrity({ cells, frames, tiles }) {
  const errors = [];
  const cellIds = new Set(cells.map((c) => c.id));
  const haveFrames = frames.length > 0;
  // Tile.fits → real Cell
  for (const t of tiles) {
    for (const id of t.fits) {
      if (!cellIds.has(id)) errors.push(`tile "${t.id}" fits unknown cell "${id}"`);
    }
  }
  // Frame.cells / Frame.suppresses → real Cell
  for (const f of frames) {
    for (const id of f.cells) if (!cellIds.has(id)) errors.push(`frame "${f.id}" produces unknown cell "${id}"`);
    for (const id of f.suppresses) if (!cellIds.has(id)) errors.push(`frame "${f.id}" suppresses unknown cell "${id}"`);
  }
  // Every Cell.accepts kind satisfied by ≥1 Tile (or a Frame for 'frame').
  const kindFits = new Map(); // kind → Set<cellId> a Tile of that kind fits into
  for (const t of tiles) {
    if (!kindFits.has(t.kind)) kindFits.set(t.kind, new Set());
    for (const id of t.fits) kindFits.get(t.kind).add(id);
  }
  for (const c of cells) {
    for (const kind of c.accepts) {
      if (kind === 'frame') {
        if (!haveFrames) errors.push(`cell "${c.id}" accepts "frame" but no Frame exists`);
        continue;
      }
      const fits = kindFits.get(kind);
      if (!fits || !fits.has(c.id)) {
        errors.push(`cell "${c.id}" accepts "${kind}" but no Tile of kind "${kind}" fits into it`);
      }
    }
  }
  return errors;
}

/**
 * The engine's FORM_TOGGLE_SKIP set, DERIVED from the frame manifests: the
 * sorted set of Frame ids whose manifest declares exemptFromChrome:true. Adding
 * a sovereign Frame folder auto-extends this — the OCP win (design/forms.md §11;
 * ADR §6). Equals the historical hardcoded set by construction (asserted by
 * test/unit/forms/forms-manifest.test.js).
 */
function frameToggleSkip(frames) {
  const list = frames || loadFrames();
  return list.filter((f) => f.exemptFromChrome).map((f) => f.id).sort();
}

module.exports = {
  Z_PLANES,
  CELL_REGIONS,
  OCCUPANT_KINDS,
  TILE_KINDS,
  FILL_MODES,
  CAPACITIES,
  FRAME_KINDS,
  TILE_STATUSES,
  FORMS,
  validateCell,
  validateFrame,
  validateTile,
  loadCells,
  loadFrames,
  loadTiles,
  loadCatalog,
  checkIntegrity,
  frameToggleSkip,
};
