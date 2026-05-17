/**
 * split-panels transformer — registry-shaped adapter around the engine
 * kernel at lib/engine/split-panels.js (HTML-string path) plus the
 * DOM-walk mirror lifted from the legacy lattice-runtime.js inline
 * block.
 *
 * Three render paths consume this module via the registry:
 *   - marp.config.js     — render hook calls registry.applyAllToHtml
 *   - lattice-emulator.js — parseSlide loop calls applyToSectionInner
 *   - src/runtime/index.js → lattice-runtime.js bundle — content-transform
 *                            loop calls registry.applyAllToDom(document)
 *
 * The HTML-string kernel handles all six split-* layouts; the legacy
 * hand-edited runtime mirror handled only five (split-list was omitted,
 * leaving its panel-left/panel-right wrappers missing in web-export
 * paths where the engine hook hadn't run). applyToDom below implements
 * all six, closing the drift.
 */

const engine = require('../engine/split-panels');

// ── DOM helpers ────────────────────────────────────────────────────────
// Each transform takes a scope root (Document or Element) and a doc
// (the owning Document, needed for createElement). Splitting them out
// lets unit tests pass a jsdom Element directly without touching globals.

function makeDocHelpers(root) {
  const doc = root.ownerDocument || root;
  return { doc, sections: (sel) => root.querySelectorAll(sel) };
}

function findCodeOnlyP(sec) {
  return [...sec.children].find(
    el => el.tagName === 'P' && el.childNodes.length === 1 && el.firstChild && el.firstChild.tagName === 'CODE'
  );
}

function findFirstNonCodeP(sec, codeP) {
  return [...sec.children].find(el => el.tagName === 'P' && el !== codeP);
}

function moveRemainingChildrenInto(sec, target) {
  const header = sec.querySelector('header');
  [...sec.children].filter(el => el !== header).forEach((el) => { target.appendChild(el); });
}

function makeSpan(doc, className, text) {
  const span = doc.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

// ── Per-layout DOM transforms ──────────────────────────────────────────
// Idempotent — each guards on the layout's marker class so a second
// pass (e.g. when the engine hook already ran) is a no-op.

function transformSplitBrief(root) {
  const { doc, sections } = makeDocHelpers(root);
  for (const sec of sections('section.split-brief')) {
    if (sec.querySelector('.brief-left')) continue;
    const codeP  = findCodeOnlyP(sec);
    const h2     = sec.querySelector('h2');
    const introP = findFirstNonCodeP(sec, codeP);
    const left   = doc.createElement('div');
    left.className = 'brief-left';
    if (codeP) {
      left.appendChild(makeSpan(doc, 'eyebrow', codeP.textContent));
      codeP.remove();
    }
    if (h2)     left.appendChild(h2);
    if (introP) left.appendChild(introP);
    const right = doc.createElement('div');
    right.className = 'brief-right';
    moveRemainingChildrenInto(sec, right);
    sec.appendChild(left);
    sec.appendChild(right);
  }
}

function transformSplitMetric(root) {
  const { doc, sections } = makeDocHelpers(root);
  for (const sec of sections('section.split-metric')) {
    if (sec.querySelector('.metric-left')) continue;
    const codeP  = findCodeOnlyP(sec);
    const h2     = sec.querySelector('h2');
    const introP = findFirstNonCodeP(sec, codeP);
    const left   = doc.createElement('div');
    left.className = 'metric-left';
    if (codeP) {
      left.appendChild(makeSpan(doc, 'unit-label', codeP.textContent));
      codeP.remove();
    }
    if (h2) left.appendChild(h2);
    if (introP) {
      const context = doc.createElement('span');
      context.className = 'metric-context';
      context.innerHTML = introP.innerHTML;
      left.appendChild(context);
      introP.remove();
    }
    const right = doc.createElement('div');
    right.className = 'metric-right';
    moveRemainingChildrenInto(sec, right);
    sec.appendChild(left);
    sec.appendChild(right);
  }
}

function transformSplitSteps(root) {
  const { doc, sections } = makeDocHelpers(root);
  for (const sec of sections('section.split-steps')) {
    if (sec.querySelector('.steps-left')) continue;
    const codeP  = findCodeOnlyP(sec);
    const h2     = sec.querySelector('h2');
    const introP = findFirstNonCodeP(sec, codeP);
    const left   = doc.createElement('div');
    left.className = 'steps-left';
    if (codeP) {
      left.appendChild(makeSpan(doc, 'phase-num', codeP.textContent));
      codeP.remove();
    }
    if (h2)     left.appendChild(h2);
    if (introP) left.appendChild(introP);
    const right = doc.createElement('div');
    right.className = 'steps-right';
    moveRemainingChildrenInto(sec, right);
    sec.appendChild(left);
    sec.appendChild(right);
  }
}

function transformSplitCompare(root) {
  const { doc, sections } = makeDocHelpers(root);
  for (const sec of sections('section.split-compare')) {
    if (sec.querySelector('.compare-left')) continue;
    const codeP  = findCodeOnlyP(sec);
    const h2     = sec.querySelector('h2');
    const introP = findFirstNonCodeP(sec, codeP);
    const bq     = sec.querySelector(':scope > blockquote');
    const left   = doc.createElement('div');
    left.className = 'compare-left';
    if (codeP) {
      left.appendChild(makeSpan(doc, 'frame-label', codeP.textContent));
      codeP.remove();
    }
    if (h2)     left.appendChild(h2);
    if (introP) left.appendChild(introP);
    // slotLabelLift has already run, so li > strong is in place.
    const optionList = sec.querySelector(':scope > ul, :scope > ol');
    const right = doc.createElement('div');
    right.className = 'compare-right';
    const opts  = doc.createElement('div');
    opts.className = 'options';
    if (optionList) {
      [...optionList.children].filter(el => el.tagName === 'LI').forEach((li, i) => {
        const div = doc.createElement('div');
        div.className = i === 1 ? 'option preferred' : 'option';
        [...li.childNodes].forEach((n) => { div.appendChild(n); });
        opts.appendChild(div);
      });
      optionList.remove();
    }
    right.appendChild(opts);
    if (bq) {
      const verdict = doc.createElement('div');
      verdict.className = 'verdict';
      verdict.appendChild(bq);
      right.appendChild(verdict);
    }
    sec.appendChild(left);
    sec.appendChild(right);
  }
}

function transformSplitStatement(root) {
  const { doc, sections } = makeDocHelpers(root);
  for (const sec of sections('section.split-statement')) {
    if (sec.querySelector('.statement-left')) continue;
    const bq    = sec.querySelector(':scope > blockquote');
    const codeP = findCodeOnlyP(sec);
    const left  = doc.createElement('div');
    left.className = 'statement-left';
    if (bq) left.appendChild(bq);
    if (codeP) {
      const cite = doc.createElement('cite');
      cite.textContent = codeP.textContent;
      left.appendChild(cite);
      codeP.remove();
    }
    const right = doc.createElement('div');
    right.className = 'statement-right';
    moveRemainingChildrenInto(sec, right);
    sec.appendChild(left);
    sec.appendChild(right);
  }
}

// split-list — the legacy hand-edited runtime omitted this layout, so
// the marp-vscode preview and web-export paths fell back to the CSS
// without-panels rule (no watermark glyph, no panel-left framing). The
// engine kernel always handled it via applyList; lifting it here closes
// the drift.
function transformSplitList(root) {
  const { doc, sections } = makeDocHelpers(root);
  for (const sec of sections('section.split-list')) {
    if (sec.querySelector('.panel-left')) continue;
    const h2    = sec.querySelector('h2');
    const h5    = sec.querySelector('h5');
    const codeP = findCodeOnlyP(sec);
    const h2Text = h2 ? (h2.textContent || '').trim() : '';
    const watermarkLetter = h2Text ? h2Text[0] : 'S';
    const left  = doc.createElement('div');
    left.className = 'panel-left';
    const watermark = doc.createElement('div');
    watermark.className = 'watermark';
    watermark.textContent = watermarkLetter;
    left.appendChild(watermark);
    if (codeP) { left.appendChild(codeP); }
    if (h5)    { left.appendChild(h5); }
    if (h2)    { left.appendChild(h2); }
    const right = doc.createElement('div');
    right.className = 'panel-right';
    moveRemainingChildrenInto(sec, right);
    sec.appendChild(left);
    sec.appendChild(right);
  }
}

module.exports = {
  name: 'split-panels',
  layouts: engine.SPLIT_LAYOUTS,
  selector: engine.SPLIT_LAYOUTS.map(l => `section.${l}`).join(', '),
  applyToHtml(html) {
    return engine.applyToRenderedHtml(html);
  },
  applyToSectionInner(innerHtml, cls) {
    return engine.transformSplitSection(innerHtml, cls);
  },
  // Per-renderer DOM walk. root is a Document or Element scope.
  // Order matters: split-compare reads <li> children, which expect
  // slotLabelLift's li > strong shape to already be present — but that
  // dependency is enforced by the registry's transformer ordering, not
  // here. Each transform is self-guarding.
  applyToDom(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    transformSplitBrief(root);
    transformSplitMetric(root);
    transformSplitSteps(root);
    transformSplitCompare(root);
    transformSplitStatement(root);
    transformSplitList(root);
  },
};
