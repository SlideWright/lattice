/**
 * Selector matching for tools/screenshot-slides.js.
 *
 * Pure logic extracted so the matching predicates can be unit-tested
 * without spinning up a headless browser. The browser side of the
 * caller is responsible for collecting the `meta` array (one entry per
 * <section> in the rendered HTML); this module decides which entries
 * the selector points at.
 *
 * Selector grammar:
 *   all                    every section
 *   <integer>              1-based index (returns [] if out of range)
 *   h2:<substring>         first section whose first <h2> contains substring
 *   class:<substring>      first section whose class attribute contains substring
 *   footer:<substring>     first section whose <footer> contains substring
 *   match:<substring>      first section where any of h2/class/footer matches
 *
 * Substring match is case-insensitive. First hit wins for the
 * substring forms; `all` returns every index in order; the integer
 * form returns at most one index.
 */

/**
 * Parse a selector string into its kind and value. Returns
 * `{ kind: 'invalid' }` when the syntax is not recognized — callers
 * should treat that as exit-code-2 territory (per CLI convention).
 */
function parseSelector(sel) {
  if (sel === 'all') return { kind: 'all' };
  if (/^\d+$/.test(sel)) return { kind: 'index', value: parseInt(sel, 10) };
  const m = sel.match(/^(h2|class|footer|match):(.+)$/i);
  if (!m) return { kind: 'invalid' };
  return { kind: m[1].toLowerCase(), value: m[2].toLowerCase() };
}

/**
 * Test whether a single section's metadata matches a parsed selector.
 * Always returns false for the meta-kinds `all`, `index`, `invalid`
 * (those are resolved via `resolve`, not predicate matching).
 */
function matchSection(meta, parsed) {
  const cls    = (meta.cls    || '').toLowerCase();
  const h2     = (meta.h2     || '').toLowerCase();
  const footer = (meta.footer || '').toLowerCase();
  const v = parsed.value;
  switch (parsed.kind) {
    case 'h2':     return h2.includes(v);
    case 'class':  return cls.includes(v);
    case 'footer': return footer.includes(v);
    case 'match':  return (h2 + ' ' + cls + ' ' + footer).includes(v);
    default: return false;
  }
}

/**
 * Resolve a selector against a list of section metas. Returns
 * `{ kind, indices, error?, parsed }`. Caller maps the result to
 * exit codes:
 *   indices.length > 0   → screenshot those, exit 0
 *   indices.length === 0 → exit 1 (no match)
 *   error === 'invalid'  → exit 2 (selector syntax)
 */
function resolveSelector(sel, sections) {
  const parsed = parseSelector(sel);
  if (parsed.kind === 'invalid') return { error: 'invalid', indices: [], parsed };
  if (parsed.kind === 'all') return { indices: sections.map((_, i) => i), parsed };
  if (parsed.kind === 'index') {
    const idx = parsed.value - 1;
    return (idx >= 0 && idx < sections.length)
      ? { indices: [idx], parsed }
      : { indices: [], parsed };
  }
  for (let i = 0; i < sections.length; i++) {
    if (matchSection(sections[i], parsed)) return { indices: [i], parsed };
  }
  return { indices: [], parsed };
}

module.exports = { parseSelector, matchSection, resolveSelector };
