/**
 * Unit tests for the contract tier (lib/contracts/) — the Function layer made
 * first-class. Asserts the inventory contract loads, validates, and exposes its
 * conforming Layouts, and that each Layout's class is styled in the bundled CSS.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadContracts, layoutClasses, layoutsFor, validateContracts } = require('../../../lib/contracts');

describe('contracts', () => {
  test('all contracts validate (no structural problems)', () => {
    assert.deepEqual(validateContracts(), []);
  });

  test('inventory contract loads with its slots + samples', () => {
    const inv = loadContracts().find((c) => c.name === 'inventory');
    assert.ok(inv, 'inventory contract present');
    assert.equal(inv.function, 'inventory');
    assert.ok(inv.canonicalDom.includes('<ul>'), 'canonical DOM is the list shape');
    for (const slot of ['title', 'items']) assert.ok(inv.slots[slot]?.required, `${slot} required`);
    for (const s of ['minimal', 'typical', 'stress', 'empty']) assert.ok(inv.samples[s], `sample ${s}`);
  });

  test('inventory exposes four css-only conforming Layouts', () => {
    const layouts = layoutsFor('inventory');
    assert.deepEqual(layouts.map((l) => l.name).sort(),
      ['layout-cards', 'layout-editorial', 'layout-ledger', 'layout-timeline']);
    for (const l of layouts) {
      assert.equal(l.satisfies, 'inventory');
      assert.equal(l.kind, 'css-only');
      assert.ok(Array.isArray(l.intent) && l.intent.length, `${l.name} has intent tags`);
    }
  });

  test('layoutClasses() lists every Layout class (for the linter vocab)', () => {
    const classes = layoutClasses();
    for (const n of ['layout-ledger', 'layout-cards', 'layout-timeline', 'layout-editorial']) {
      assert.ok(classes.includes(n), `${n} in layoutClasses`);
    }
  });

  test('every conforming Layout has a styled selector in its contract CSS', () => {
    const css = fs.readFileSync(
      path.join(__dirname, '../../../lib/contracts/inventory/inventory.layouts.css'), 'utf8');
    for (const l of layoutsFor('inventory')) {
      assert.ok(css.includes(`section.${l.name}`), `${l.name} is styled`);
    }
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(css), 'palette-blind: no hex literals');
  });
});
