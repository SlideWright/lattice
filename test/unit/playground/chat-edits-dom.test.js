/**
 * Headless integration: the Converse editing loop + its polish (Slice B + polish).
 * A mock Puter backend returns replies carrying EDIT BLOCKS; this proves the chat
 * lifts them into diff cards, renders the prose as Markdown, and that the lifecycle
 * (Apply → collapse, Discard, batch Apply all / Dismiss all, single-level Undo)
 * behaves. The pure splice/parse/diff is covered in architect-edits.test.js.
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
  const applies = []; // onApply (auto-checkpoint) events
  const model = {
    availability: () => ({ generation, modelOn: true }),
    async complete() { return reply; },
  };
  const chat = createChat({
    mount, composer, model,
    getAssessment: () => ({ source, scorecard: { band: 'A', overall: 92 }, findings: [] }),
    getSource: () => source,
    applyFix: (next) => { applied.push(next); source = next; },
    onApply: (e) => applies.push(e),
  });
  return { chat, mount, applied, applies, getSource: () => source };
}

describe('Converse editing loop (DOM)', () => {
  test('a replace block becomes a diff card; the bubble renders Markdown prose', async () => {
    const reply = 'Tightened the **plan** slide.\n\n````lattice-edit slide=2\n# Plan\n\nnew sharper body\n````';
    const { chat, mount } = await setup({ reply });
    await chat.send('tighten slide 2');

    const body = mount.querySelector('.db-msg-architect .db-msg-body');
    assert.doesNotMatch(body.textContent, /lattice-edit/, 'fence stripped from the bubble');
    assert.match(body.innerHTML, /<strong>plan<\/strong>/, 'Markdown rendered, not raw');
    const card = mount.querySelector('.db-edit-card');
    assert.ok(card, 'an edit card rendered');
    assert.match(card.querySelector('.db-edit-title').textContent, /Replace slide 2/);
    assert.ok(card.querySelector('.db-diff-add') && card.querySelector('.db-diff-del'), 'diff shown');
  });

  test('Apply collapses the card to a status line and reveals Undo', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nnew sharper body\n````';
    const { chat, mount, getSource } = await setup({ reply });
    await chat.send('go');

    const card = mount.querySelector('.db-edit-card');
    card.querySelector('.db-edit-actions .db-btn-primary').click();
    assert.equal(card.dataset.state, 'applied');
    assert.ok(card.classList.contains('is-collapsed'), 'collapses to a status line');
    assert.ok(card.querySelector('.db-edit-icon').classList.contains('ico-check'), 'applied glyph (Lucide check)');
    assert.ok(!card.querySelector('.db-edit-undo').hidden, 'Undo is offered');
    assert.match(getSource(), /new sharper body/);
    assert.match(getSource(), /# Intro\n\nopening/, 'slide 1 untouched');
  });

  test('Undo restores the deck and re-opens the card', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nnew body\n````';
    const { chat, mount, getSource } = await setup({ reply });
    await chat.send('go');
    const card = mount.querySelector('.db-edit-card');
    card.querySelector('.db-edit-actions .db-btn-primary').click();
    card.querySelector('.db-edit-undo').click();
    assert.equal(card.dataset.state, 'open', 're-opened');
    assert.match(getSource(), /old body/, 'deck restored');
    assert.doesNotMatch(getSource(), /new body/);
  });

  test('Apply fires onApply with the PRE-edit deck + a label (auto-checkpoint hook)', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nnew body\n````';
    const { chat, mount, applies } = await setup({ reply });
    await chat.send('go');
    mount.querySelector('.db-edit-card .db-edit-actions .db-btn-primary').click();
    assert.equal(applies.length, 1);
    assert.equal(applies[0].before, DECK, 'snapshots the deck before the edit');
    assert.match(applies[0].label, /Replace slide 2/);
  });

  test('Discard collapses to a dismissed line without touching the deck', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nx\n````';
    const { chat, mount, applied } = await setup({ reply });
    await chat.send('go');
    const card = mount.querySelector('.db-edit-card');
    card.querySelector('.db-edit-actions .db-btn:not(.db-btn-primary)').click();
    assert.equal(card.dataset.state, 'dismissed');
    assert.equal(applied.length, 0, 'nothing applied');
  });
});

describe('batch controls (multi-edit reply)', () => {
  const TWO = 'Two tweaks.\n\n````lattice-edit slide=1\n# Intro!\n````\n\n````lattice-edit slide=2\n# Plan!\n````';

  test('a 2+ edit reply gets a batch header; Apply all applies every card', async () => {
    const { chat, mount, getSource } = await setup({ reply: TWO });
    await chat.send('improve both');
    const batch = mount.querySelector('.db-edit-batch');
    assert.ok(batch, 'batch header present');
    assert.match(batch.querySelector('.db-edit-batch-label').textContent, /2 proposed edits/);

    batch.querySelector('.db-btn-primary').click(); // Apply all
    assert.match(getSource(), /# Intro!/);
    assert.match(getSource(), /# Plan!/);
    assert.equal([...mount.querySelectorAll('.db-edit-card')].every((c) => c.dataset.state === 'applied'), true);
    assert.match(batch.querySelector('.db-edit-batch-label').textContent, /Applied 2 edits/);
    assert.ok(!batch.querySelector('.db-edit-undo').hidden, 'batch Undo offered');
  });

  test('Apply all fires a single onApply for the batch (one checkpoint)', async () => {
    const { chat, mount, applies } = await setup({ reply: TWO });
    await chat.send('go');
    mount.querySelector('.db-edit-batch .db-btn-primary').click(); // Apply all
    assert.equal(applies.length, 1, 'one checkpoint for the whole batch');
    assert.equal(applies[0].before, DECK);
    assert.match(applies[0].label, /Apply all · 2 edits/);
  });

  test('batch Undo reverts the whole batch in one step', async () => {
    const { chat, mount, getSource } = await setup({ reply: TWO });
    await chat.send('go');
    const batch = mount.querySelector('.db-edit-batch');
    batch.querySelector('.db-btn-primary').click(); // Apply all
    batch.querySelector('.db-edit-undo').click(); // Undo
    assert.equal(getSource(), DECK, 'deck fully restored');
    assert.equal([...mount.querySelectorAll('.db-edit-card')].every((c) => c.dataset.state === 'open'), true);
  });

  test('Dismiss all dismisses every open card, applying nothing', async () => {
    const { chat, mount, applied } = await setup({ reply: TWO });
    await chat.send('go');
    const batch = mount.querySelector('.db-edit-batch');
    batch.querySelector('.db-btn:not(.db-btn-primary)').click(); // Dismiss all
    assert.equal([...mount.querySelectorAll('.db-edit-card')].every((c) => c.dataset.state === 'dismissed'), true);
    assert.equal(applied.length, 0);
  });

  test('single-level undo: applying a second edit locks the first card’s Undo', async () => {
    const { chat, mount } = await setup({ reply: TWO });
    await chat.send('go');
    const [c1, c2] = mount.querySelectorAll('.db-edit-card');
    c1.querySelector('.db-edit-actions .db-btn-primary').click(); // apply card 1 → its Undo shows
    assert.ok(!c1.querySelector('.db-edit-undo').hidden);
    c2.querySelector('.db-edit-actions .db-btn-primary').click(); // apply card 2 → card 1 Undo locks
    assert.ok(c1.querySelector('.db-edit-undo').hidden, 'older Undo locked');
    assert.ok(!c2.querySelector('.db-edit-undo').hidden, 'newest Apply owns Undo');
  });
});

describe('gating + plain replies', () => {
  test('a non-Puter tier never parses edits (no cards)', async () => {
    const reply = '````lattice-edit slide=2\n# Plan\n\nx\n````';
    const { chat, mount } = await setup({ reply, generation: 'transformers' });
    await chat.send('go');
    assert.equal(mount.querySelector('.db-edit-card'), null);
  });

  test('a plain reply renders as an ordinary Markdown message', async () => {
    const { chat, mount } = await setup({ reply: 'Looks solid — strong open, clear ask.' });
    await chat.send('thoughts?');
    assert.equal(mount.querySelector('.db-edit-card'), null);
    assert.match(mount.querySelector('.db-msg-architect').textContent, /strong open/);
  });
});
