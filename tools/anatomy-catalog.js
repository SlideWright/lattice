#!/usr/bin/env node
/**
 * Shared anatomy-catalog loader.
 *
 * The component anatomy diagrams are authored once in tools/ascii-preview.py
 * (the canonical ASCII geometry system). Several consumers need to resolve a
 * manifest's `anatomyBlock` id into the rendered ASCII block:
 *
 *   - tools/build-docs-portal.js  — the components.md reference
 *   - docs/src/components/ComponentDocs.astro — the per-component doc page
 *
 * Keeping the loader here (instead of inlined in each consumer) is what lets
 * the docs site render the SAME anatomy block the Markdown reference does,
 * from the SAME source, with no drift. The catalog is built once per process
 * and memoised.
 */

const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ASCII_TOOL = path.join(__dirname, 'ascii-preview.py');

let _catalog = null;

/** Build (once) and return the full {blockId -> asciiText} catalog. */
function loadAnatomyCatalog() {
  if (_catalog) return _catalog;
  const out = execFileSync('python3', [ASCII_TOOL, 'build'], { encoding: 'utf8' });
  const catalog = Object.create(null);
  let currentId = null;
  let currentLines = [];
  for (const line of out.split('\n')) {
    const m = line.match(/^=== (\S+) ===$/);
    if (m) {
      if (currentId) catalog[currentId] = currentLines.join('\n').replace(/\n+$/, '');
      currentId = m[1];
      currentLines = [];
    } else if (currentId) {
      currentLines.push(line);
    }
  }
  if (currentId) catalog[currentId] = currentLines.join('\n').replace(/\n+$/, '');
  _catalog = catalog;
  return catalog;
}

/** Resolve one anatomy block id, throwing a helpful error if it's unknown. */
function resolveAnatomy(blockId) {
  const catalog = loadAnatomyCatalog();
  const block = catalog[blockId];
  if (!block) {
    const known = Object.keys(catalog).sort().join(', ');
    throw new Error(
      `anatomyBlock "${blockId}" not found in tools/ascii-preview.py catalog. Known IDs: ${known}`,
    );
  }
  return block;
}

module.exports = { loadAnatomyCatalog, resolveAnatomy };
