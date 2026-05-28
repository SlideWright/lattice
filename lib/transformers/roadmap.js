/**
 * roadmap transformer — registry-shaped adapter around the engine
 * kernel at lib/components/roadmap/roadmap.transform.js (HTML-string
 * path) plus the DOM-walk mirror lifted from the legacy
 * lib/runtime/index.js inline block.
 *
 * The engine module owns the rewrite logic for the `roadmap` layout
 * (status modifier — cell state markers; horizons modifier — table →
 * three-card transpose).
 *
 * Consumers:
 *   - marp.config.js     — render hook calls registry.applyAllToHtml
 *   - lattice-emulator.js — per-slide parseSlide loop calls
 *                           registry.applyAllToSection(html, classAttr)
 *   - lib/runtime/index.js → lattice-runtime.js bundle — content-transform
 *                            loop calls registry.applyAllToDom(document),
 *                            which dispatches to applyToDom here.
 *
 * Class mutation: transformRoadmapSection does NOT mutate cls.
 *
 * Status / Horizons ordering: Status must run BEFORE Horizons because
 * the Horizons transpose reads the `state-*` classes that Status sets
 * on each <td>. applyToDom enforces the order; the registry's
 * applyAllToDom just dispatches the whole transformer in order.
 */

const engine = require('../components/progression/roadmap/roadmap.transform');

// ── Palette + state vocabulary ─────────────────────────────────────────
// Mirror of the HTML kernel's HORIZON_ACCENTS / STATE_LABEL maps. Same
// --c{N}-dark token scheme the other categorical native charts use
// (piechart, journey, radar). Documented in
// engineering/decisions/2026-05-17-radar-word-cloud-cat-fix.md for the regression
// history of the cat-* → c{N}-dark unification.
const HORIZON_ACCENTS = [
  'var(--c1-dark)', 'var(--c2-dark)', 'var(--c3-dark)', 'var(--c4-dark)',
  'var(--c5-dark)', 'var(--c6-dark)', 'var(--c7-dark)', 'var(--c8-dark)',
];

const STATE_LABEL = {
  'state-shipped': 'Shipped',
  'state-wip':     'In flight',
  'state-planned': 'Planned',
  'state-skipped': 'Out of scope',
};

function markerToState(marker) {
  switch (marker) {
    case 'x': return 'state-shipped';
    case '-': return 'state-wip';
    case ' ': return 'state-planned';
    case '/': return 'state-skipped';
    default:  return '';
  }
}

function getDoc(root) {
  return root.ownerDocument || root;
}

// ── Status: state-marker tagging on <td> cells ─────────────────────────
// Walks every section.roadmap > table > tbody > tr > td (except the
// first column, which is the workstream label) and looks for the
// `[x] / [-] / [ ] / [/]` marker prefix. Strips the marker, wraps the
// remaining cell content in <span class="cell-state-text">, prepends a
// <span class="cell-state-label">{Status label}</span>, and tags the
// <td> with `cell-state state-X`. Idempotent — sections already
// tagged are skipped.
function transformRoadmapStatus(root) {
  const doc = getDoc(root);
  for (const section of root.querySelectorAll('section.roadmap')) {
    const rows = section.querySelectorAll(':scope > table > tbody > tr');
    for (const tr of rows) {
      const tds = tr.querySelectorAll(':scope > td');
      for (let i = 0; i < tds.length; i++) {
        if (i === 0) continue; // workstream label
        const td = tds[i];
        if (td.classList.contains('cell-state')) continue;
        const text = td.textContent;
        const m = /^\s*\[([x\-/ ])\]\s*/.exec(text);
        if (!m) continue;
        const state = markerToState(m[1]);
        if (!state) continue;
        const label = STATE_LABEL[state];
        // Strip the marker from the first text node.
        let firstText = null;
        for (const n of td.childNodes) {
          if (n.nodeType === 3) { firstText = n; break; }
          if (n.nodeType === 1) break;
        }
        if (firstText) {
          firstText.nodeValue = firstText.nodeValue.replace(/^\s*\[[x\-/ ]\]\s*/, '');
        }
        const wrap = doc.createElement('span');
        wrap.className = 'cell-state-text';
        while (td.firstChild) wrap.appendChild(td.firstChild);
        const eyebrow = doc.createElement('span');
        eyebrow.className = 'cell-state-label';
        eyebrow.textContent = label;
        td.appendChild(eyebrow);
        td.appendChild(wrap);
        td.classList.add('cell-state', state);
      }
    }
  }
}

// ── Horizons: workstream × phase table → three-card grid ───────────────
// Idempotent: sections already containing a `.horizons` child are
// skipped. Reads the state-* class on each <td> (set by Status above)
// and carries it into the corresponding card row.
function transformRoadmapHorizons(root) {
  const doc = getDoc(root);
  for (const section of root.querySelectorAll('section.roadmap.horizons')) {
    if (section.querySelector('.horizons')) continue;
    const table = section.querySelector(':scope > table');
    if (!table) continue;
    const headRow = table.querySelector(':scope > thead > tr');
    if (!headRow) continue;
    const headCells = [...headRow.children];
    if (headCells.length < 2) continue;
    const phaseHeaders = headCells.slice(1).map(c => c.innerHTML.trim());

    const bodyRows = [...table.querySelectorAll(':scope > tbody > tr')]
      .map(tr => {
        const cells = [...tr.children];
        return {
          label: cells[0] ? cells[0].innerHTML.trim() : '',
          cells: cells.slice(1).map(c => {
            let state = '';
            for (const cls of c.classList) {
              if (/^state-/.test(cls)) { state = cls; break; }
            }
            const textSpan = c.querySelector(':scope > .cell-state-text');
            const text = textSpan ? textSpan.innerHTML.trim() : c.innerHTML.trim();
            return { text, state };
          }),
        };
      })
      .filter(r => r.label !== '');

    const wrap = doc.createElement('div');
    wrap.className = 'horizons';
    phaseHeaders.forEach((header, idx) => {
      const card = doc.createElement('div');
      card.className = 'horizon-card';
      card.style.setProperty('--phase-accent', HORIZON_ACCENTS[idx % HORIZON_ACCENTS.length]);
      const head = doc.createElement('div');
      head.className = 'horizon-head';
      const eyebrow = doc.createElement('span');
      eyebrow.className = 'horizon-eyebrow';
      eyebrow.textContent = 'Phase ' + String(idx + 1).padStart(2, '0');
      // Lift a trailing <code> into a meta pill — mirrors the HTML kernel.
      let headerHtml = header;
      let metaText = '';
      const trailingCode = header.match(/\s*<code\b[^>]*>([\s\S]*?)<\/code>\s*$/);
      if (trailingCode) {
        headerHtml = header.slice(0, trailingCode.index).trim();
        metaText = trailingCode[1];
      }
      const title = doc.createElement('span');
      title.className = 'horizon-title';
      title.innerHTML = headerHtml;
      head.appendChild(eyebrow);
      head.appendChild(title);
      if (metaText) {
        const meta = doc.createElement('span');
        meta.className = 'horizon-meta';
        meta.innerHTML = metaText;
        head.appendChild(meta);
      }
      const ul = doc.createElement('ul');
      ul.className = 'horizon-rows';
      for (const r of bodyRows) {
        const cell = r.cells[idx] || { text: '', state: '' };
        const li = doc.createElement('li');
        if (cell.state) li.className = 'cell-state ' + cell.state;
        const lbl = doc.createElement('span');
        lbl.className = 'row-label';
        lbl.innerHTML = r.label;
        const text = cell.text;
        const isEmpty = !text || text === '—' || text === '-';
        const txt = doc.createElement('span');
        txt.className = isEmpty ? 'row-text row-empty' : 'row-text';
        txt.innerHTML = isEmpty ? '—' : text;
        li.appendChild(lbl);
        li.appendChild(txt);
        ul.appendChild(li);
      }
      card.appendChild(head);
      card.appendChild(ul);
      wrap.appendChild(card);
    });
    table.replaceWith(wrap);
  }
}

module.exports = {
  name: 'roadmap',
  layouts: ['roadmap'],
  selector: 'section.roadmap',
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToSection(innerHtml, cls) {
    return { html: engine.transformRoadmapSection(innerHtml, cls), cls };
  },
  applyToDom(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    // Status must run before Horizons — Horizons reads state-* classes
    // that Status sets on each <td>.
    transformRoadmapStatus(root);
    transformRoadmapHorizons(root);
  },
};
