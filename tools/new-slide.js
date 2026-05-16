#!/usr/bin/env node
/**
 * Slide-skeleton scaffolder.
 *
 * Reads `lib/components/<name>.json` manifests and emits the canonical
 * markdown skeleton for any layout — copy-paste straight into a deck.
 *
 *   node tools/new-slide.js cards-grid       # emit skeleton to stdout
 *   node tools/new-slide.js cards-grid > s.md
 *   node tools/new-slide.js --list           # catalog grouped by function
 *   node tools/new-slide.js --help           # usage
 *
 * npm script: `npm run new:slide -- <name>` (the `--` separates npm's
 * own argv from script args).
 *
 * Exit codes:
 *   0  success — skeleton or list printed
 *   1  unknown component name
 *   2  usage error (missing arg, unknown flag)
 *
 * See docs/design-system.md §7 for the discovery model.
 */



const { loadAll, groupByFunction, FUNCTIONS } = require('../lib/components');

function usage(stream) {
  const out = stream || process.stderr;
  out.write([
    'Usage:',
    '  node tools/new-slide.js <component-name>   emit skeleton to stdout',
    '  node tools/new-slide.js --list             list all components by function',
    '  node tools/new-slide.js --help             show this message',
    '',
    'Try `node tools/new-slide.js --list` to see what is available.',
    '',
  ].join('\n'));
}

function listAll() {
  const manifests = loadAll();
  const groups = groupByFunction(manifests);
  const lines = [];
  lines.push(`Lattice components — ${manifests.length} layouts across ${FUNCTIONS.length} function families.\n`);
  for (const fn of FUNCTIONS) {
    const items = groups[fn];
    if (!items.length) continue;
    lines.push(`${fn.toUpperCase()}`);
    const widest = Math.max(...items.map((m) => m.name.length));
    for (const m of items) {
      lines.push(`  ${m.name.padEnd(widest)}  ${m.description}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function emitSkeleton(name) {
  const manifests = loadAll();
  const match = manifests.find((m) => m.name === name);
  if (!match) {
    const similar = manifests
      .map((m) => m.name)
      .filter((n) => n.includes(name) || name.includes(n))
      .slice(0, 5);
    let msg = `error: unknown component "${name}"\n`;
    if (similar.length) {
      msg += `did you mean: ${similar.join(', ')}?\n`;
    } else {
      msg += 'try `node tools/new-slide.js --list` to see what is available.\n';
    }
    process.stderr.write(msg);
    return 1;
  }
  process.stdout.write(match.skeleton);
  if (!match.skeleton.endsWith('\n')) process.stdout.write('\n');
  return 0;
}

function main(argv) {
  if (argv.length === 0) {
    usage();
    return 2;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    usage(process.stdout);
    return 0;
  }
  if (argv.includes('--list')) {
    process.stdout.write(listAll());
    return 0;
  }
  if (argv.length > 1) {
    process.stderr.write(`error: expected one component name, got ${argv.length}\n`);
    usage();
    return 2;
  }
  const arg = argv[0];
  if (arg.startsWith('-')) {
    process.stderr.write(`error: unknown flag ${arg}\n`);
    usage();
    return 2;
  }
  return emitSkeleton(arg);
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

module.exports = { main, listAll, emitSkeleton };
