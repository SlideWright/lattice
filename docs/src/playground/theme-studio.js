// The Workbench — Theme Studio (Faculty 1) controller.
//
// Turns a small author-facing ESSENTIAL SET into a complete, contrast-clean
// Lattice palette and shows it LIVE: edit a colour → re-derive the full
// ~100-token contract (lib/theme/derive.js) → register it with the in-browser
// engine (window.LatticePlayground, the same marp-cli path the Playground and
// Drawing Board use) → re-render a specimen deck → repaint the contrast meter
// (lib/theme/contrast.js, the gate's own predicate). Copy or download the
// result as a droppable themes/<name>.css.
//
// The studio is the PRODUCER; the engine is the pipe. All the colour maths is
// the pure repo core (lib/theme/*) — the SAME code the Node tooling and the
// WCAG contrast gate run, imported here via the CJS→ESM transform configured in
// docs/astro.config.mjs. No model is involved in Faculty 1's deterministic
// core; seeds come from the starter library.

import { SLIDE_BOX } from './frame-css.js';
// The pure theme core (lib/theme/*) is CommonJS and its modules require() each
// other, which Vite's dev server can't transform in arbitrary source files. So
// we consume it through the esbuild bundle (tools/build-theme-core.js →
// theme-core.generated.js): one ESM module, real named exports, the SAME maths
// as the Node tooling + the WCAG gate. Rebuild with `npm run theme-core:build`.
import { auditBoth, deriveTheme, STARTERS, serializeTheme, validateEssentials } from './theme-core.generated.js';

const PREVIEW_THEME = 'studio-preview'; // fixed @theme name for the live render
const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

// Author-facing grouping of the essential set (lib/theme ESSENTIAL_KEYS).
const FIELD_GROUPS = [
  { title: 'Surfaces', fields: [['bg', 'Canvas'], ['bgAlt', 'Card / alt surface']] },
  {
    title: 'Ink',
    fields: [['textHeading', 'Heading'], ['textBody', 'Body'], ['textMuted', 'Muted (decorative)']],
  },
  { title: 'Brand', fields: [['accent', 'Accent'], ['accentSoft', 'Accent soft (pale fill)']] },
  { title: 'Signals', fields: [['pass', 'Pass'], ['warn', 'Warn'], ['fail', 'Fail']] },
];

// A compact specimen deck spanning the contract: a dark title canvas, light
// surfaces + accent + ink tiers, the semantic signals, a categorical chart, a
// code block (hljs), and a diagram (the --c-* tokens). One screen of proof.
// Built from single-quoted lines (which hold backticks / ``` fences without
// escaping) joined by newlines — no String.raw needed.
const SPECIMEN = [
  '<!-- _class: title silent -->',
  '',
  '`theme studio`',
  '',
  '# The deck builds itself.',
  '',
  'A live specimen — surfaces, accent, signals, charts, code, diagrams.',
  '',
  '---',
  '',
  '## Surfaces, ink, and accent',
  '',
  'Body prose rides on the canvas in the body-ink tier, with an **accented**',
  'emphasis and muted secondary notes. Cards lift off the canvas on the',
  'alternate surface.',
  '',
  '- Heading ink reads AA on both surfaces',
  '  - Body ink carries the prose',
  '- The accent marks what matters',
  '  - Soft accent fills the recommended surface',
  '',
  '---',
  '',
  '<!-- _class: kpi -->',
  '',
  '## Signals read at a glance',
  '',
  '- Revenue',
  '  - $4.2M',
  '  - +12% pass',
  '- Latency',
  '  - 840ms',
  '  - +5% warn',
  '- Error rate',
  '  - 2.1%',
  '  - +0.4% fail',
  '',
  '---',
  '',
  '## Categorical palette',
  '',
  '```mermaid',
  'pie showData',
  '  title Mix',
  '  "Alpha" : 38',
  '  "Bravo" : 26',
  '  "Charlie" : 20',
  '  "Delta" : 16',
  '```',
  '',
  '---',
  '',
  '## Code & diagram',
  '',
  '```js',
  'export function derive(essentials) {',
  '  const theme = fromTokens(essentials); // contrast-aware',
  '  return theme.ok ? theme : repair(theme);',
  '}',
  '```',
  '',
  '```mermaid',
  'flowchart LR',
  '  A[Essentials] --> B[Derive] --> C{AA?}',
  '  C -- yes --> D[Theme]',
  '  C -- no --> B',
  '```',
].join('\n');

/** Lowercase slug or a safe fallback, for the export filename + @theme name. */
function slugify(name, fallback = 'studio') {
  const s = String(name || '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return /^[a-z][a-z0-9-]*$/.test(s) ? s : fallback;
}

export function initThemeStudio(config) {
  const { themeBase, runtimeUrl } = config;
  const root = document.querySelector('.studio');
  if (!root) return;

  const els = {
    fields: root.querySelector('.studio-fields'),
    starters: root.querySelector('.studio-starters'),
    name: root.querySelector('#studio-name'),
    preview: root.querySelector('.studio-preview-host'),
    meter: root.querySelector('.studio-meter'),
    status: root.querySelector('.studio-status'),
    summary: root.querySelector('.studio-meter-summary'),
    modeBtns: [...root.querySelectorAll('.studio-mode-btn')],
    copy: root.querySelector('.studio-copy'),
    download: root.querySelector('.studio-download'),
    code: root.querySelector('.studio-code'),
  };

  const state = {
    essentials: { ...STARTERS[0].essentials },
    label: STARTERS[0].label,
    mode: 'light', // preview canvas
    css: '',
  };
  if (els.name) els.name.value = STARTERS[0].name;

  let fetchedLattice = null;
  function ensureBaseTheme() {
    const PG = window.LatticePlayground;
    if (!fetchedLattice) {
      fetchedLattice = fetch(themeBase + 'lattice.css')
        .then(r => (r.ok ? r.text() : Promise.reject(new Error('lattice ' + r.status))))
        .then(css => PG.addThemes([css]));
    }
    return fetchedLattice;
  }

  function setStatus(msg, isErr) {
    if (!els.status) return;
    els.status.textContent = msg;
    els.status.classList.toggle('err', !!isErr);
  }

  // ── Build the essentials form ───────────────────────────────────────────
  const inputs = {}; // key -> { color, hex }
  function buildFields() {
    if (!els.fields) return;
    els.fields.innerHTML = '';
    for (const group of FIELD_GROUPS) {
      const fs = document.createElement('div');
      fs.className = 'studio-group';
      fs.innerHTML = `<h3>${group.title}</h3>`;
      for (const [key, label] of group.fields) {
        const row = document.createElement('label');
        row.className = 'studio-field';
        const color = document.createElement('input');
        color.type = 'color';
        color.value = state.essentials[key];
        const hex = document.createElement('input');
        hex.type = 'text';
        hex.className = 'studio-hex';
        hex.value = state.essentials[key];
        hex.spellcheck = false;
        const span = document.createElement('span');
        span.className = 'studio-field-label';
        span.textContent = label;
        row.append(color, hex, span);
        fs.appendChild(row);
        inputs[key] = { color, hex };

        const onColor = v => {
          if (!/^#[0-9a-f]{6}$/i.test(v)) return;
          state.essentials[key] = v.toLowerCase();
          color.value = v.toLowerCase();
          hex.value = v.toLowerCase();
          schedule();
        };
        color.addEventListener('input', () => onColor(color.value));
        hex.addEventListener('input', () => {
          let v = hex.value.trim();
          if (/^[0-9a-f]{6}$/i.test(v)) v = '#' + v;
          if (/^#[0-9a-f]{6}$/i.test(v)) {
            state.essentials[key] = v.toLowerCase();
            color.value = v.toLowerCase();
            schedule();
          }
        });
      }
      els.fields.appendChild(fs);
    }
  }

  function syncFields() {
    for (const key of Object.keys(inputs)) {
      inputs[key].color.value = state.essentials[key];
      inputs[key].hex.value = state.essentials[key];
    }
  }

  // ── Starter picker ──────────────────────────────────────────────────────
  function buildStarters() {
    if (!els.starters) return;
    els.starters.innerHTML = '';
    for (const s of STARTERS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'studio-starter';
      b.dataset.starter = s.name;
      b.innerHTML =
        `<span class="studio-swatches">` +
        [s.essentials.bg, s.essentials.accent, s.essentials.accentSoft, s.essentials.textHeading]
          .map(c => `<i style="background:${c}"></i>`)
          .join('') +
        `</span><span class="studio-starter-name">${s.label}</span>`;
      b.addEventListener('click', () => {
        state.essentials = { ...s.essentials };
        state.label = s.label;
        if (els.name) els.name.value = s.name;
        syncFields();
        markStarter(s.name);
        schedule();
      });
      els.starters.appendChild(b);
    }
    markStarter(STARTERS[0].name);
  }
  function markStarter(name) {
    for (const b of els.starters?.querySelectorAll('.studio-starter') || []) {
      b.classList.toggle('is-active', b.dataset.starter === name);
    }
  }

  // ── Live preview ────────────────────────────────────────────────────────
  const FIT = [
    '(function(){function fit(){var m=document.querySelector(".marpit");if(!m)return;',
    'var w=m.clientWidth;if(!w)return;var s=m.querySelectorAll(":scope>section");var sc=w/1280;',
    'for(var i=0;i<s.length;i++){var e=s[i];e.style.transformOrigin="top left";',
    'e.style.transform="scale("+sc+")";e.style.marginBottom=(720*sc-720+18)+"px";}}',
    'window.addEventListener("resize",fit);if(typeof ResizeObserver!=="undefined"){',
    'var ro=new ResizeObserver(function(){fit();});var m=document.querySelector(".marpit");',
    'if(m){ro.observe(document.documentElement);var ss=m.querySelectorAll(":scope>section");',
    'for(var i=0;i<ss.length;i++)ro.observe(ss[i]);}}fit();',
    '[60,300,1200,2500].forEach(function(t){setTimeout(fit,t);});})();',
  ].join('');

  function writeFrame(html, css) {
    const dark = state.mode === 'dark';
    const bg = dark ? '#0c0c0c' : '#e7e7ea';
    // Force the canvas scheme so the theme's light-dark() pairs resolve to the
    // chosen side (:root beats the theme's :where(:root) default).
    const scheme = dark ? ':root{color-scheme:dark}' : ':root{color-scheme:light}';
    const frame =
      '<!doctype html><html><head><meta charset="utf-8">' +
      '<link rel="stylesheet" href="' + KATEX + '">' +
      '<style>html,body{margin:0;padding:18px;background:' + bg + ';}' +
      scheme +
      SLIDE_BOX +
      '.marpit>section{display:block;transform-origin:top left;' +
      'box-shadow:0 8px 30px rgba(0,0,0,.22);border-radius:6px;}' +
      css + '</style></head><body>' + html +
      '<scr' + 'ipt src="' + MERMAID + '"></scr' + 'ipt>' +
      '<scr' + 'ipt src="' + runtimeUrl + '"></scr' + 'ipt>' +
      '<scr' + 'ipt>' + FIT + '</scr' + 'ipt></body></html>';
    let fr = els.preview.querySelector('iframe.studio-frame');
    if (!fr) {
      fr = document.createElement('iframe');
      fr.className = 'studio-frame';
      fr.setAttribute('title', 'Live theme preview');
      els.preview.appendChild(fr);
    }
    fr.srcdoc = frame;
  }

  // ── Contrast meter ──────────────────────────────────────────────────────
  function paintMeter(map) {
    if (!els.meter) return;
    const both = auditBoth(map, { level: 'full' });
    els.meter.innerHTML = '';
    const rows = [];
    for (const mode of ['light', 'dark']) {
      for (const r of both[mode].results) {
        rows.push({ mode, ...r });
      }
    }
    // De-dupe identical pairs that pass in both modes into one row per mode is
    // noisy; show grouped by role, worst ratio across modes.
    const byPair = new Map();
    for (const r of rows) {
      const k = r.fill + '/' + r.ink;
      const prev = byPair.get(k);
      if (!prev || (r.ratio || 0) < (prev.ratio || 0)) byPair.set(k, r);
    }
    for (const r of byPair.values()) {
      const li = document.createElement('div');
      li.className = 'studio-pair ' + (r.status === 'pass' ? 'ok' : r.status === 'fail' ? 'bad' : 'na');
      const ratio = r.ratio ? r.ratio.toFixed(2) + ':1' : r.status;
      li.innerHTML =
        `<span class="studio-pair-role">${r.role}</span>` +
        `<span class="studio-pair-chip" style="background:${r.fillHex || '#ccc'};color:${r.inkHex || '#000'}">Aa</span>` +
        `<span class="studio-pair-ratio">${ratio}</span>`;
      els.meter.appendChild(li);
    }
    if (els.summary) {
      const fails = [...byPair.values()].filter(r => r.status === 'fail').length;
      els.summary.textContent = both.ok
        ? 'WCAG AA clean — both canvas modes ✓'
        : `${fails} pair${fails === 1 ? '' : 's'} below AA (advisory tier; the gate-critical contract is auto-repaired)`;
      els.summary.classList.toggle('ok', both.ok);
      els.summary.classList.toggle('bad', !both.ok);
    }
  }

  // ── Derive → register → render → audit ──────────────────────────────────
  function run() {
    const PG = window.LatticePlayground;
    if (!PG) {
      setStatus('Loading engine…');
      return;
    }
    let map;
    try {
      validateEssentials(state.essentials);
      map = deriveTheme(state.essentials);
    } catch (e) {
      setStatus(String(e.message || e), true);
      return;
    }
    paintMeter(map);

    const exportName = slugify(els.name ? els.name.value : 'studio');
    state.css = serializeTheme(map, { name: exportName, label: state.label });
    if (els.code) els.code.textContent = state.css;

    // Register the preview under a fixed name + render the specimen.
    setStatus('Rendering…');
    ensureBaseTheme()
      .then(() => {
        const previewCss = serializeTheme(map, { name: PREVIEW_THEME, label: state.label });
        PG.addThemes([previewCss]);
        const out = PG.render(SPECIMEN, PREVIEW_THEME);
        writeFrame(out.html, out.css);
        const n = (out.html.match(/<\/section>/g) || []).length;
        setStatus(`Live · ${n} specimen slide${n === 1 ? '' : 's'} · ${exportName}.css`);
      })
      .catch(e => setStatus(String(e.message || e), true));
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 180);
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  function wireActions() {
    els.copy?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(state.css);
        setStatus('Theme CSS copied to clipboard.');
      } catch {
        setStatus('Copy failed — select the CSS panel and copy manually.', true);
      }
    });
    els.download?.addEventListener('click', () => {
      const name = slugify(els.name ? els.name.value : 'studio');
      const blob = new Blob([state.css], { type: 'text/css' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name + '.css';
      a.click();
      URL.revokeObjectURL(a.href);
      setStatus(`Downloaded ${name}.css — drop it in themes/ or PG.addThemes([…]).`);
    });
    els.name?.addEventListener('input', schedule);
    for (const b of els.modeBtns) {
      b.addEventListener('click', () => {
        state.mode = b.dataset.mode === 'dark' ? 'dark' : 'light';
        for (const x of els.modeBtns) x.classList.toggle('is-active', x === b);
        run();
      });
    }
  }

  // ── Boot ────────────────────────────────────────────────────────────────
  buildFields();
  buildStarters();
  wireActions();

  function whenReady(cb) {
    if (window.LatticePlayground) return cb();
    const t = setInterval(() => {
      if (window.LatticePlayground) {
        clearInterval(t);
        cb();
      }
    }, 50);
  }
  whenReady(run);
}
