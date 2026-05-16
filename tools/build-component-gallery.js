#!/usr/bin/env node
/**
 * Generate `examples/component-gallery.md` — the canonical visual catalog
 * of every shipped component. One slide per component, ordered by
 * function family, with per-slide footer in the gallery.md style:
 *
 *   "<short descriptor> · <component-name>"
 *
 * The descriptor table below is curated for crispness (≤4 words);
 * fallback is the component name itself.
 *
 * The file is committed (like .vscode/lattice.code-snippets) so the
 * reviewer can flip through it without running anything. CI gate via
 * `npm run gallery:check` ensures it stays fresh relative to manifests.
 *
 * Usage:
 *   npm run gallery:components         # regenerate
 *   npm run gallery:components -- --check   # CI gate
 */

const fs = require('node:fs');
const path = require('node:path');
const { loadAll, FUNCTIONS, groupByFunction } = require('../lib/components');

const ROOT = path.join(__dirname, '..');
const OUTPUT = path.join(ROOT, 'examples', 'component-gallery.md');

// Crisp descriptors matching the gallery.md vocabulary. Keep ≤4 words —
// long descriptors get truncated by the slide footer's width budget.
const SHORT = Object.freeze({
  title: 'Title slide',
  closing: 'Closing slide',
  divider: 'Section break',
  subtopic: 'Sub-topic intro',
  'big-number': 'Single hero metric',
  quote: 'Pulled quotation',
  'split-panel': 'Featured panel + list',
  content: 'Single-idea prose',
  'cards-grid': '2-4 parallel cards',
  'cards-stack': 'Vertical card stack',
  'cards-side': 'Two cards side-by-side',
  'cards-wide': 'Three wide rows',
  list: 'Bullet list',
  'list-tabular': 'Hairline ledger',
  actors: 'Roster of actors',
  agenda: 'Numbered TOC',
  principles: 'Declared principles',
  tldr: 'Single-line takeaways',
  glossary: 'Term/definition table',
  checklist: 'State-marker items',
  'compare-prose': 'Two-prose comparison',
  'compare-code': 'Two-code comparison',
  'compare-table': 'Comparison table',
  'before-after': 'State change',
  'verdict-grid': 'Options vs criteria',
  decision: 'The verdict',
  'matrix-2x2': 'Static 2×2 quadrants',
  timeline: 'Ordered timeline',
  'list-steps': 'Step-by-step list',
  'list-criteria': 'Numbered criteria',
  roadmap: 'Phased roadmap grid',
  gantt: 'Gantt chart',
  kanban: 'Kanban board',
  stats: 'KPI numbers',
  kpi: 'Executive KPI grid',
  quadrant: '2×2 scatter chart',
  radar: 'Radar / spider chart',
  'word-cloud': 'Weighted word cloud',
  diagram: 'Mermaid diagram',
  code: 'Single code block',
  progress: 'Progress bars',
  'timeline-list': 'Date-stamped timeline',
  piechart: 'Pie / donut chart',
  image: 'Image + text slot',
  featured: 'Featured + sub-grid',
});

function buildDeck() {
  const manifests = loadAll();
  const groups = groupByFunction(manifests);

  const parts = [];
  parts.push(`---
marp: true
theme: indaco
paginate: true
header: "Lattice · Component Gallery"
---`);

  parts.push(`<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: "" -->
<!-- _footer: "Title slide · title" -->

# Lattice Component Gallery

\`${manifests.length} components · ${FUNCTIONS.length} function families\`

Every \`example.md\` in lib/components/, rendered.`);

  let sectionNum = 0;
  for (const fn of FUNCTIONS) {
    const items = groups[fn];
    if (!items.length) continue;
    sectionNum++;
    const num = String(sectionNum).padStart(2, '0');
    parts.push(`<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _header: "" -->
<!-- _footer: "Section break · divider" -->

\`Section ${num} · ${items.length} components\`

# ${fn[0].toUpperCase() + fn.slice(1)}`);
    for (const m of items) {
      const exPath = path.join(ROOT, 'lib', 'components', m.name, 'example.md');
      if (!fs.existsSync(exPath)) continue;
      let content = fs.readFileSync(exPath, 'utf8').trim();
      const label = SHORT[m.name] || m.name;
      const footer = `${label} · ${m.name}`;
      content = content.replace(
        /^<!-- _class: ([^>]*?) -->/,
        `<!-- _class: $1 -->\n<!-- _footer: "${footer}" -->`
      );
      parts.push(content);
    }
  }

  parts.push(`<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _header: "" -->
<!-- _footer: "Closing · closing" -->

# That is every component.

\`docs/design-system.md · lib/components/\``);

  return parts.join('\n\n---\n\n') + '\n';
}

function main(argv) {
  const fresh = buildDeck();
  if (argv.includes('--check')) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
    if (current === fresh) {
      process.stdout.write(`${OUTPUT} is up to date.\n`);
      return 0;
    }
    process.stderr.write(`error: ${OUTPUT} is stale.\n`);
    process.stderr.write('       Run `npm run gallery:components` to regenerate.\n');
    return 1;
  }
  fs.writeFileSync(OUTPUT, fresh);
  process.stdout.write(`wrote ${OUTPUT} (${fresh.split(/\n---\n/).length} slides estimated)\n`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { buildDeck, SHORT, OUTPUT };
