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

// Focus & highlighting directives (engineering/decisions/2026-06-16-focus-
// highlighting.md). Linted for grammar — a known axis and a well-formed ordinal
// target — so a typo (`rows 4`, `line abc`, `_focusStyle: glow`) is caught
// before render rather than silently no-op'ing.
const FOCUS_DIRECTIVE = /<!--\s*_focus:\s*([^>]+?)\s*-->/;
const FOCUS_STYLE_DIRECTIVE = /<!--\s*_focusStyle:\s*([^>]+?)\s*-->/;
const FOCUS_STEPS_DIRECTIVE = /<!--\s*_focusSteps:\s*([^>]+?)\s*-->/;
const FOCUS_AXES = new Set(['item', 'row', 'col', 'cell', 'line']);
const FOCUS_STYLES = new Set(['spotlight', 'ring', 'list-fill', 'blur', 'pop']);

// Returns an error string if `spec` (one `_focus` target list) is malformed,
// else null. `cell R,C` pairs are pulled out first (comma is the general target
// separator), then each remaining `<axis> <ordinal>` is checked.
function focusSpecError(spec) {
  if (!spec || !spec.trim()) return 'empty target';
  const rest = spec.replace(/\bcell\s+\d+\s*,\s*\d+/gi, '');
  if (/\bcell\b/i.test(rest)) return 'cell needs "R,C" (e.g. cell 4,5)';
  for (const part of rest.split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^([a-z]+)\s+(.+)$/i.exec(part);
    if (!m) return `'${part}' is not "<axis> <ordinal>"`;
    const axis = m[1].toLowerCase();
    if (!FOCUS_AXES.has(axis)) return `'${axis}' is not a focus axis (item, row, col, cell, line)`;
    if (!/^\d+(-\d+)?( +\d+(-\d+)?)*$/.test(m[2].trim())) return `'${m[2].trim()}' is not an ordinal or range`;
  }
  return null;
}

// Modifier token families recognized by prefix — the decoration / position /
// state vocabularies whose fragments (`at-tl`, `tint-corner`, `mark-orbit`,
// `with-period`, `no-footer`, `tone-pass`, `treatment-none`, `checks-tonal`)
// are too many to enumerate and not author-misspellable in a way worth flagging.
const MODIFIER_PREFIXES = ['tint-', 'mark-', 'with-', 'at-', 'no-', 'tone-', 'treatment-', 'checks-', 'fill-'];

// Deprecated `image` modifiers retained as back-compat aliases of the adaptive
// compositions (full→spotlight, contain/museum→gallery — see
// lib/core/image-aspect.js LEGACY_ALIASES). They still render, so a deck using
// them stays valid (and lint-clean) even though they're no longer featured
// `variants`. See engineering/decisions/2026-06-19-adaptive-image.md.
const DEPRECATED_CLASSES = Object.freeze(new Set(['full', 'contain', 'museum']));

/**
 * Card-style layouts where the li is a card with a bold title slot (font-weight
 * from the parent li) + optional body slot. For these, inline `- **Title.** body`
 * makes the body inherit the title's bold — the canonical shape is nested:
 *   - Title
 *     - body
 */
const CARD_STYLE_LAYOUTS = Object.freeze([
  'cards-grid', 'cards-stack',
  'compare-prose',
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
 * Ledger / numbered layouts whose body slot is authored as an ORDERED list
 * (`ol > li`) — the leading column is an auto counter and the canonical shape is
 *   1. Name
 *      - body
 * For these, the `- **Title.** body` UNORDERED inline-bold shape (what the coach
 * tends to emit) is doubly wrong: wrong list type AND the body inherits the
 * title bold. The fix is the numbered shape, not nested bullets. Derived from
 * each manifest's `ol > li` body-slot selector; kpi/stats also carry the
 * NUMBER_SLOT bodyless rule, q-and-a is excluded (it accepts ol OR ul).
 */
const LEDGER_OL_LAYOUTS = Object.freeze([
  'agenda', 'authority-chain', 'kpi', 'list-criteria', 'list-steps',
  'list-tabular', 'regulatory-update', 'stats', 'state-chart', 'timeline-list',
]);

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
 * Portrait/landscape support — the manifest `orientation` contract, mirrored
 * here for the fs-free lint (lint-core can't read the manifests). LANDSCAPE_ONLY
 * is the audited set of layouts whose `orientation` is `["landscape"]`;
 * PORTRAIT_ONLY would be `["portrait"]` (none ship yet). A test keeps these in
 * step with the manifests (test/unit/authoring/orientation-sync.test.js), so the
 * audit can't silently drift. See engineering/decisions/2026-06-16-orientation-in-the-form-model.md.
 */
const LANDSCAPE_ONLY_LAYOUTS = Object.freeze([
  // gantt, state-chart, journey, and roadmap all adapt to a tall box now (gantt:
  // CSS @container label-over-bars; state-chart: vertical default + lr→tb;
  // journey: a render-time vertical board; roadmap: the kernel auto-selects the
  // horizons card form and the cards stack) — see
  // 2026-06-19-chart-adaptive-sizing.md §10.
  'kanban', 'compare-code', 'redline',
]);
const PORTRAIT_ONLY_LAYOUTS = Object.freeze([]);
// Registered non-landscape `@size` names (the social/mobile presets + aspect
// aliases). A deck whose `size:` is one of these reads as portrait orientation.
const PORTRAIT_SIZES = Object.freeze([
  'square', 'portrait', 'story', 'mobile', 'reel', '1:1', '4:5', '9:16',
]);

/** Deck orientation from the `size:` front-matter directive ('portrait'|'landscape'). */
function deckOrientation(source) {
  const m = source.match(/^\s*size:\s*["']?([\w:/.-]+)/m);
  const size = m && m[1];
  return size && PORTRAIT_SIZES.includes(size) ? 'portrait' : 'landscape';
}

/**
 * Detect the inline `- **Title.** body` authoring pattern. Returns the first
 * offending line, or null. Body text after a strong on the same bullet.
 */
function findInlineTitleBodyLine(sample) {
  if (!sample) return null;
  for (const line of sample.split('\n')) {
    // Card-style layouts can carry an ordered OR unordered list (the ordered
    // form supplies a numbered badge), and the autobold-li rule bleeds bold
    // into the body for BOTH. Catch `- **Title.** body` and `1. **Title.** body`.
    if (/^(?:[-*]|\d+\.) \*\*[^*]+\*\*\.?\s+\S/.test(line)) return line;
  }
  return null;
}

/**
 * Detect the ORDERED-list flavour of the inline title+body footgun
 * (`1. **Title.** body`). Card-style layouts want an UNORDERED nested shape, so
 * an ordered list with a bold lead-in is wrong twice over (wrong list type +
 * the body inherits the title bold). Returns the first offending line, or null.
 */
function findOrderedInlineTitleBodyLine(sample) {
  if (!sample) return null;
  for (const line of sample.split('\n')) {
    if (/^\s*\d+\.\s+\*\*[^*]+\*\*[.:]?\s+\S/.test(line)) return line;
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

/**
 * Count a slide's PRIMARY collection along `axis` — the markdown-stage,
 * top-level approximation the capacity rule uses for instant feedback before
 * any render. Deliberately APPROXIMATE: it counts top-level list markers /
 * pipe-table rows / pipe-table columns / fenced-code lines from raw markdown,
 * so a deeply nested or HTML-authored collection it can't see returns 0 (no
 * warning) rather than a false positive. The render-exact count
 * (lib/core/collections.js on resolved HTML) is the authority; this is the live
 * tripwire. Returns an integer (0 = nothing countable found).
 */
function countPrimaryCollection(slide, axis) {
  if (!slide || !axis) return 0;
  // Code lines: the first fenced block's interior line count.
  if (axis === 'line') {
    const m = slide.match(/^[ \t]*```[^\n]*\n([\s\S]*?)\n[ \t]*```/m);
    return m ? m[1].split('\n').length : 0;
  }
  // Strip fenced code so list-/table-looking lines inside code don't count.
  const body = slide.replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, '');
  if (axis === 'item') {
    // Top-level list markers only — column 0, no leading indent; nested body
    // bullets are indented and excluded.
    let n = 0;
    for (const line of body.split('\n')) {
      if (/^(?:[-*]|\d+\.)\s+\S/.test(line)) n++;
    }
    return n;
  }
  if (axis === 'row' || axis === 'col') {
    const pipeRows = body.split('\n').filter((l) => /^\s*\|.*\|\s*$/.test(l));
    if (pipeRows.length < 2) return 0;
    if (axis === 'col') {
      const cells = pipeRows[0].trim().replace(/^\|/, '').replace(/\|$/, '').split('|');
      return cells.length;
    }
    // GFM: the separator is ALWAYS the second pipe row — test it positionally so
    // a data row of dash placeholders (`| n/a | - | - |`) is never mistaken for
    // the separator and under-counted.
    const sepIsSecond = /-/.test(pipeRows[1]) && /^\s*\|?[\s:|-]+\|?\s*$/.test(pipeRows[1]);
    return Math.max(0, pipeRows.length - 1 - (sepIsSecond ? 1 : 0));
  }
  return 0;
}

// The human noun for an axis, pluralized — `col` reads as "column(s)", not
// "col(s)". Used in capacity messages and the generated docs Capacity line.
const AXIS_NOUN = Object.freeze({ item: 'item', row: 'row', col: 'column', cell: 'cell', line: 'line' });
function axisNoun(axis, n) {
  const base = AXIS_NOUN[axis] || String(axis);
  return n === 1 ? base : `${base}s`;
}

/** The actionable fix string a capacity finding prints, from its `escalateTo`. */
function capacityFix(cap) {
  const all = Array.isArray(cap.escalateTo) ? cap.escalateTo.filter(Boolean) : [];
  // Separate sibling-component targets from the generic "split across slides"
  // phrase so the sentence reads cleanly regardless of how escalateTo mixes them.
  const comps = all.filter((t) => !/split/i.test(t));
  if (!comps.length) return 'Split the content across multiple slides.';
  return `Switch to ${comps.join(' / ')}, or split across slides.`;
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
  // finding.slide is the human 1-based number; the raw `---`-chunk that holds it
  // is `slide + fm - 1` (fm = front-matter chunks). Scope the fix to that chunk.
  const targetChunk = finding.slide + fmChunks(source) - 1;
  let chunk = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '---') { chunk++; continue; }
    if (chunk === targetChunk && lines[i].trim() === target) {
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
// Front matter occupies the first two `---`-split chunks (the empty pre-fence
// text + the YAML body) when the deck opens with a complete `---…---` block. A
// finding's `slide` is the HUMAN 1-based slide number with front matter
// excluded — matching the preview's "Slide N", the [slide N] edit markers, and
// the Reveal jump — so a raw chunk index maps to it via `idx - fmChunks + 1`.
const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/;
function fmChunks(source) {
  return FRONT_MATTER.test(String(source || '')) ? 2 : 0;
}

function findUnknownMapRegions(source, mapVocab) {
  if (!mapVocab) return [];
  const findings = [];
  const norm = (s) => String(s).toLowerCase().replace(/[.’']/g, '').replace(/\s+/g, ' ').trim();
  const slides = source.split(/^---$/m);
  const fm = fmChunks(source);
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
    // Only TOP-LEVEL bullets are region rows; a deeper-indented bullet is an
    // authored per-region detail sublist (the mark-detail feature) and must not
    // be checked as a region name. Mirror the kernel, which reads only top-level
    // <li>s. The region level is the shallowest bullet indent on the slide.
    const bulletLines = slide.split('\n')
      .map((raw) => ({ raw, m: raw.match(/^(\s*)[-*]\s+(.+)$/) }))
      .filter((x) => x.m);
    if (!bulletLines.length) return;
    const baseIndent = Math.min(...bulletLines.map((x) => x.m[1].length));
    for (const { raw, m: li } of bulletLines) {
      if (li[1].length > baseIndent) continue; // nested detail sublist — skip
      // Drop the trailing inline-code value (`48.2`) — the rest is the name.
      const name = li[2].replace(/`[^`]*`\s*$/, '').replace(/[*_]/g, '').trim();
      if (!name) continue;
      if (vocab.valid.has(norm(name))) continue;
      const suggestion = nearestRegion(name, vocab.names);
      findings.push({
        slide: idx - fm + 1,
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
 * HUMAN 1-based slide number (front matter excluded). This is the shared engine;
 * lib/authoring/lint.js builds the vocab from manifests, the browser passes one
 * precomputed at build time.
 */
function lintTextWith(source, vocab) {
  const findings = [];
  const cardStyle = new Set(CARD_STYLE_LAYOUTS);
  const ledgerOl = new Set(LEDGER_OL_LAYOUTS);
  const statementOl = new Set(STATEMENT_OL_LAYOUTS);
  const splitSlot = new Set(SPLIT_SLOT_LAYOUTS);
  const numberSlot = new Set(NUMBER_SLOT_LAYOUTS);
  // Split layouts whose left-panel anchor is an <h2> the transform extracts
  // (headline, or the split-panel `metric` hero number). The split-panel
  // `pullquote` variant is excluded — its anchor is a blockquote.
  const isH2AnchoredSplit = (tokens) =>
    (tokens.includes('split-panel') && !tokens.includes('pullquote')) ||
    tokens.includes('split-compare');
  // Split on slide separators (a line that is exactly `---`). The front-matter
  // chunks carry no `_class`, so they're skipped; `fm` rebases the chunk index
  // onto the human 1-based slide number authors and the preview see.
  const slides = source.split(/^---$/m);
  const fm = fmChunks(source);
  const orientation = deckOrientation(source);
  const landscapeOnly = new Set(LANDSCAPE_ONLY_LAYOUTS);
  const portraitOnly = new Set(PORTRAIT_ONLY_LAYOUTS);

  slides.forEach((slide, idx) => {
    const m = slide.match(CLASS_DIRECTIVE);
    if (!m) return;
    const tokens = m[1].split(/\s+/).filter(Boolean);

    // Rule — orientation mismatch. A portrait/mobile deck using a layout built
    // only for landscape (a horizontal-axis chart, a side-by-side diff), or a
    // landscape deck using a portrait-only layout, reads broken. The manifest
    // `orientation` array is the contract; this warns when the deck's @size
    // orientation isn't one the layout declares.
    for (const t of tokens) {
      if (orientation === 'portrait' && landscapeOnly.has(t)) {
        findings.push({
          slide: idx - fm + 1,
          rule: 'orientation-mismatch',
          severity: 'warning',
          classToken: t,
          line: m[0],
          message: `'${t}' is a landscape-only layout — it does not adapt to a portrait/mobile \`size:\`. Its content needs horizontal width.`,
          fix: `Use a portrait-friendly layout for social/mobile decks, or render this slide in a landscape \`size:\`. See dist/docs/components.json (\`orientation\`).`,
        });
      } else if (orientation === 'landscape' && portraitOnly.has(t)) {
        findings.push({
          slide: idx - fm + 1,
          rule: 'orientation-mismatch',
          severity: 'warning',
          classToken: t,
          line: m[0],
          message: `'${t}' is a portrait/social-only layout — it is not designed for a landscape \`size:\`.`,
          fix: `Use it in a portrait \`size:\` (square/portrait/story/mobile), or pick a landscape layout. See dist/docs/components.json (\`orientation\`).`,
        });
      }
    }

    // Rule 1 — unknown class/modifier tokens.
    for (const t of tokens) {
      if (vocab.names.has(t)) continue;
      if (isKnownModifier(t, vocab)) continue;
      if (DEPRECATED_CLASSES.has(t)) continue;
      findings.push({
        slide: idx - fm + 1,
        rule: 'unknown-class',
        severity: 'warning',
        classToken: t,
        line: m[0],
        message: `'${t}' is not a known component or modifier`,
        fix: 'Check the spelling against dist/docs/components.json (component names) or design/design-system.md §6.5 (modifiers).',
      });
    }

    // Rule — content capacity. Each layout declares the comfortable element
    // count for the axis it is built on (manifest `capacity`, injected via
    // vocab); pouring more in crowds or overflows the slide. Approximate,
    // markdown-stage count → advisory warning with an escalateTo fix. Gated on
    // injected capacity data so a deck pays nothing when it's absent. See
    // engineering/decisions/2026-06-17-content-capacity-contract.md.
    if (vocab.capacity) {
      for (const t of tokens) {
        const cap = vocab.capacity[t];
        if (!cap) continue;
        const n = countPrimaryCollection(slide, cap.axis);
        if (!n) break; // nothing countable — don't guess
        const comfort = cap.sweet != null ? cap.sweet : cap.soft;
        if (cap.hard != null && n > cap.hard) {
          findings.push({
            slide: idx - fm + 1,
            rule: 'capacity-overflow',
            severity: 'warning',
            classToken: t,
            line: m[0],
            message: `'${t}' holds about ${comfort} ${axisNoun(cap.axis, comfort)} comfortably (max ~${cap.hard}); this slide has ${n} — it will overflow` + (cap.note ? ` (${cap.note})` : ''),
            fix: capacityFix(cap),
          });
        } else if (cap.soft != null && n > cap.soft) {
          findings.push({
            slide: idx - fm + 1,
            rule: 'capacity-crowd',
            severity: 'warning',
            classToken: t,
            line: m[0],
            message: `'${t}' reads best with ${comfort} or fewer ${axisNoun(cap.axis, comfort)}; this slide has ${n} — past ${cap.soft} it begins to crowd`,
            fix: capacityFix(cap),
          });
        }
        break; // one capacity check per slide (the layout token)
      }
    }

    // Rule 2 — card-style inline title+body (unordered OR ordered). Card-style
    // layouts want the unordered nested shape; an ordered `1. **Title.** body`
    // is wrong twice over (wrong list type + the body inherits the title bold).
    if (tokens.some((t) => cardStyle.has(t))) {
      const offending = findInlineTitleBodyLine(slide) || findOrderedInlineTitleBodyLine(slide);
      if (offending) {
        findings.push({
          slide: idx - fm + 1,
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

    // Rule 2b — ledger / numbered layouts authored as an UNORDERED inline-bold
    // list. These want the numbered ledger shape (`1. Name` / `   - body`); the
    // `- **Title.** body` shape is wrong list type AND inherits the title bold.
    if (tokens.some((t) => ledgerOl.has(t))) {
      const offending = findInlineTitleBodyLine(slide);
      if (offending) {
        findings.push({
          slide: idx - fm + 1,
          rule: 'ledger-inline-title',
          severity: 'error',
          classToken: tokens.find((t) => ledgerOl.has(t)),
          line: offending.trim(),
          message: 'inline "- **Title.** body" on a ledger/numbered slide — this layout wants an ordered (numbered) list, not an unordered bold lead-in',
          fix: 'Use the numbered ledger shape:\n    1. Name\n       - body text',
        });
      }
    }

    // Rule 3 — bold inside an ordered-list statement.
    if (tokens.some((t) => statementOl.has(t))) {
      const offending = findBoldOrderedStatement(slide);
      if (offending) {
        findings.push({
          slide: idx - fm + 1,
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
          slide: idx - fm + 1,
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
        slide: idx - fm + 1,
        rule: 'split-missing-headline',
        severity: 'warning',
        classToken: cls,
        line: m[0],
        message: `'${cls}' has no '## ' headline — the transform lifts the <h2> into the left panel, so the headline${isMetric ? ' / hero number' : ''} renders empty`,
        fix: isMetric
          ? 'Add the hero number as an h2: `## 114<em>%</em>` (wrap the unit in `<em>` to style it smaller; plain `*%*` is not CommonMark emphasis next to a digit).'
          : 'Add a `## Headline` line for the left panel.',
      });
    }

    // Rule 6 — split-panel `pullquote` variant with no blockquote pull-quote.
    if (tokens.includes('split-panel') && tokens.includes('pullquote') && !/^>\s/m.test(slide)) {
      findings.push({
        slide: idx - fm + 1,
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
          slide: idx - fm + 1,
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
          slide: idx - fm + 1,
          rule: 'number-slot-bodyless-item',
          severity: 'warning',
          classToken: tokens.find((t) => numberSlot.has(t)),
          line: offending.trim(),
          message: 'a kpi/stats item with no nested label — the number won\'t render in display type (the lift needs a nested body to fire)',
          fix: 'Use the nested shape:\n    1. 73%\n       - faster close',
        });
      }
    }

    // Rule 11 — focus directive grammar. A malformed `_focus` / `_focusStyle` /
    // `_focusSteps` silently no-ops at render, so flag the typo here.
    const fd = slide.match(FOCUS_DIRECTIVE);
    if (fd) {
      const err = focusSpecError(fd[1]);
      if (err) {
        findings.push({
          slide: idx - fm + 1,
          rule: 'focus-spec',
          severity: 'warning',
          line: fd[0],
          message: `_focus ${err}`,
          fix: '_focus: <axis> <ordinal> — e.g. row 4, item 3, col 5, cell 4,5, line 3-4.',
        });
      }
    }
    const fs = slide.match(FOCUS_STYLE_DIRECTIVE);
    if (fs && !FOCUS_STYLES.has(fs[1].trim())) {
      findings.push({
        slide: idx - fm + 1,
        rule: 'focus-style',
        severity: 'warning',
        line: fs[0],
        message: `_focusStyle '${fs[1].trim()}' is not spotlight | ring | list-fill`,
        fix: 'Use one of: spotlight, ring, list-fill (or omit for the content-aware default).',
      });
    }
    const fsteps = slide.match(FOCUS_STEPS_DIRECTIVE);
    if (fsteps) {
      for (const step of fsteps[1].split('|').map((s) => s.trim()).filter(Boolean)) {
        const err = focusSpecError(step);
        if (err) {
          findings.push({
            slide: idx - fm + 1,
            rule: 'focus-steps',
            severity: 'warning',
            line: fsteps[0],
            message: `_focusSteps step '${step}': ${err}`,
            fix: 'Each step is a _focus spec — e.g. row 1 | row 2 | row 3.',
          });
          break;
        }
      }
    }
  });

  // Rule 9 — map list items the basemap can't resolve (with a "did you mean").
  // Gated on injected map vocab so non-map decks pay nothing.
  if (vocab.mapRegions) findings.push(...findUnknownMapRegions(source, vocab.mapRegions));

  // Rule 10 — unrecognized deck-wide `finish:` register value. `finish:` is a
  // Lattice front-matter extension (boardroom / sketch / sketch-clean); an
  // unknown value resolves to no classes and silently renders the boardroom
  // baseline, so a typo (`finish: sketchh`) would ship a non-sketch deck with
  // no error. Flag it. Gated on injected finish vocab so it costs nothing when
  // the names aren't supplied (e.g. an older browser-build handoff).
  if (vocab.finishNames) findings.push(...findUnknownFinish(source, vocab.finishNames));

  // Rule 11 — unrecognized deck-wide `split:` mode value. `split:` is a Lattice
  // front-matter extension (rule / headings); an unknown value resolves to the
  // `rule` baseline, so a typo (`split: heading`) would silently keep requiring
  // `---` separators. Flag it. Gated on injected split vocab, like finish above.
  if (vocab.splitNames) findings.push(...findUnknownSplit(source, vocab.splitNames));

  return findings;
}

/**
 * Front-matter `finish:` register validation. Reads the value from the leading
 * `---`-fenced front-matter block only (not body code spans), and returns a
 * single warning finding when it isn't one of the known register names. The
 * canonical name list is injected (lib/core/resolve-finish.js `FINISH_NAMES`),
 * keeping this core free of any require.
 */
function findUnknownFinish(source, finishNames) {
  const fmBlock = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fmBlock) return [];
  const fmFinish = fmBlock[1].match(/^\s*finish:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m);
  if (!fmFinish) return [];
  const value = fmFinish[1].trim();
  const known = new Set([...finishNames].map((n) => String(n).toLowerCase()));
  if (known.has(value.toLowerCase())) return [];
  return [{
    slide: 0,
    rule: 'unknown-finish',
    severity: 'warning',
    classToken: value,
    line: fmFinish[0].trim(),
    message: `'${value}' is not a known finish register — the deck would silently render the boardroom baseline`,
    fix: `Set front-matter \`finish:\` to one of: ${[...finishNames].join(', ')}.`,
  }];
}

/**
 * Front-matter `split:` mode validation. Mirrors findUnknownFinish: reads the
 * value from the leading `---`-fenced block only and warns when it isn't a known
 * mode, so a typo (`split: heading`) surfaces instead of silently falling back
 * to the `rule` baseline. The canonical name list is injected
 * (lib/core/resolve-split.js `SPLIT_NAMES`), keeping this core require-free.
 */
function findUnknownSplit(source, splitNames) {
  const fmBlock = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!fmBlock) return [];
  const fmSplit = fmBlock[1].match(/^\s*split:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m);
  if (!fmSplit) return [];
  const value = fmSplit[1].trim();
  const known = new Set([...splitNames].map((n) => String(n).toLowerCase()));
  if (known.has(value.toLowerCase())) return [];
  return [{
    slide: 0,
    rule: 'unknown-split',
    severity: 'warning',
    classToken: value,
    line: fmSplit[0].trim(),
    message: `'${value}' is not a known split mode — the deck would silently fall back to 'rule' (split on ---)`,
    fix: `Set front-matter \`split:\` to one of: ${[...splitNames].join(', ')}.`,
  }];
}

module.exports = {
  CLASS_DIRECTIVE,
  MODIFIER_PREFIXES,
  FOCUS_AXES,
  FOCUS_STYLES,
  CARD_STYLE_LAYOUTS,
  LEDGER_OL_LAYOUTS,
  STATEMENT_OL_LAYOUTS,
  SPLIT_SLOT_LAYOUTS,
  NUMBER_SLOT_LAYOUTS,
  LANDSCAPE_ONLY_LAYOUTS,
  PORTRAIT_ONLY_LAYOUTS,
  deckOrientation,
  findInlineTitleBodyLine,
  findOrderedInlineTitleBodyLine,
  findBoldOrderedStatement,
  findSplitBodylessItem,
  countPrimaryCollection,
  axisNoun,
  capacityFix,
  findUnknownMapRegions,
  findUnknownFinish,
  nearestRegion,
  editDistance,
  isKnownModifier,
  autofixNestedTitle,
  applyFix,
  lintTextWith,
};
