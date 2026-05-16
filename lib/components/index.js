/**
 * Component manifest loader + validator.
 *
 * Each layout in Lattice ships a JSON manifest in `lib/components/<name>.json`
 * describing it for the catalog, scaffolder, IDE snippets, and docs. The
 * rendering pipeline (CSS rules, JS post-processors, Mermaid integration)
 * is unchanged — the manifest is metadata, not behavior.
 *
 * See docs/design-system.md §6 for the contract and rationale.
 *
 * Schema (required unless noted):
 *
 *   name         string  — the `_class` directive value (kebab-case)
 *   function     enum    — one of FUNCTIONS (catalog family)
 *   form         enum    — one of FORMS (spatial composition)
 *   substance    enum    — one of SUBSTANCES (engine plugin contract)
 *   description  string  — one-sentence human description
 *   skeleton     string  — markdown emitted by the scaffolder
 *   purpose      string  — (optional) when to use, 2-3 sentences
 *   variants     array   — (optional) compatible modifier names
 *   slots        object  — (optional) implicit content structure
 *   example      string  — (optional) relative path to a snippet file
 *   docs         string  — (optional) deep link into a reference doc
 */



const fs = require('node:fs');
const path = require('node:path');

const FUNCTIONS = Object.freeze([
  'anchor',
  'statement',
  'inventory',
  'comparison',
  'progression',
  'evidence',
  'imagery',
]);

const FORMS = Object.freeze([
  'bookend',
  'divider',
  'canvas',
  'grid',
  'stack',
  'ledger',
  'panel',
  'matrix',
  'scatter',
  'timeline',
  'split',
]);

const SUBSTANCES = Object.freeze(['prose', 'structure', 'series', 'graph']);

/**
 * Validate a parsed manifest object. Returns an array of human-readable
 * error strings; empty array means valid. `source` is included in error
 * messages when provided (e.g. file path).
 */
function validate(m, source) {
  const errors = [];
  const prefix = source ? `${source}: ` : '';
  if (typeof m !== 'object' || m === null) {
    return [`${prefix}manifest must be an object`];
  }
  if (typeof m.name !== 'string' || !m.name) {
    errors.push(`${prefix}name must be a non-empty string`);
  } else if (!/^[a-z][a-z0-9-]*$/.test(m.name)) {
    errors.push(`${prefix}name must be kebab-case (got ${JSON.stringify(m.name)})`);
  }
  if (!FUNCTIONS.includes(m.function)) {
    errors.push(`${prefix}function must be one of: ${FUNCTIONS.join(', ')} (got ${JSON.stringify(m.function)})`);
  }
  if (!FORMS.includes(m.form)) {
    errors.push(`${prefix}form must be one of: ${FORMS.join(', ')} (got ${JSON.stringify(m.form)})`);
  }
  if (!SUBSTANCES.includes(m.substance)) {
    errors.push(`${prefix}substance must be one of: ${SUBSTANCES.join(', ')} (got ${JSON.stringify(m.substance)})`);
  }
  if (typeof m.description !== 'string' || !m.description) {
    errors.push(`${prefix}description must be a non-empty string`);
  }
  if (typeof m.skeleton !== 'string' || !m.skeleton) {
    errors.push(`${prefix}skeleton must be a non-empty string`);
  }
  if (m.purpose !== undefined && (typeof m.purpose !== 'string' || !m.purpose)) {
    errors.push(`${prefix}purpose must be a non-empty string if present`);
  }
  if (m.variants !== undefined) {
    if (!Array.isArray(m.variants)) {
      errors.push(`${prefix}variants must be an array if present`);
    } else {
      for (const v of m.variants) {
        if (typeof v !== 'string' || !v) {
          errors.push(`${prefix}variants entries must be non-empty strings (got ${JSON.stringify(v)})`);
        }
      }
    }
  }
  if (m.slots !== undefined) {
    if (typeof m.slots !== 'object' || m.slots === null || Array.isArray(m.slots)) {
      errors.push(`${prefix}slots must be an object if present`);
    } else {
      for (const [slotName, slot] of Object.entries(m.slots)) {
        if (typeof slot !== 'object' || slot === null) {
          errors.push(`${prefix}slot "${slotName}" must be an object`);
          continue;
        }
        if (typeof slot.selector !== 'string' || !slot.selector) {
          errors.push(`${prefix}slot "${slotName}" must have a non-empty "selector" string`);
        }
        if (typeof slot.description !== 'string' || !slot.description) {
          errors.push(`${prefix}slot "${slotName}" must have a non-empty "description" string`);
        }
        if (slot.required !== undefined && typeof slot.required !== 'boolean') {
          errors.push(`${prefix}slot "${slotName}" required must be boolean if present`);
        }
      }
    }
  }
  return errors;
}

/**
 * Load and validate a single manifest from a file path. Throws on
 * invalid JSON or failed validation. Returns the manifest object.
 */
function loadOne(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  let m;
  try {
    m = JSON.parse(text);
  } catch (e) {
    throw new Error(`${filePath}: invalid JSON — ${e.message}`);
  }
  const source = path.relative(process.cwd(), filePath);
  const errors = validate(m, source);
  if (errors.length) {
    throw new Error(`Invalid manifest:\n  ${errors.join('\n  ')}`);
  }
  return m;
}

/**
 * Load every manifest in the given directory (defaults to this directory).
 * Returns an array sorted by name. Throws if any manifest fails validation
 * or if two manifests share the same name.
 */
function loadAll(dir) {
  const root = dir || __dirname;
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const out = [];
  const seen = new Set();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.json')) continue;
    if (entry.name.startsWith('_')) continue;
    const m = loadOne(path.join(root, entry.name));
    if (seen.has(m.name)) {
      throw new Error(`duplicate manifest name: ${m.name} (in ${entry.name})`);
    }
    seen.add(m.name);
    out.push(m);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

/**
 * Group an array of manifests by function family. Returns an object
 * keyed by function name, with arrays of manifests as values. Functions
 * with no manifests are present as empty arrays — useful for the
 * scaffolder's `--list` output, which prints every family.
 */
function groupByFunction(manifests) {
  const out = Object.create(null);
  for (const fn of FUNCTIONS) out[fn] = [];
  for (const m of manifests) out[m.function].push(m);
  return out;
}

module.exports = {
  FUNCTIONS,
  FORMS,
  SUBSTANCES,
  validate,
  loadOne,
  loadAll,
  groupByFunction,
};
