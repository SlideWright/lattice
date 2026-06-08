/**
 * Unit: the Coach console's intro slot — the Architect's post-onboarding "talk
 * back". After the Coach-vs-Converse reframe, Coach is the default mode and the
 * Converse thread is hidden under it, so the greeting MUST land in a Coach-visible
 * slot. This proves it renders there, collapses when empty, and clears the moment
 * the user engages a chip. The chips→cards path is covered by coach-actions.test.js.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

let dom;
before(() => {
  dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.com/' });
  global.document = dom.window.document;
  global.window = dom.window;
});
after(() => { delete global.document; delete global.window; });

async function mount() {
  const { createCoachConsole } = await import('../../../docs/src/playground/coach-console.js');
  const chipsHost = document.createElement('div');
  const cardHost = document.createElement('div');
  const introHost = document.createElement('p');
  const console_ = createCoachConsole({
    chipsHost, cardHost, introHost,
    getAssessment: () => ({ scorecard: { band: 'B', overall: 80 }, findings: [] }),
    getSource: () => '# Deck\n\nbody',
  });
  return { console_, chipsHost, cardHost, introHost };
}

describe('Coach console — intro slot', () => {
  test('intro() renders the Architect greeting into the Coach-visible slot', async () => {
    const { console_, introHost } = await mount();
    console_.intro('Built the structure — 6 slides.');
    assert.equal(introHost.textContent, 'Built the structure — 6 slides.');
  });

  test('clearIntro() empties the slot (CSS collapses it when empty)', async () => {
    const { console_, introHost } = await mount();
    console_.intro('hello');
    console_.clearIntro();
    assert.equal(introHost.textContent, '');
  });

  test('engaging a chip clears the intro — the greeting is a one-shot', async () => {
    const { console_, chipsHost, introHost } = await mount();
    console_.intro('Blank canvas — go.');
    assert.equal(chipsHost.children.length, 5); // the five action chips rendered
    chipsHost.children[0].click(); // "Top fixes"
    assert.equal(introHost.textContent, '', 'intro cleared once the user acts');
  });

  test('intro(null) clears, and a missing introHost is a no-op (no throw)', async () => {
    const { createCoachConsole } = await import('../../../docs/src/playground/coach-console.js');
    const { console_, introHost } = await mount();
    console_.intro('x');
    console_.intro(null);
    assert.equal(introHost.textContent, '');
    // No introHost → intro/clearIntro must be safe no-ops.
    const bare = createCoachConsole({
      chipsHost: document.createElement('div'), cardHost: document.createElement('div'),
      getAssessment: () => ({}), getSource: () => '',
    });
    assert.doesNotThrow(() => { bare.intro('y'); bare.clearIntro(); });
  });
});
