// The Drawing Board — focus edit modes (Phase 2, Slice 9). Deterministic.
//
// Open the fenced ```mermaid / ```chart block or the $$…$$ math block under the
// cursor in an isolated, distraction-free sub-editor with a LIVE fragment
// preview rendered through the same engine (render path #2). Apply writes the
// edited fragment back as one undoable editor transaction (re-rendered +
// re-linted); cancel/Esc discards. No model — this is pure tooling, fully
// verified headless.

import { createEditor } from './editor.js';

const FENCE = /^(```|~~~)[ \t]*([A-Za-z0-9_-]*)/;
const MATH_INLINE = /^\s*\$\$(.+)\$\$\s*$/;

// Pure: find the focusable block enclosing the 1-based cursor line. Returns
// { kind, fromLine, toLine, body, rebuild(edited) } or null. Unit-tested.
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

// Build the minimal deck source that renders just this fragment, themed.
function fragmentSource(kind, body) {
  if (kind === 'math') return `$$\n${body}\n$$\n`;
  return '```' + kind + '\n' + body + '\n```\n';
}

export function createFocus({ host, editor, themeBase, runtimeUrl, slideBox }) {
  if (!host) return { open() {}, focusable() { return null; } };
  const PG = () => window.LatticePlayground;
  const root = document.documentElement;
  const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
  const fetched = {};
  let sub = null;
  let block = null;
  let previewTimer = null;

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };

  // What block (if any) is under the cursor — drives the toolbar affordance.
  function focusable() {
    if (!editor?.getValue) return null;
    return findFocusBlock(editor.getValue().split('\n'), editor.getCursorLine ? editor.getCursorLine() : 1);
  }

  async function ensureTheme(name) {
    const pg = PG();
    if (!pg) return;
    if (!fetched.lattice) fetched.lattice = fetch(themeBase + 'lattice.css').then((r) => r.text()).then((c) => pg.addThemes([c]));
    await fetched.lattice;
    if (!pg.hasTheme(name)) {
      if (!fetched[name]) fetched[name] = fetch(themeBase + name + '.css').then((r) => r.text()).then((c) => pg.addThemes([c])).catch(() => {});
      await fetched[name];
    }
  }

  function frame(out, bg) {
    const FIT = '(function(){function fit(){var m=document.querySelector(".marpit");if(!m)return;var s=m.querySelector(":scope>section");if(!s)return;'
      + 'var sc=Math.min((innerWidth-32)/1280,(innerHeight-32)/720);s.style.transformOrigin="top center";s.style.transform="translateX(-50%) scale("+sc+")";'
      + 's.style.position="absolute";s.style.left="50%";s.style.top=Math.max(16,(innerHeight-720*sc)/2)+"px";}'
      + 'window.addEventListener("resize",fit);[60,400,1200].forEach(function(t){setTimeout(fit,t)});fit();})();';
    return '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="' + KATEX + '">'
      + '<style>html,body{margin:0;height:100vh;overflow:hidden;background:' + bg + ';}' + slideBox
      + '.marpit>section{box-shadow:0 10px 40px rgba(0,0,0,.3);border-radius:8px;}' + out.css + '</style></head><body>'
      + out.html + '<scr' + 'ipt src="' + MERMAID + '"></scr' + 'ipt><scr' + 'ipt src="' + runtimeUrl + '"></scr' + 'ipt>'
      + '<scr' + 'ipt>' + FIT + '</scr' + 'ipt></body></html>';
  }

  let frameEl;
  let statusEl;
  async function renderPreview() {
    const pg = PG();
    if (!pg || !frameEl) return;
    const palette = root.getAttribute('data-palette') || 'indaco';
    const mode = root.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
    if (statusEl) statusEl.textContent = 'Rendering…';
    try {
      await ensureTheme(palette);
      if (mode === 'dark') await ensureTheme(palette + '-dark');
      const theme = mode === 'dark' && pg.hasTheme(palette + '-dark') ? palette + '-dark' : palette;
      const out = pg.render(fragmentSource(block.kind, sub.getValue()), theme);
      frameEl.srcdoc = frame(out, mode === 'dark' ? '#0c0c0c' : '#15110d');
      if (statusEl) statusEl.textContent = '';
    } catch (e) {
      if (statusEl) { statusEl.textContent = String(e.message || e); }
    }
  }
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 250); }

  function close() {
    clearTimeout(previewTimer);
    if (sub) { sub.destroy(); sub = null; }
    host.hidden = true;
    host.innerHTML = '';
    document.removeEventListener('keydown', onKey);
    editor?.focus?.();
  }
  function apply() {
    if (block && editor?.replaceLines) editor.replaceLines(block.fromLine, block.toLine, block.rebuild(sub.getValue()));
    close();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); apply(); }
  }

  // Open the overlay on the block under the cursor (no-op if none).
  function open() {
    block = focusable();
    if (!block) return false;
    host.hidden = false;
    host.innerHTML = '';
    document.addEventListener('keydown', onKey);

    const wrap = el('div', 'db-focus-wrap');
    const bar = el('div', 'db-focus-bar');
    const title = el('span', 'db-focus-title', `Focus · ${block.kind}`);
    statusEl = el('span', 'db-focus-status');
    const spacer = el('span', 'db-focus-spacer');
    const applyBtn = el('button', 'db-btn db-btn-primary', 'Apply'); applyBtn.type = 'button';
    applyBtn.title = 'Apply (⌘/Ctrl+Enter)';
    applyBtn.addEventListener('click', apply);
    const cancelBtn = el('button', 'db-btn', 'Cancel'); cancelBtn.type = 'button';
    cancelBtn.title = 'Discard (Esc)';
    cancelBtn.addEventListener('click', close);
    bar.append(title, statusEl, spacer, cancelBtn, applyBtn);

    const body = el('div', 'db-focus-body');
    const editPane = el('div', 'db-focus-edit');
    const previewPane = el('div', 'db-focus-preview');
    frameEl = el('iframe', 'db-focus-frame');
    frameEl.setAttribute('title', 'Fragment preview');
    previewPane.appendChild(frameEl);
    body.append(editPane, previewPane);
    wrap.append(bar, body);
    host.appendChild(wrap);

    sub = createEditor({ parent: editPane, doc: block.body, onChange: schedulePreview });
    setTimeout(() => sub.focus(), 0);
    renderPreview();
    return true;
  }

  return { open, focusable };
}
