/**
 * Pure, dependency-free lint core — the SINGLE SOURCE of the deck-authoring
 * footgun checks, shared by:
 *   - the Node linter (lib/authoring/lint.js → tools/lint-deck.js, the CLI),
 *   - lib/components/index.js's validate() (which re-exports the constants +
 *     detectors from here), and
 *   - the browser (the Drawing Board's Architect panel).
 *
 * It has NO `fs` and NO `require` of lib/components, so it bundles cleanly for
 * the browser. The name/modifier VOCABULARY (which component names + modifier
 * tokens exist) is data, not logic, so it is injected: the Node linter builds it
 * from the live manifests; the browser passes a vocab precomputed at
 * docs-build time. `lintTextWith(source, vocab)` is the shared engine both call.
 */

const CLASS_DIRECTIVE = /<!--\s*_class:\s*([^>]+?)\s*-->/;

// Modifier token families recognized by prefix — the decoration / position /
// state vocabularies whose fragments (`at-tl`, `tint-corner`, `mark-orbit`,
// `with-period`, `no-footer`, `tone-pass`, `treatment-none`, `checks-tonal`)
// are too many to enumerate and not author-misspellable in a way worth flagging.
const MODIFIER_PREFIXES = ['tint-', 'mark-', 'with-', 'at-', 'no-', 'tone-', 'treatment-', 'checks-'];

/**
 * Card-style layouts where the li is a card with a bold title slot (font-weight
 * from the parent li) + optional body slot. For these, inline `- **Title.** body`
 * makes the body inherit the title's bold — the canonical shape is nested:
 *   - Title
 *     - body
 */
const CARD_STYLE_LAYOUTS = Object.freeze([
  'cards-grid', 'cards-stack',
  'featured', 'compare-prose',
  'matrix-2x2', 'verdict-grid', 'decision', 'citation-card',
  'pricing', 'q-and-a',
]);

/**
 * Layouts whose ordered-list items render as counter | statement grid rows. A
 * `<strong>` span inside the statement splits the row, so these require PLAIN
 * ordered-list statements (the layout already sets display weight).
 */
const STATEMENT_OL_LAYOUTS = Object.freeze(['principles']);

/**
 * Panel-split layouts whose right-panel items are "title + nested body" slots.
 * slotLabelLift only bolds the title when a nested body delimits it, so a
 * bodyless item renders as flat text. Contract is the nested shape.
 * (split-panel right-panel items follow the nested-body contract.)
 */
const SPLIT_SLOT_LAYOUTS = Object.freeze([
  'split-panel', 'split-compare',
]);

/**
 * Number-slot layouts whose items are "big number + nested label". Same
 * nested-body requirement as SPLIT_SLOT_LAYOUTS (reuses findSplitBodylessItem —
 * the detector is shape-generic).
 */
const NUMBER_SLOT_LAYOUTS = Object.freeze(['kpi', 'stats']);

/**
 * Detect the inline `- **Title.** body` authoring pattern. Returns the first
 * offending line, or null. Body text after a strong on the same bullet.
 */
function findInlineTitleBodyLine(sample) {
  if (!sample) return null;
  for (const line of sample.split('\n')) {
    if (/^[-*] \*\*[^*]+\*\*\.?\s+\S/.test(line)) return line;
  }
  return null;
}

/**
 * Detect a `**bold**` span inside an ordered-list item (`1. … **x** …`).
 * Returns the first offending line, or null.
 */
function findBoldOrderedStatement(sample) {
  if (!sample) return null;
  for (const line of sample.split('\n')) {
    if (/^\s*\d+\.\s+.*\*\*/.test(line)) return line;
  }
  return null;
}

/**
 * Detect a top-level list item with NO nested child bullet on a split-slot
 * slide. Returns the first offending line, or null. Catches both the inline
 * `- Title. body` and the bare `- Title` shapes — neither gets lifted.
 */
function findSplitBodylessItem(sample) {
  if (!sample) return null;
  const lines = sample.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^([-*]|\d+\.)\s+\S/.test(lines[i])) continue;
    let j = i + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    const next = lines[j] || '';
    if (!/^\s+([-*]|\d+\.)\s+\S/.test(next)) return lines[i];
  }
  return null;
}

/** True if `token` is a recognized modifier (set membership or prefix family). */
function isKnownModifier(token, vocab) {
  if (vocab.modifiers.has(token)) return true;
  return MODIFIER_PREFIXES.some((p) => token.startsWith(p));
}

/**
 * Convert the bold card-style inline shape `- **Title.** body` to the canonical
 * nested form:
 *   - Title
 *     - body
 * Returns the replacement (two lines), or null if the line is not this exact,
 * deterministic shape. Bare titles (`- Title`) and ambiguous non-bold inline
 * splits are intentionally NOT auto-fixed — there is no safe, unique split — so
 * those findings keep their `fix` guidance instead. Pure; shared by the Node
 * path and the Drawing Board's "Apply fix" quick action.
 */
function autofixNestedTitle(line) {
  if (!line) return null;
  const m = line.match(/^(\s*)([-*])\s+\*\*(.+?)\*\*\.?\s+(\S.*?)\s*$/);
  if (!m) return null;
  const [, indent, bullet, title, body] = m;
  // Strip a trailing sentence punctuation from the title (`**Title.**` → Title).
  const cleanTitle = title.trim().replace(/[.:!?]+$/, '');
  return `${indent}${bullet} ${cleanTitle}\n${indent}  ${bullet} ${body.trim()}`;
}

/**
 * Apply an auto-fixable finding to `source`, returning the new source — or null
 * if it can't be applied cleanly (not an auto-fixable shape, or the line can't
 * be located in the finding's slide). Scoped to the finding's `---`-chunk so an
 * identical line on another slide isn't touched.
 */
function applyFix(source, finding) {
  if (!finding || finding.line == null) return null;
  const repl = autofixNestedTitle(finding.line);
  if (repl == null) return null;
  const lines = source.split('\n');
  const target = finding.line.trim();
  let chunk = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '---') { chunk++; continue; }
    if (chunk === finding.slide && lines[i].trim() === target) {
      return lines.slice(0, i).concat(repl.split('\n'), lines.slice(i + 1)).join('\n');
    }
  }
  return null;
}

// Bounded Levenshtein edit distance — returns the distance, or `max + 1` as
// soon as it provably exceeds `max` (so a far-off candidate bails cheap). Pure,
// used only for the map "did you mean" suggestion.
function editDistance(a, b, max) {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > max) return max + 1;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// Nearest valid region/group name to an unresolved one, or null if nothing is
// close enough. Threshold scales gently with length (a one-word typo, not a
// different country). `candidates` is the list of canonical display names.
function nearestRegion(name, candidates) {
  const q = name.toLowerCase();
  const max = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3;
  let best = null, bestD = max + 1;
  for (const c of candidates) {
    const d = editDistance(q, c.toLowerCase(), max);
    if (d < bestD) { bestD = d; best = c; if (d === 0) break; }
  }
  return bestD <= max ? best : null;
}

/**
 * Find list items in `map` slides whose lead name the basemap can't resolve —
 * the spelling-variance footgun world maps live with (`Cote dIvore`, `Brasil`).
 * `mapVocab` is injected data: `{ us: {valid:Set<normalized>, names:[…]},
 * world: {…} }`, where `valid` holds every normalized name/alias/group and
 * `names` the canonical labels to suggest from. Returns findings with a
 * deterministic "did you mean" — no model call, the whole point of doing it
 * here. Pure; shared by the CLI and the Drawing Board.
 */
function findUnknownMapRegions(source, mapVocab) {
  if (!mapVocab) return [];
  const findings = [];
  const norm = (s) => String(s).toLowerCase().replace(/[.’']/g, '').replace(/\s+/g, ' ').trim();
  const slides = source.split(/^---$/m);
  slides.forEach((slide, idx) => {
    const m = slide.match(CLASS_DIRECTIVE);
    if (!m) return;
    const tokens = m[1].split(/\s+/).filter(Boolean);
    if (!tokens.includes('map')) return;
    // Mirror pickBasemap: `us` / `usa` select the US states; otherwise the
    // world map is the default (bare `map` is a world map).
    const which = tokens.includes('us') || tokens.includes('usa') ? 'us' : 'world';
    const vocab = mapVocab[which];
    if (!vocab) return;
    for (const raw of slide.split('\n')) {
      const li = raw.match(/^\s*[-*]\s+(.+)$/);
      if (!li) continue;
      // Drop the trailing inline-code value (`48.2`) — the rest is the name.
      const name = li[1].replace(/`[^`]*`\s*$/, '').replace(/[*_]/g, '').trim();
      if (!name) continue;
      if (vocab.valid.has(norm(name))) continue;
      const suggestion = nearestRegion(name, vocab.names);
      findings.push({
        slide: idx,
        rule: 'unknown-map-region',
        severity: 'warning',
        classToken: 'map',
        line: raw.trim(),
        message: `'${name}' is not a ${which === 'world' ? 'country' : 'state'} the ${which} basemap recognises` +
          (suggestion ? ` — did you mean '${suggestion}'?` : ''),
        fix: suggestion
          ? `Use '${suggestion}' (full name, code, or a known alias all resolve).`
          : `Check the name against the ${which} basemap — full name, code, or a known alias.`,
      });
    }
  });
  return findings;
}

/**
 * Lint deck source against an injected vocabulary. Returns an array of findings:
 *   { slide, rule, severity, classToken, line, message, fix }
 * `vocab` is `{ names: Set<string>, modifiers: Set<string> }`. `slide` is the
 * 1-based slide index (front matter is slide 0 and skipped). This is the shared
 * engine; lib/authoring/lint.js builds the vocab from manifests, the browser
 * passes one precomputed at build time.
 */
function lintTextWith(source, vocab) {
  const findings = [];
  const cardStyle = new Set(CARD_STYLE_LAYOUTS);
  const statementOl = new Set(STATEMENT_OL_LAYOUTS);
  const splitSlot = new Set(SPLIT_SLOT_LAYOUTS);
  const numberSlot = new Set(NUMBER_SLOT_LAYOUTS);
  // Split layouts whose left-panel anchor is an <h2> the transform extracts
  // (headline, or the split-panel `metric` hero number). The split-panel
  // `pullquote` variant is excluded — its anchor is a blockquote.
  const isH2AnchoredSplit = (tokens) =>
    (tokens.includes('split-panel') && !tokens.includes('pullquote')) ||
    tokens.includes('split-compare');
  // Split on slide separators (a line that is exactly `---`). The first chunk is
  // the YAML front matter; it carries no `_class` and is skipped.
  const slides = source.split(/^---$/m);

  slides.forEach((slide, idx) => {
    const m = slide.match(CLASS_DIRECTIVE);
    if (!m) return;
    const tokens = m[1].split(/\s+/).filter(Boolean);

    // Rule 1 — unknown class/modifier tokens.
    for (const t of tokens) {
      if (vocab.names.has(t)) continue;
      if (isKnownModifier(t, vocab)) continue;
      findings.push({
        slide: idx,
        rule: 'unknown-class',
        severity: 'warning',
        classToken: t,
        line: m[0],
        message: `'${t}' is not a known component or modifier`,
        fix: 'Check the spelling against dist/docs/components.json (component names) or design/design-system.md §6.5 (modifiers).',
      });
    }

    // Rule 2 — card-style inline title+body.
    if (tokens.some((t) => cardStyle.has(t))) {
      const offending = findInlineTitleBodyLine(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'card-style-inline-title',
          severity: 'error',
          classToken: tokens.find((t) => cardStyle.has(t)),
          line: offending.trim(),
          autofixable: !!autofixNestedTitle(offending),
          message: 'inline "- **Title.** body" on a card-style slide — the body inherits the parent li bold',
          fix: 'Use the nested-list shape:\n    - Title\n      - body text',
        });
      }
    }

    // Rule 3 — bold inside an ordered-list statement.
    if (tokens.some((t) => statementOl.has(t))) {
      const offending = findBoldOrderedStatement(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'statement-ol-bold',
          severity: 'error',
          classToken: tokens.find((t) => statementOl.has(t)),
          line: offending.trim(),
          message: 'a **bold** span inside an ordered-list statement splits the counter grid row',
          fix: 'Use a plain declarative statement (the layout already sets display weight).',
        });
      }
    }

    // Rule 4 — split right-panel item with no nested body.
    if (tokens.some((t) => splitSlot.has(t))) {
      const offending = findSplitBodylessItem(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'split-bodyless-item',
          severity: 'error',
          classToken: tokens.find((t) => splitSlot.has(t)),
          line: offending.trim(),
          autofixable: !!autofixNestedTitle(offending),
          message: 'a right-panel item with no nested body on a split slide — the title won\'t render bold (slotLabelLift needs a nested body to lift)',
          fix: 'Use the nested-list shape:\n    - Title\n      - body text',
        });
      }
    }

    // Rule 5 — h2-anchored split slide with no `## ` headline.
    if (isH2AnchoredSplit(tokens) && !/^##\s/m.test(slide)) {
      const isMetric = tokens.includes('metric');
      const cls = tokens.find((t) => t === 'split-panel' || t === 'split-compare');
      findings.push({
        slide: idx,
        rule: 'split-missing-headline',
        severity: 'warning',
        classToken: cls,
        line: m[0],
        message: `'${cls}' has no '## ' headline — the transform lifts the <h2> into the left panel, so the headline${isMetric ? ' / hero number' : ''} renders empty`,
        fix: isMetric
          ? 'Add the hero number as an h2: `## 114*%*` (the `*…*` styles the unit).'
          : 'Add a `## Headline` line for the left panel.',
      });
    }

    // Rule 6 — split-panel `pullquote` variant with no blockquote pull-quote.
    if (tokens.includes('split-panel') && tokens.includes('pullquote') && !/^>\s/m.test(slide)) {
      findings.push({
        slide: idx,
        rule: 'split-statement-missing-quote',
        severity: 'warning',
        classToken: 'split-panel',
        line: m[0],
        message: 'split-panel `pullquote` has no `> ` blockquote — the left panel\'s pull-quote (the variant\'s whole point) renders empty',
        fix: 'Add the quotation as a blockquote: `> The quote worth half the slide.`',
      });
    }

    // Rule 7 — split-compare option count must be exactly two.
    if (tokens.includes('split-compare')) {
      const opts = slide.split('\n').filter((l) => /^([-*]|\d+\.)\s+\S/.test(l)).length;
      if (opts !== 2) {
        findings.push({
          slide: idx,
          rule: 'split-compare-option-count',
          severity: 'warning',
          classToken: 'split-compare',
          line: m[0],
          message: `split-compare expects exactly two options; found ${opts}. The layout always highlights the 2nd option as 'preferred' and assumes a two-up`,
          fix: 'Use exactly two top-level list items; the 2nd renders as the preferred/chosen option.',
        });
      }
    }

    // Rule 8 — kpi/stats number item with no nested label/detail.
    if (tokens.some((t) => numberSlot.has(t))) {
      const offending = findSplitBodylessItem(slide);
      if (offending) {
        findings.push({
          slide: idx,
          rule: 'number-slot-bodyless-item',
          severity: 'warning',
          classToken: tokens.find((t) => numberSlot.has(t)),
          line: offending.trim(),
          message: 'a kpi/stats item with no nested label — the number won\'t render in display type (the lift needs a nested body to fire)',
          fix: 'Use the nested shape:\n    1. 73%\n       - faster close',
        });
      }
    }
  });

  // Rule 9 — map list items the basemap can't resolve (with a "did you mean").
  // Gated on injected map vocab so non-map decks pay nothing.
  if (vocab.mapRegions) findings.push(...findUnknownMapRegions(source, vocab.mapRegions));

  return findings;
}

module.exports = {
  CLASS_DIRECTIVE,
  MODIFIER_PREFIXES,
  CARD_STYLE_LAYOUTS,
  STATEMENT_OL_LAYOUTS,
  SPLIT_SLOT_LAYOUTS,
  NUMBER_SLOT_LAYOUTS,
  findInlineTitleBodyLine,
  findBoldOrderedStatement,
  findSplitBodylessItem,
  findUnknownMapRegions,
  nearestRegion,
  editDistance,
  isKnownModifier,
  autofixNestedTitle,
  applyFix,
  lintTextWith,
};
