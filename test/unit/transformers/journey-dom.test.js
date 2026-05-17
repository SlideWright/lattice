/**
 * Unit tests for the journey transformer's applyToDom (DOM-walk path).
 *
 * applyToDom delegates to engine.transformJourneySection — same kernel
 * marp.config.js and lattice-emulator.js use. These tests verify the
 * delegation produces a journey-board DOM with the expected structure
 * (section header, swimlanes, etc.) and is idempotent.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const journey = require('../../../lib/transformers/journey');

function makeDoc(bodyHtml) {
  const dom = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`);
  return dom.window.document;
}

describe('journey.applyToDom', () => {
  test('rewrites a journey section\'s outer <ul> into .journey-board', () => {
    const doc = makeDoc(`
      <section class="journey">
        <h2>Customer onboarding</h2>
        <ul>
          <li>Evaluate
            <ul>
              <li>Read case study <code>prospect</code> <code>1</code></li>
            </ul>
          </li>
          <li>Trial
            <ul>
              <li>Trial signup <code>prospect</code> <code>3</code></li>
            </ul>
          </li>
        </ul>
      </section>
    `);
    journey.applyToDom(doc);
    const board = doc.querySelector('section.journey > .journey-board');
    assert.ok(board, 'journey-board wrapper present');
    // The board carries a journey-sections row (one entry per top-level li).
    const sections = board.querySelectorAll('.journey-sections > li');
    assert.ok(sections.length >= 1, 'at least one section ribbon');
  });

  test('passes through non-journey sections', () => {
    const doc = makeDoc(`
      <section class="content"><h2>plain</h2><p>nothing.</p></section>
    `);
    const before = doc.querySelector('section.content').outerHTML;
    journey.applyToDom(doc);
    const after = doc.querySelector('section.content').outerHTML;
    assert.equal(after, before);
  });

  test('idempotent: a second pass is a no-op', () => {
    const doc = makeDoc(`
      <section class="journey">
        <h2>Test</h2>
        <ul>
          <li>Phase A
            <ul><li>Task <code>actor</code> <code>3</code></li></ul>
          </li>
        </ul>
      </section>
    `);
    journey.applyToDom(doc);
    const once = doc.querySelector('section.journey').innerHTML;
    journey.applyToDom(doc);
    const twice = doc.querySelector('section.journey').innerHTML;
    assert.equal(twice, once);
  });

  test('skips sections whose <ul> is missing', () => {
    const doc = makeDoc(`<section class="journey"><h2>Empty</h2></section>`);
    const before = doc.querySelector('section.journey').innerHTML;
    journey.applyToDom(doc);
    const after = doc.querySelector('section.journey').innerHTML;
    assert.equal(after, before, 'no-ul section unchanged');
  });

  test('safely returns on null / non-DOM root', () => {
    assert.doesNotThrow(() => journey.applyToDom(null));
    assert.doesNotThrow(() => journey.applyToDom(undefined));
    assert.doesNotThrow(() => journey.applyToDom({}));
  });
});
