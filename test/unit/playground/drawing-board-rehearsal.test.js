/**
 * Unit: the Rehearsal planner — Practice mode's brain.
 *
 * The deterministic floor must always produce a sane plan (timing + beats), and
 * the AI merge must only ever IMPROVE the floor — never break it, never trust a
 * malformed model response. These guarantees are what let Practice ship the
 * model-on path without a model present.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
  return import('../../../docs/src/playground/drawing-board-rehearsal.js');
}

const DECK = [
  '# New deck\n<!-- _class: title -->\nBudget proposal',
  '<!-- _class: divider -->\n## Where we are',
  '<!-- _class: big-number -->\n$2.4B total revenue',
  '<!-- _class: quote -->\n"One line, felt not rushed."',
  '<!-- _class: decision -->\nApprove the FY27 budget.',
  '<!-- _class: closing -->\nThank you. Questions?',
].join('\n\n---\n\n');

describe('parseSlides', () => {
  test('splits on --- and drops front matter', async () => {
    const { parseSlides } = await load();
    const withFm = '---\ntheme: x\n---\n\n# A\n\n---\n\n# B';
    assert.equal(parseSlides(withFm).length, 2);
  });
});

describe('buildDeterministicPlan', () => {
  test('produces one slide-plan per slide with positive targets summing to the length', async () => {
    const { buildDeterministicPlan } = await load();
    const p = buildDeterministicPlan(DECK, 10);
    assert.equal(p.slides.length, 6);
    assert.equal(p.source, 'deterministic');
    const sum = p.slides.reduce((a, s) => a + s.target, 0);
    assert.ok(Math.abs(sum - 600) < 1, `targets should sum to 600s, got ${sum}`);
    assert.ok(p.slides.every((s) => s.target > 0));
  });

  test('classifies roles and assigns matching beats', async () => {
    const { buildDeterministicPlan } = await load();
    const p = buildDeterministicPlan(DECK, 10);
    assert.equal(p.slides[0].role, 'open');
    assert.equal(p.slides[1].role, 'section');
    assert.equal(p.slides[2].role, 'data');
    assert.equal(p.slides[3].role, 'quote');
    assert.equal(p.slides[4].role, 'decision');
    assert.equal(p.slides[5].role, 'close');
    // the ask is the slowest slide
    const maxTarget = Math.max(...p.slides.map((s) => s.target));
    assert.equal(p.slides[4].target, maxTarget);
    // data slide cues a pause + a look-up
    assert.ok(p.slides[2].beats.some((b) => b.kind === 'pause'));
    assert.ok(p.slides[2].beats.some((b) => b.kind === 'eye'));
  });

  test('suggests a length from spoken density', async () => {
    const { buildDeterministicPlan } = await load();
    const p = buildDeterministicPlan(DECK, 10);
    assert.ok(p.suggestMinutes >= 1);
  });
});

describe('mergeAiPlan', () => {
  test('overrides why/target/beats and re-normalises to the length', async () => {
    const { buildDeterministicPlan, mergeAiPlan } = await load();
    const floor = buildDeterministicPlan(DECK, 10);
    const ai = {
      slides: [
        { i: 0, why: 'Custom open rationale', target: 30, beats: [{ at: 0.1, kind: 'eye', text: 'Look up', hold: 3 }] },
        { i: 4, why: 'The ask', target: 200, beats: [{ at: 0.5, kind: 'pause', text: 'State it', hold: 4 }] },
      ],
    };
    const merged = mergeAiPlan(floor, ai);
    assert.equal(merged.source, 'ai');
    assert.equal(merged.slides[0].why, 'Custom open rationale');
    assert.equal(merged.slides[0].beats[0].kind, 'eye');
    // untouched slides keep the floor
    assert.equal(merged.slides[1].why, floor.slides[1].why);
    // still sums to the requested length
    const sum = merged.slides.reduce((a, s) => a + s.target, 0);
    assert.ok(Math.abs(sum - 600) < 1, `got ${sum}`);
  });

  test('rejects malformed beats and out-of-range values, keeping the floor sane', async () => {
    const { buildDeterministicPlan, mergeAiPlan } = await load();
    const floor = buildDeterministicPlan(DECK, 10);
    const ai = {
      slides: [
        { i: 0, why: '', target: -5, beats: [{ at: 9, kind: 'nope', text: '' }, { at: 0.5, kind: 'pause', text: 'ok', hold: 99 }] },
      ],
    };
    const merged = mergeAiPlan(floor, ai);
    // empty why → floor why kept
    assert.equal(merged.slides[0].why, floor.slides[0].why);
    // only the valid beat survives, hold clamped into range
    assert.equal(merged.slides[0].beats.length, 1);
    assert.equal(merged.slides[0].beats[0].kind, 'pause');
    assert.ok(merged.slides[0].beats[0].hold <= 8);
    assert.ok(merged.slides.every((s) => s.target > 0));
  });

  test('returns null for an empty/garbage response so the floor stands', async () => {
    const { buildDeterministicPlan, mergeAiPlan } = await load();
    const floor = buildDeterministicPlan(DECK, 10);
    assert.equal(mergeAiPlan(floor, {}), null);
    assert.equal(mergeAiPlan(floor, { slides: [] }), null);
    assert.equal(mergeAiPlan(floor, null), null);
  });
});

describe('createRehearsalPlanner', () => {
  test('floors instantly with no model; refined resolves null', async () => {
    const { createRehearsalPlanner } = await load();
    const planner = createRehearsalPlanner({});
    const { det, refined } = planner.plan(DECK, 10);
    assert.equal(det.slides.length, 6);
    assert.equal(await refined, null);
  });

  test('uses the model when a real backend is live, and caches per (deck+minutes)', async () => {
    const { createRehearsalPlanner } = await load();
    let calls = 0;
    const model = {
      availability: () => ({ modelOn: true, generation: 'mock' }),
      complete: async () => { calls++; return { slides: [{ i: 0, why: 'AI open', target: 60 }] }; },
    };
    const planner = createRehearsalPlanner({ model });
    const first = planner.plan(DECK, 10);
    const aiPlan = await first.refined;
    assert.equal(aiPlan.source, 'ai');
    assert.equal(aiPlan.slides[0].why, 'AI open');
    assert.equal(calls, 1);
    // same deck + minutes → served from cache, no second model call
    const second = planner.plan(DECK, 10);
    assert.equal(await second.refined, aiPlan);
    assert.equal(calls, 1);
    // changed length → re-assessed
    planner.plan(DECK, 12);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(calls, 2);
  });

  test('a floor-only model is not called', async () => {
    const { createRehearsalPlanner } = await load();
    let calls = 0;
    const model = { availability: () => ({ modelOn: true, generation: 'floor' }), complete: async () => { calls++; return {}; } };
    const planner = createRehearsalPlanner({ model });
    assert.equal(await planner.plan(DECK, 10).refined, null);
    assert.equal(calls, 0);
  });
});
