#!/usr/bin/env node
/**
 * Sync the GitHub issue labels to the committed taxonomy in
 * .github/labels.json — the area / type / priority / status vocabulary from
 * the kanban-light model (engineering/decisions/2026-06-14-github-project-management.md).
 * Labels-as-code: the JSON is the source of truth, this applies it via the
 * `gh` CLI (`gh label create --force` upserts), so labels can't drift from the
 * spec and a fresh repo bootstraps with one command.
 *
 * Self-owned on purpose (no marketplace action holding a write-scoped token).
 * The label workflow runs this on a push to main that touches the taxonomy;
 * locally, `npm run sync:labels` bootstraps a repo (needs `gh auth`).
 *
 * Usage:
 *   npm run sync:labels                 # apply .github/labels.json (needs gh)
 *   node tools/sync-labels.js --dry-run # print the gh commands, run nothing
 *   node tools/sync-labels.js --file path/to/labels.json
 *
 * Flags:
 *   --file <path>  Taxonomy JSON (default: .github/labels.json).
 *   --dry-run      Print the commands instead of executing them.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_FILE = path.join(ROOT, '.github', 'labels.json');

const HEX = /^[0-9a-fA-F]{6}$/;

/** Read + validate the taxonomy. Throws on a malformed or duplicate entry. */
function loadLabels(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) throw new Error('labels file must be a JSON array');
  const seen = new Set();
  for (const l of data) {
    if (!l || typeof l.name !== 'string' || !l.name) throw new Error(`label missing name: ${JSON.stringify(l)}`);
    if (seen.has(l.name)) throw new Error(`duplicate label: ${l.name}`);
    seen.add(l.name);
    if (typeof l.color !== 'string' || !HEX.test(l.color)) throw new Error(`label ${l.name}: color must be a 6-digit hex (no '#')`);
    if (l.description != null && typeof l.description !== 'string') throw new Error(`label ${l.name}: description must be a string`);
  }
  return data;
}

/** The `gh` argv for one label upsert (pure — the unit-test seam). */
function labelArgs(label) {
  return [
    'label', 'create', label.name,
    '--color', label.color,
    '--description', label.description || '',
    '--force', // update in place if it already exists
  ];
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const fileIdx = argv.indexOf('--file');
  const file = fileIdx !== -1 ? argv[fileIdx + 1] : DEFAULT_FILE;

  const labels = loadLabels(file);
  for (const label of labels) {
    const args = labelArgs(label);
    if (dryRun) {
      console.log(`gh ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
      continue;
    }
    execFileSync('gh', args, { stdio: 'inherit' });
  }
  if (!dryRun) console.log(`[sync-labels] applied ${labels.length} labels from ${path.relative(ROOT, file)}`);
}

if (require.main === module) main();

module.exports = { loadLabels, labelArgs, DEFAULT_FILE };
