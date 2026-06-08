/**
 * Headless integration: the Converse editing loop end-to-end (Slice B). A mock
 * Puter backend returns a reply carrying an EDIT BLOCK; this proves the chat lifts
 * it into a diff card, shows only the prose in the bubble, and that clicking Apply
 * splices the right slide into the editor via applyFix. The pure splice/parse/diff
 * is covered in architect-edits.test.js — here we nail the DOM wiring + gating.
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

const DECK = '# Intro\n\nopening\n\n---\n\n# Plan\n\nold body';

async function setup({ reply, generation = 'puter' }) {
  const { createChat } = await import('../../../docs/src/playground/drawing-board-chat.js');
  const mount = document.createElement('div');
  const composer = document.createElement('form');
  composer.innerHTML = '<textarea></textarea><button type="submit">↑</button>';
  document.body.append(mount, composer);

  let source = DECK;
  const applied = [];
  const model = {
    availability: () => ({ generation, modelOn: true }),
    async complete() { return reply; },
  };
  const chat = createChat({
    mount, composer, model,
    getAssessment: () => ({ source, scorecard: { band: 'A', overall: 92 }, findings: [] }),
    getSource: () => source,
    applyFix: (next) => { applied.push(next); source = next; },
  });
  return { chat, mount, applied, getSource: () => source };
}

describe('Converse editing loop (DOM)', () => {
  test('a replace block becomes a diff card; the bubble shows only prose', async () => {
    const reply = 'Tightened the plan slide.\n\n````lattice-edit slide=2\n# Plan\n\nnew sharper body\n````';
    const { chat, mount } = await setup({ reply });
    await chat.send('tighten slide 2');

    assert.doesNotMatch(mount.textContent, /lattice-edit/, 'fence stripped from the bubble');
    assert.match(mount.querySelector('.db-msg-architect .db-msg-body').textContent, /Tightened the plan slide\./);
    const card = mount.querySelector('.db-edit-card');
    assert.ok(card, 'an edit card rendered');
    assert.match(card.querySelector('.db-edit-head').textContent, /Replace slide 2/);
    // the diff shows the added + removed lines
    assert.ok(card.querySelector('.db-diff-add'), 'an added line is shown');
    assert.ok(card.querySelector('.db-diff-del'), 'a removed line is shown');
  });

  test('Apply splices the slide into the editor; slide 1 is preserved', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nnew sharper body\n````';
    const { chat, mount, applied, getSource } = await setup({ reply });
    await chat.send('go');

    const apply = mount.querySelector('.db-edit-card .db-btn-primary');
    apply.click();
    assert.equal(applied.length, 1);
    assert.match(getSource(), /new sharper body/);
    assert.doesNotMatch(getSource(), /old body/);
    assert.match(getSource(), /# Intro\n\nopening/, 'slide 1 untouched');
    assert.match(apply.textContent, /Applied/);
    assert.ok(apply.disabled, 'Apply is disabled after applying');
  });

  test('Discard removes the card without touching the deck', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nx\n````';
    const { chat, mount, applied } = await setup({ reply });
    await chat.send('go');
    mount.querySelector('.db-edit-card .db-btn:not(.db-btn-primary)').click();
    assert.equal(mount.querySelector('.db-edit-card'), null, 'card removed');
    assert.equal(applied.length, 0, 'nothing applied');
  });

  test('a non-Puter tier never parses edits (no cards)', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nx\n````';
    const { chat, mount } = await setup({ reply, generation: 'transformers' });
    await chat.send('go');
    assert.equal(mount.querySelector('.db-edit-card'), null, 'edits gated to the cloud tier');
  });

  test('a plain reply (no block) renders as an ordinary message', async () => {
    const { chat, mount } = await setup({ reply: 'Looks solid — strong open, clear ask.' });
    await chat.send('thoughts?');
    assert.equal(mount.querySelector('.db-edit-card'), null);
    assert.match(mount.querySelector('.db-msg-architect').textContent, /strong open/);
  });
});
