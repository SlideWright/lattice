/**
 * Contracts — the Function layer made first-class (the Contract Workbench's
 * artifact). A contract names a Purpose's content shape (slots + cardinalities
 * + one canonical DOM + samples); conforming Layouts (Form) declare
 * `satisfies: <contract>` and style that canonical DOM, so an author swaps the
 * Layout for the same Content with one class.
 *
 * See engineering/decisions/2026-06-12-contracts-layout-swapping.md. A sibling
 * tier to lib/components/ (alongside, not inside): the loader is fs-based for
 * Node; the bundled CSS lives next to each contract and is wired into the CSS
 * bundle via TAIL_SOURCES in tools/build-css.js.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname);
const CARD_RE = /^(\d+)(\.\.(\d+|n))?$/;       // "1", "0..1", "2..n"
const LAYOUT_KINDS = ['css-only', 'transform'];

/** Every `<function>/` directory under lib/contracts/ that has a contract. */
function contractDirs() {
  return fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(ROOT, d.name))
    .filter((dir) => fs.existsSync(path.join(dir, path.basename(dir) + '.contract.json')));
}

/** Load all contracts with their conforming layouts attached as `.layouts`. */
function loadContracts() {
  return contractDirs().map((dir) => {
    const base = path.basename(dir);
    const contract = JSON.parse(fs.readFileSync(path.join(dir, base + '.contract.json'), 'utf8'));
    const layoutsPath = path.join(dir, base + '.layouts.json');
    contract.layouts = fs.existsSync(layoutsPath)
      ? JSON.parse(fs.readFileSync(layoutsPath, 'utf8'))
      : [];
    contract.dir = dir;
    return contract;
  });
}

/** Every conforming Layout's class name across all contracts (for the linter). */
function layoutClasses(contracts = loadContracts()) {
  return contracts.flatMap((c) => (c.layouts || []).map((l) => l.name));
}

/** The conforming Layouts for one contract name — the swappable set. */
function layoutsFor(name, contracts = loadContracts()) {
  const c = contracts.find((x) => x.name === name);
  return c ? c.layouts : [];
}

/**
 * Validate the invariants the model relies on. Returns an array of problem
 * strings (empty = valid). Pure; consumed by the unit test + (later) the
 * Contract Workbench's save guard.
 */
function validateContracts(contracts = loadContracts()) {
  const problems = [];
  const seenLayout = new Set();
  for (const c of contracts) {
    if (!c.name) problems.push('a contract is missing `name`');
    if (!c.function) problems.push(`${c.name}: missing \`function\``);
    if (!c.canonicalDom) problems.push(`${c.name}: missing \`canonicalDom\``);
    if (!c.slots || typeof c.slots !== 'object') problems.push(`${c.name}: missing \`slots\``);
    for (const [slot, def] of Object.entries(c.slots || {})) {
      if (!CARD_RE.test(def.card || '')) problems.push(`${c.name}.${slot}: bad cardinality "${def.card}"`);
    }
    for (const need of ['minimal', 'typical', 'stress', 'empty']) {
      if (!(c.samples && c.samples[need])) problems.push(`${c.name}: missing sample "${need}"`);
    }
    for (const l of c.layouts || []) {
      if (l.satisfies !== c.name) problems.push(`${l.name}: satisfies "${l.satisfies}" but lives under "${c.name}"`);
      if (!LAYOUT_KINDS.includes(l.kind)) problems.push(`${l.name}: bad kind "${l.kind}"`);
      if (!/^layout-[a-z0-9-]+$/.test(l.name || '')) problems.push(`${l.name}: layout class must match layout-<slug>`);
      if (seenLayout.has(l.name)) problems.push(`duplicate layout name "${l.name}"`);
      seenLayout.add(l.name);
    }
  }
  return problems;
}

module.exports = { loadContracts, layoutClasses, layoutsFor, validateContracts, LAYOUT_KINDS };
