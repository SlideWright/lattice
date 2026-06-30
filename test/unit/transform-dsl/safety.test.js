// §6 — the transform block is untrusted (shareable + AI-generable), so the
// validator is the attack surface. Each test asserts a specific envelope: a
// barred element/attribute, a selector outside the closed sub-grammar, a
// prototype-pollution payload, an unknown op/capability, and the budget backstop.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const { validateTransform } = require('../../../lib/core/transform-dsl/schema');
const { applyRulesToDom } = require('../../../lib/core/transform-dsl/interpret');

const rule = (doOps, match) => [{ name: 't', match: match || { section: 'x' }, do: doOps }];
const ok = t => validateTransform(t).ok;
const errs = t => validateTransform(t).errors.join(' | ');

describe('transform-dsl — safety envelope (§6)', () => {
  test('accepts a minimal valid extract + wrap + capability', () => {
    assert.equal(ok(rule([
      { capability: 'panel-eyebrow' },
      { extract: { into: { element: 'div', class: 'panel-left' }, slots: ['h2', 'p'] } },
      { wrap: { target: 'rest', into: { element: 'div', class: 'panel-right' } } },
    ])), true, errs(rule([{ extract: { into: { element: 'div' }, slots: ['h2'] } }])));
  });

  test('§6.1 rejects a barred element (script / style / img / iframe / svg)', () => {
    for (const el of ['script', 'style', 'img', 'iframe', 'svg', 'object', 'input']) {
      assert.equal(ok(rule([{ extract: { into: { element: el }, slots: ['h2'] } }])), false, `${el} must be rejected`);
    }
  });

  test('§6.2 rejects a barred attribute (style / on* / URL-bearing)', () => {
    for (const attr of ['style', 'onclick', 'href', 'src', 'srcdoc', 'formaction']) {
      const t = rule([{ extract: { into: { element: 'div', attrs: { [attr]: 'x' } }, slots: ['h2'] } }]);
      assert.equal(ok(t), false, `${attr} must be rejected`);
    }
  });

  test('§6.2 allows class / id / data-* / role / aria-*', () => {
    const t = rule([{ extract: { into: { element: 'div', attrs: { id: 'a', 'data-k': 'v', role: 'note', 'aria-hidden': 'true' } }, slots: ['h2'] } }]);
    assert.equal(ok(t), true, errs(t));
  });

  test('§6.4 rejects a selector outside the closed sub-grammar', () => {
    for (const sel of ['a[href]', 'div:has(p)', 'div > p', 'h2, p', '*', '#id', 'p::before']) {
      assert.equal(ok(rule([{ extract: { into: { element: 'div' }, slots: [sel] } }])), false, `${sel} must be rejected`);
    }
    // a barred TAG in an otherwise well-formed selector is also rejected.
    assert.equal(ok(rule([{ extract: { into: { element: 'div' }, slots: ['script.x'] } }])), false);
  });

  test('§6.6 rejects a prototype-pollution payload', () => {
    const poison = JSON.parse('[{"name":"t","match":{"section":"x"},"do":[{"extract":{"into":{"element":"div","__proto__":{"polluted":1}},"slots":["h2"]}}]}]');
    assert.equal(ok(poison), false);
    assert.match(errs(poison), /prototype pollution/);
    assert.equal({}.polluted, undefined, 'Object.prototype not polluted');
  });

  test('rejects an unknown op and an unknown capability', () => {
    assert.equal(ok(rule([{ frobnicate: { x: 1 } }])), false);
    assert.equal(ok(rule([{ capability: 'exfiltrate' }])), false);
    assert.match(errs(rule([{ capability: 'exfiltrate' }])), /not in the closed registry/);
  });

  test('rejects a do op with more than one operation key', () => {
    assert.equal(ok(rule([{ extract: { into: { element: 'div' }, slots: ['h2'] }, wrap: { target: 'rest', into: { element: 'div' } } }])), false);
  });

  test('fail-closed: one bad rule rejects the whole block (returns no rules)', () => {
    const r = validateTransform([
      { name: 'good', match: { section: 'x' }, do: [{ wrap: { target: 'rest', into: { element: 'div', class: 'r' } } }] },
      { name: 'bad', match: { section: 'x' }, do: [{ extract: { into: { element: 'script' }, slots: ['h2'] } }] },
    ]);
    assert.equal(r.ok, false);
    assert.equal(r.rules.length, 0);
  });

  test('§7 the render-guard budget terminates a runaway transform', () => {
    // A tiny budget + a section with many children → wrap spends past the cap.
    const valid = validateTransform(rule([{ wrap: { target: 'rest', into: { element: 'div', class: 'r' } } }])).rules;
    const lis = Array.from({ length: 50 }, (_, i) => `<p>${i}</p>`).join('');
    const section = new JSDOM(`<section class="x">${lis}</section>`).window.document.querySelector('section');
    assert.throws(() => applyRulesToDom(section, valid, { component: 'x', budget: 5 }), /budget exceeded/);
  });

  test('MED-5 the scope key is validated — a selector-injecting component is rejected', () => {
    const valid = validateTransform(rule([{ wrap: { target: 'rest', into: { element: 'div', class: 'r' } } }])).rules;
    const section = new JSDOM('<section class="x"><p>p</p></section>').window.document.querySelector('section');
    assert.throws(() => applyRulesToDom(section, valid, { component: 'a, section.b' }), /invalid component scope/);
    assert.throws(() => applyRulesToDom(section, valid, { component: 'X bad' }), /invalid component scope/);
  });
});
