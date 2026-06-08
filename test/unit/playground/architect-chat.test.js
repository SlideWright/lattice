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
    assert.match(msgs[0].content, /none — the deck is clean/);
    assert.equal(msgs.length, 2); // system + the user turn
  });
});

describe('floorReply', () => {
  test('reports the deterministic score and top issues, honestly model-free', async () => {
    const { floorReply } = await load();
    const out = floorReply({
      scorecard: { band: 'B', overall: 78 },
      findings: [
        { severity: 'error', message: 'bad class', slide: 2 },
        { severity: 'suggestion', message: 'minor', slide: 5 },
      ],
    });
    assert.match(out, /model-free/i);
    assert.match(out, /B \(78\/100\)/);
    assert.match(out, /bad class \(slide 2\)/);
    assert.doesNotMatch(out, /minor/); // suggestions are not surfaced as must-fix
  });

  test('degrades gracefully with no assessment', async () => {
    const { floorReply } = await load();
    const out = floorReply(null);
    assert.match(out, /model-free/i);
    assert.match(out, /enable on-device AI/i);
  });
});
