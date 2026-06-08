// The Drawing Board — focus-mode block detection (pure, import-free).
//
// Split out of drawing-board-focus.js so the Node unit suite can import JUST
// this — the overlay drags in editor.js → CodeMirror (a docs-only dependency
// not present in the repo-root node_modules / CI), but the caret→block logic is
// pure data and must stay testable without it. See focus-block.test.js.

const FENCE = /^(```|~~~)[ \t]*([A-Za-z0-9_-]*)/;
const MATH_INLINE = /^\s*\$\$(.+)\$\$\s*$/;

// Find the focusable block enclosing the 1-based cursor line. Returns
// { kind, fromLine, toLine, body, rebuild(edited) } or null.
export function findFocusBlock(lines, cursorLine) {
  const cur = Math.max(0, Math.min(lines.length - 1, cursorLine - 1));

  // 1) fenced code — ```mermaid / ```chart (other languages aren't focusable).
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(FENCE);
    if (m) {
      const marker = m[1];
      const lang = (m[2] || '').toLowerCase();
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== marker) j++;
      const closeIdx = j < lines.length ? j : lines.length - 1; // unterminated → EOF
      if (cur >= i && cur <= closeIdx) {
        if (lang === 'mermaid' || lang === 'chart') {
          const open = lines[i];
          const close = j < lines.length ? lines[j] : marker;
          const body = lines.slice(i + 1, j).join('\n');
          return { kind: lang, fromLine: i + 1, toLine: closeIdx + 1, body, rebuild: (e) => `${open}\n${e}\n${close}` };
        }
        return null; // a non-focusable fence (js, sql, …)
      }
      i = closeIdx + 1;
      continue;
    }
    i++;
  }

  // 2) single-line display math: $$ … $$
  const inline = lines[cur].match(MATH_INLINE);
  if (inline) {
    return { kind: 'math', fromLine: cur + 1, toLine: cur + 1, body: inline[1].trim(), rebuild: (e) => `$$${e}$$` };
  }

  // 3) block math — a region delimited by lines that are exactly `$$`.
  const delims = [];
  for (let k = 0; k < lines.length; k++) if (lines[k].trim() === '$$') delims.push(k);
  for (let p = 0; p + 1 < delims.length; p += 2) {
    const a = delims[p];
    const b = delims[p + 1];
    if (cur >= a && cur <= b) {
      const body = lines.slice(a + 1, b).join('\n');
      return { kind: 'math', fromLine: a + 1, toLine: b + 1, body, rebuild: (e) => `$$\n${e}\n$$` };
    }
  }
  return null;
}

// Build the minimal deck source that renders just this fragment, themed. Pure.
export function fragmentSource(kind, body) {
  if (kind === 'math') return `$$\n${body}\n$$\n`;
  return '```' + kind + '\n' + body + '\n```\n';
}
