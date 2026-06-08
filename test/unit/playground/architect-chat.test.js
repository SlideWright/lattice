/**
 * Unit: the Architect chat's pure helpers.
 *
 * The DOM/IndexedDB wiring is verified headless (mock backend, persistence,
 * resume). Here we prove the two pure functions that decide what the model sees
 * and what the floor says — the parts that must be correct regardless of backend:
 *
 *   - buildChatMessages grounds the model in the deck + deterministic findings,
 *     truncates the deck, and shapes roles for the chat API,
 *   - floorReply answers usefully from the deterministic assessment when no
 *     model is loaded (and stays honest about it).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../../docs/src/playground/drawing-board-chat.js');
}

describe('buildChatMessages', () => {
  test('puts a system brief first, history in the middle, the new turn last', async () => {
    const { buildChatMessages } = await load();
    const msgs = buildChatMessages({
      source: '# Deck',
      assessment: { scorecard: { band: 'B+', overall: 82 }, findings: [] },
      history: [
        { role: 'user', content: 'hi' },
        { role: 'architect', content: 'hello' },
      ],
      userText: 'tighten slide 3',
    });
    assert.equal(msgs[0].role, 'system');
    assert.match(msgs[0].content, /Architect/);
    assert.match(msgs[0].content, /B\+ \(82\/100\)/);
    // architect history maps to the assistant role for the chat API.
    assert.deepEqual(msgs.slice(1, 3).map((m) => m.role), ['user', 'assistant']);
    assert.equal(msgs[msgs.length - 1].content, 'tighten slide 3');
    assert.equal(msgs[msgs.length - 1].role, 'user');
  });

  test('embeds findings as grounding and truncates a long deck', async () => {
    const { buildChatMessages } = await load();
    const msgs = buildChatMessages({
      source: 'x'.repeat(9000),
      assessment: {
        scorecard: { band: 'C', overall: 55 },
        findings: [{ severity: 'warning', message: 'label title', slide: 3 }],
      },
      history: [],
      userText: 'help',
    });
    const sys = msgs[0].content;
    assert.match(sys, /label title \(slide 3\)/);
    // deck context is capped (MAX_DECK_CHARS = 4000) so the weakest tier copes.
    assert.ok(sys.length < 6000, 'system prompt bounded by deck truncation');
  });

  test('handles a clean deck and empty history', async () => {
    const { buildChatMessages } = await load();
    const msgs = buildChatMessages({ source: '# D', assessment: { scorecard: { band: 'A', overall: 95 }, findings: [] }, history: null, userText: 'q' });
    assert.match(msgs[0].content, /No mechanical issues found/);
    assert.equal(msgs.length, 2); // system + the user turn
  });

  test('drops deterministic (floor/greeting) messages from model history', async () => {
    const { buildChatMessages } = await load();
    const msgs = buildChatMessages({
      source: '# D',
      assessment: { scorecard: { band: 'B', overall: 80 }, findings: [] },
      history: [
        { role: 'architect', content: 'GREETING boilerplate', det: true }, // dropped
        { role: 'user', content: 'real question' }, // kept
        { role: 'architect', content: 'real model reply' }, // kept (no det)
      ],
      userText: 'next',
    });
    const contents = msgs.map((m) => m.content);
    assert.ok(!contents.includes('GREETING boilerplate'), 'deterministic message is not fed to the model');
    assert.ok(contents.includes('real question') && contents.includes('real model reply'), 'real turns are kept');
  });

  test('keeps the system prompt short (small models drown in a full deck)', async () => {
    const { buildChatMessages } = await load();
    const sys = buildChatMessages({ source: 'x'.repeat(9000), assessment: { scorecard: { band: 'C', overall: 50 }, findings: [] }, history: [], userText: 'q' })[0].content;
    assert.ok(sys.length < 2200, 'deck context capped (~1200) so the small model copes');
  });

  // The cloud tier (Puter/Claude) gets a richer, Lattice-aware prompt: the
  // component primer + the WHOLE deck. The lean path above is unchanged.
  describe('rich (cloud) prompt', () => {
    const catalog = [
      { name: 'title', bucket: 'anchor', summary: 'Opening slide.' },
      { name: 'cards-grid', bucket: 'inventory', summary: '2–4 parallel items.' },
    ];

    test('injects the Lattice primer and the real layout names', async () => {
      const { buildChatMessages } = await load();
      const sys = buildChatMessages({
        source: '# Deck', assessment: { scorecard: { band: 'A', overall: 95 }, findings: [] },
        history: [], userText: 'help', catalog, rich: true,
      })[0].content;
      assert.match(sys, /You know Lattice/);
      assert.match(sys, /cards-grid — 2–4 parallel items\./);
      assert.match(sys, /NESTED bullets/); // the card-style footgun rule rides along
      assert.match(sys, /`_class`/);
    });

    test('injects the editing protocol and [slide N] markers (Slice B)', async () => {
      const { buildChatMessages } = await load();
      const sys = buildChatMessages({
        source: '# One\n\n---\n\n# Two', assessment: { scorecard: { band: 'A', overall: 95 }, findings: [] },
        history: [], userText: 'add a closing', catalog, rich: true,
      })[0].content;
      assert.match(sys, /lattice-edit slide=/); // the protocol example
      assert.match(sys, /\[slide 1\]/); // the deck is shown with addressable markers
      assert.match(sys, /\[slide 2\]/);
    });

    test('includes the WHOLE deck, not the 1200-char peek', async () => {
      const { buildChatMessages } = await load();
      const big = 'slide '.repeat(2000); // ~12k chars, over the lean cap, under the rich one
      const sys = buildChatMessages({
        source: big, assessment: { scorecard: { band: 'B', overall: 80 }, findings: [] },
        history: [], userText: 'q', catalog, rich: true,
      })[0].content;
      assert.ok(sys.length > 9000, 'rich prompt carries the full deck');
    });

    test('without rich it stays lean even if a catalog is passed', async () => {
      const { buildChatMessages } = await load();
      const sys = buildChatMessages({
        source: '# D', assessment: { scorecard: { band: 'A', overall: 95 }, findings: [] },
        history: [], userText: 'q', catalog, // no rich flag
      })[0].content;
      assert.doesNotMatch(sys, /You know Lattice/);
      assert.ok(sys.length < 2200);
    });
  });
});

describe('floorReply (intent-aware, deterministic)', () => {
  const assessment = {
    scorecard: { band: 'B', overall: 78 },
    findings: [
      { severity: 'error', message: 'bad class', slide: 2 },
      { severity: 'warning', message: 'label title', slide: 3 },
      { severity: 'suggestion', message: 'minor nit', slide: 5 },
    ],
  };

  test('a general "thoughts?" reports the score and top (non-suggestion) issues', async () => {
    const { floorReply } = await load();
    const out = floorReply(assessment, 'thoughts on my presentation?');
    assert.match(out, /B \(78\/100\)/);
    assert.match(out, /bad class \(slide 2\)/);
    assert.doesNotMatch(out, /minor nit/); // suggestions aren't surfaced as must-fix
  });

  test('"why model free?" explains the model situation — not the scorecard', async () => {
    const { floorReply } = await load();
    const out = floorReply(assessment, 'model free? why?');
    assert.match(out, /Chrome or Edge|WebGPU|on-device/i);
    assert.doesNotMatch(out, /78\/100/); // answers the question asked, not boilerplate
  });

  test('different questions produce different replies (not one canned string)', async () => {
    const { floorReply } = await load();
    const why = floorReply(assessment, 'why are you model free?');
    const thoughts = floorReply(assessment, 'thoughts on my presentation?');
    assert.notEqual(why, thoughts);
  });

  test('a named slide surfaces that slide’s findings', async () => {
    const { floorReply } = await load();
    const out = floorReply(assessment, 'whats wrong with slide 3?');
    assert.match(out, /slide 3/i);
    assert.match(out, /label title/);
    assert.doesNotMatch(out, /bad class/); // only slide 3's finding
  });

  test('"what should I fix" leads with the actionable findings', async () => {
    const { floorReply } = await load();
    const out = floorReply(assessment, 'what should I fix first?');
    assert.match(out, /bad class/);
    assert.match(out, /label title/);
  });

  test('degrades gracefully with no assessment', async () => {
    const { floorReply } = await load();
    const out = floorReply(null, 'hi');
    assert.match(out, /start writing|no deck/i);
  });
});
