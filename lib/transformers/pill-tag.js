/**
 * Pill-tag — disambiguate the universal trailing-`code` pill.
 *
 * The universal pill rule (base.modifiers.css) promotes a trailing inline
 * `<code>` on a list row to a metadata pill. Two shapes qualify:
 *
 *   - `<code>` is the literal LAST child of the `<li>`  → handled in CSS by
 *     `:last-child` (precise; no transform needed).
 *   - `<code>` is the last inline of the title line, immediately before a
 *     nested description list:  `- Label \`pill\`\n  - description`
 *
 * The second shape USED to be matched in CSS with `code:has(+ :is(ul, ol))`,
 * but the `+` (next-sibling) combinator skips text nodes, so a *mid-sentence*
 * reference on a row that merely happens to have a nested list —
 * `- The \`--accent\` token does X\n  - detail` — was wrongly promoted to a
 * pill (the `<code>`'s next ELEMENT sibling is the `<ul>`, even though
 * " token does X" sits between them). CSS cannot express "no text node
 * between code and list," so this transform tags the genuine case instead:
 * a `<code>` whose close tag is immediately followed by only whitespace and
 * then a nested `<ul>`/`<ol>` gets `class="lat-pill"`, and the CSS arm becomes
 * `:where(:last-child, .lat-pill)`.
 *
 * Tagging is intentionally generous (it does not verify the `<code>`'s parent
 * is an `<li>`): the universal pill selector still gates on `… > li > code`,
 * so a stray tagged `<code>` elsewhere is inert. The mid-sentence case never
 * matches because non-whitespace text sits between `</code>` and the list.
 *
 * Three render paths, one kernel:
 *   - applyToHtml    (marp.config.js render hook — full Marpit HTML string)
 *   - applyToSection (lattice-emulator.js — one section's inner HTML)
 *   - applyToDom     (lattice-runtime.js — live DOM, marp-vscode preview)
 * The string and DOM forms are siblings; keep them in sync.
 *
 * Idempotent: re-tagging an already-tagged `<code>` is a no-op (the regex
 * only adds `lat-pill` when absent; the DOM walk checks classList).
 */

// `<code …>…</code>` immediately followed by whitespace + a nested list open
// tag. The content group forbids crossing a `</code>` so each match isolates a
// single inline-code element (inline code never nests; `<` inside is escaped).
const CODE_BEFORE_LIST = /<code\b([^>]*)>((?:(?!<\/code>)[\s\S])*)<\/code>(\s*<(?:ul|ol)\b)/g;

function addClass(attrs, name) {
  if (new RegExp(`class\\s*=\\s*["'][^"']*\\b${name}\\b`).test(attrs)) return attrs; // already tagged
  if (/class\s*=\s*"/.test(attrs)) return attrs.replace(/class\s*=\s*"([^"]*)"/, (_, c) => `class="${c} ${name}"`);
  if (/class\s*=\s*'/.test(attrs)) return attrs.replace(/class\s*=\s*'([^']*)'/, (_, c) => `class='${c} ${name}'`);
  return `${attrs} class="${name}"`;
}

function tagPills(html) {
  if (typeof html !== 'string' || html.indexOf('</code>') === -1) return html;
  return html.replace(CODE_BEFORE_LIST, (_, attrs, content, tail) =>
    `<code${addClass(attrs, 'lat-pill')}>${content}</code>${tail}`);
}

function applyToDom(root) {
  const doc = root?.ownerDocument ? root.ownerDocument : root;
  const scope = (root?.querySelectorAll) ? root : doc;
  if (!scope?.querySelectorAll) return;
  for (const code of scope.querySelectorAll('li > code')) {
    if (code.classList.contains('lat-pill')) continue;
    // Walk forward past whitespace-only text nodes; the genuine pill's first
    // non-whitespace sibling is the nested list. Any non-whitespace text or
    // other element first means the code is mid-sentence — leave it alone.
    let n = code.nextSibling;
    while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
    if (n && n.nodeType === 1 && (n.tagName === 'UL' || n.tagName === 'OL')) {
      code.classList.add('lat-pill');
    }
  }
}

module.exports = {
  name: 'pill-tag',
  selector: 'li > code',
  applyToHtml(html) { return tagPills(html); },
  applyToSection(inner, cls) { return { html: tagPills(inner), cls }; },
  applyToDom,
  tagPills, // exported for unit tests
};
