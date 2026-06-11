/**
 * Unit: lib/theme/ai.js — the Theme Studio AI tier's pure pieces.
 *
 * The model only PROPOSES; this layer turns a (possibly messy) reply into a
 * valid essential set, and the deterministic derivation disposes. Tested
 * end-to-end with a fake model reply: reply → coerce → derive → contrast-clean,
 * the same shape the note's "Mock-tested" verification stance calls for.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { seedMessages, refineMessages, coerceEssentials } = require('../../../lib/theme/ai.js');
const { deriveTheme, ESSENTIAL_KEYS } = require('../../../lib/theme/derive.js');
const { auditBoth } = require('../../../lib/theme/contrast.js');
const { STARTERS } = require('../../../lib/theme/starters.js');

const FALLBACK = STARTERS[0].essentials;

describe('theme-ai', () => {
  test('seedMessages carries the description and the JSON contract', () => {
    const msgs = seedMessages('warm editorial, terracotta');
    assert.equal(msgs[0].role, 'system');
    assert.match(msgs[0].content, /JSON/i);
    for (const k of ESSENTIAL_KEYS) assert.match(msgs[0].content, new RegExp(`"${k}"`));
    assert.equal(msgs[1].content, 'warm editorial, terracotta');
  });

  test('seedMessages falls back to a default brief when empty', () => {
    assert.ok(seedMessages('').at(-1).content.length > 0);
    assert.ok(seedMessages(null).at(-1).content.length > 0);
  });

  test('refineMessages threads the current palette + instruction', () => {
    const msgs = refineMessages(FALLBACK, 'cooler, more contrast');
    assert.equal(msgs[1].role, 'assistant');
    assert.deepEqual(JSON.parse(msgs[1].content), FALLBACK);
    assert.match(msgs[2].content, /cooler, more contrast/);
  });

  test('coerceEssentials accepts a clean object and derives contrast-clean', () => {
    const reply = { ...STARTERS[1].essentials };
    const { essentials, ok, filled } = coerceEssentials(reply, FALLBACK);
    assert.ok(ok);
    assert.deepEqual(filled, []);
    assert.ok(auditBoth(deriveTheme(essentials)).ok, 'AI-seeded theme not AA-clean');
  });

  test('coerceEssentials parses a JSON string (incl. prose-wrapped)', () => {
    const json = JSON.stringify(STARTERS[2].essentials);
    assert.ok(coerceEssentials(json, FALLBACK).ok);
    const wrapped = 'Here is your palette:\n```json\n' + json + '\n```\nEnjoy!';
    const r = coerceEssentials(wrapped, FALLBACK);
    assert.ok(r.ok, 'should extract the JSON object from surrounding prose');
  });

  test('coerceEssentials remaps aliased / snake_case keys', () => {
    const reply = {
      background: '#ffffff', bg_alt: '#eeeeee', heading: '#111111', body: '#333333',
      muted: '#999999', accent: '#2244cc', 'accent-soft': '#e7ecfb',
      success: '#1f7a4d', warning: '#b26a00', error: '#c0392b',
    };
    const { essentials, ok } = coerceEssentials(reply, FALLBACK);
    assert.ok(ok, 'aliased keys should all map');
    assert.equal(essentials.bg, '#ffffff');
    assert.equal(essentials.accentSoft, '#e7ecfb');
    assert.equal(essentials.fail, '#c0392b');
  });

  test('coerceEssentials fills missing/malformed keys from the fallback', () => {
    const reply = { bg: '#ffffff', accent: 'not-a-color', /* rest missing */ };
    const { essentials, filled, applied, ok } = coerceEssentials(reply, FALLBACK);
    assert.ok(!ok, 'incomplete reply is not ok');
    assert.ok(filled.includes('accent'), 'malformed accent → fallback');
    assert.ok(filled.includes('warn'), 'missing warn → fallback');
    assert.ok(applied.includes('bg'));
    assert.equal(essentials.accent, FALLBACK.accent);
    // still a complete, derivable set
    assert.ok(auditBoth(deriveTheme(essentials)).ok);
  });

  test('coerceEssentials on a no-model floor (echoed fallback) reads not-ok', () => {
    // The adapter floors json:true to the fallback object — every key equals
    // the fallback, so applied>0 but it is the SAME palette: treat as no-op.
    const r = coerceEssentials({}, FALLBACK); // empty reply ≈ floor
    assert.ok(!r.ok);
    assert.equal(r.applied.length, 0);
  });
});
