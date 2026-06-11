/**
 * Unit: lib/layout/starters.js — every starter must be a gate-clean draft, so a
 * malformed starter can't ship (the Form-layer parallel of the theme starters
 * test). Runs each through the SAME gateComponent() the studio uses.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { STARTERS, getStarter } = require('../../../lib/layout/starters.js');
const { gateComponent } = require('../../../lib/layout/gate.js');
const { scaffoldFiles } = require('../../../lib/layout/scaffold.js');

describe('layout starters', () => {
  test('there is a non-empty starter library', () => {
    assert.ok(STARTERS.length >= 3);
  });

  for (const s of STARTERS) {
    test(`starter "${s.name}" passes every gate`, () => {
      const r = gateComponent({ css: s.css, manifest: s, skeleton: s.skeleton });
      assert.equal(r.ok, true, `gate errors: ${JSON.stringify(r.errors)}`);
    });
    test(`starter "${s.name}" scaffolds without throwing`, () => {
      const files = scaffoldFiles({ css: s.css, manifest: s, skeleton: s.skeleton });
      assert.ok(files[`${s.name}.styles.css`]);
    });
  }

  test('starter names are unique', () => {
    assert.equal(new Set(STARTERS.map(s => s.name)).size, STARTERS.length);
  });

  test('getStarter looks one up', () => {
    assert.equal(getStarter(STARTERS[0].name).label, STARTERS[0].label);
    assert.equal(getStarter('nope'), undefined);
  });
});
