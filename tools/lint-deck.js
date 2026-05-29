#!/usr/bin/env node
/**
 * Deck linter CLI — run the authoring footgun checks on a draft deck and
 * print structured, fix-oriented diagnostics. The author-facing companion
 * to the commit-time gate (test/unit/components/deck-authoring.test.js):
 * fast feedback while drafting, no Chromium render required.
 *
 * Usage:
 *   npm run lint:deck -- examples/my-deck.md          # one file
 *   npm run lint:deck -- 'examples/*.md'              # a glob (quote it)
 *   node tools/lint-deck.js examples/a.md examples/b.md
 *   node tools/lint-deck.js --strict examples/a.md    # warnings fail too
 *   node tools/lint-deck.js --json examples/a.md      # machine-readable
 *
 * Exit codes:
 *   0  clean (no errors; no warnings under --strict)
 *   1  one or more error-severity findings (or any finding under --strict)
 *   2  usage error (no files matched)
 */

const fs = require('node:fs');
const path = require('node:path');
const { lintText, buildVocab } = require('../lib/authoring/lint');

function expandArgs(patterns) {
  // Minimal glob: support a single `*` within a directory listing. Anything
  // without a `*` is taken literally. Keeps the tool dependency-free.
  const files = [];
  for (const pat of patterns) {
    if (!pat.includes('*')) { files.push(pat); continue; }
    const dir = path.dirname(pat);
    const base = path.basename(pat);
    const rx = new RegExp(`^${base.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (rx.test(name)) files.push(path.join(dir, name));
    }
  }
  return [...new Set(files)];
}

function main(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const patterns = argv.filter((a) => !a.startsWith('--'));
  const strict = flags.has('--strict');
  const asJson = flags.has('--json');

  const files = expandArgs(patterns).filter((f) => fs.existsSync(f));
  if (!files.length) {
    process.stderr.write('lint:deck — no files matched. Usage: npm run lint:deck -- <file.md> [more.md]\n');
    return 2;
  }

  // Build the catalog vocabulary once, reuse across all files.
  const vocab = buildVocab();
  const report = [];
  let errors = 0;
  let warnings = 0;

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const findings = lintText(source, { vocab });
    for (const f of findings) {
      if (f.severity === 'error') errors += 1;
      else warnings += 1;
      report.push({ file, ...f });
    }
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ files: files.length, errors, warnings, findings: report }, null, 2)}\n`);
    return errors > 0 || (strict && warnings > 0) ? 1 : 0;
  }

  if (!report.length) {
    process.stdout.write(`lint:deck — ${files.length} file(s) clean.\n`);
    return 0;
  }

  for (const f of report) {
    const mark = f.severity === 'error' ? '✗' : '⚠';
    process.stderr.write(`${mark} ${f.file} · slide ${f.slide} · ${f.rule} [${f.classToken}]\n`);
    process.stderr.write(`    ${f.message}\n`);
    if (f.line) process.stderr.write(`    at: ${f.line}\n`);
    process.stderr.write(`    fix: ${f.fix.replace(/\n/g, '\n    ')}\n\n`);
  }
  process.stderr.write(`lint:deck — ${errors} error(s), ${warnings} warning(s) across ${files.length} file(s).\n`);
  return errors > 0 || (strict && warnings > 0) ? 1 : 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { main, expandArgs };
