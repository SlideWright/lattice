/**
 * Unit: the Drawing Board deck-setup module's pure front-matter helpers.
 *
 * The drawer DOM (createConfigPanel) is verified headless. Here we prove the
 * pure, fs-free parse/serialize pair the controls read + write through:
 * readFrontMatter (pre-fill the form) and writeFrontMatter (rewrite the deck
 * source for one field). No DOM, no storage — the module loads in Node.
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

const MOD = '../../../docs/src/playground/drawing-board-config.js';

// A deck with no front matter — the Drawing Board's normal "clean" state.
const CLEAN = '<!-- _class: title silent -->\n\n# A new deck\n\nStart sketching.\n';

describe('readFrontMatter', () => {
  test('a deck with no block → all defaults, not configured', async () => {
    const { readFrontMatter } = await import(MOD);
    const fm = readFrontMatter(CLEAN);
    assert.equal(fm.size, '16:9');
    assert.equal(fm.paginate, false);
    assert.equal(fm.header, '');
    assert.equal(fm.footer, '');
    assert.equal(fm.class, '');
    assert.equal(fm.math, '');
    assert.equal(fm.lang, '');
    assert.equal(fm.configured, false);
  });

  test('parses a real block, quoted values, and booleans', async () => {
    const { readFrontMatter } = await import(MOD);
    const src = '---\nmarp: true\nsize: 4K\npaginate: true\nheader: "Lattice · Board"\n---\n\n# Deck\n';
    const fm = readFrontMatter(src);
    assert.equal(fm.size, '4K');
    assert.equal(fm.paginate, true);
    assert.equal(fm.header, 'Lattice · Board');
    assert.equal(fm.configured, true);
  });

  test('a block with only marp: true is not "configured"', async () => {
    const { readFrontMatter } = await import(MOD);
    const fm = readFrontMatter('---\nmarp: true\n---\n\n# Deck\n');
    assert.equal(fm.configured, false);
  });
});

describe('writeFrontMatter', () => {
  test('adds a managed block to a clean deck, body preserved', async () => {
    const { writeFrontMatter } = await import(MOD);
    const out = writeFrontMatter(CLEAN, 'paginate', true);
    assert.equal(out, '---\nmarp: true\npaginate: true\n---\n\n' + CLEAN);
    assert.ok(out.startsWith('---\nmarp: true\npaginate: true\n---\n'));
    assert.ok(out.includes('<!-- _class: title silent -->'));
  });

  test('always leads the block with marp: true so an exported .md renders', async () => {
    const { writeFrontMatter } = await import(MOD);
    const out = writeFrontMatter(CLEAN, 'size', '4K');
    assert.ok(/^---\nmarp: true\nsize: 4K\n---\n/.test(out));
  });

  test('emits in canonical order regardless of write order', async () => {
    const { writeFrontMatter } = await import(MOD);
    let src = writeFrontMatter(CLEAN, 'footer', 'Confidential');
    src = writeFrontMatter(src, 'paginate', true);
    src = writeFrontMatter(src, 'size', '4K');
    const block = src.slice(0, src.indexOf('\n---\n'));
    assert.equal(block, '---\nmarp: true\nsize: 4K\npaginate: true\nfooter: Confidential');
  });

  test('quotes a value containing a colon (would break a flat YAML read)', async () => {
    const { writeFrontMatter } = await import(MOD);
    const out = writeFrontMatter(CLEAN, 'header', 'Q3: Board Review');
    assert.ok(out.includes('header: "Q3: Board Review"'));
  });

  test('leaves a plain header bare (no needless quotes)', async () => {
    const { writeFrontMatter } = await import(MOD);
    const out = writeFrontMatter(CLEAN, 'header', 'Lattice · Board Review');
    assert.ok(out.includes('header: Lattice · Board Review\n'));
  });

  test('setting a field back to its default removes just that key', async () => {
    const { writeFrontMatter } = await import(MOD);
    let src = writeFrontMatter(CLEAN, 'size', '4K');
    src = writeFrontMatter(src, 'paginate', true);
    src = writeFrontMatter(src, 'size', '16:9'); // back to default
    assert.ok(!src.includes('size:'));
    assert.ok(src.includes('paginate: true'));
  });

  test('clearing the last managed field drops the block entirely (back to clean)', async () => {
    const { writeFrontMatter } = await import(MOD);
    const withBlock = writeFrontMatter(CLEAN, 'paginate', true);
    const cleared = writeFrontMatter(withBlock, 'paginate', false);
    assert.equal(cleared, CLEAN);
  });

  test('math: only mathjax is written; katex/empty is the default and omitted', async () => {
    const { writeFrontMatter } = await import(MOD);
    assert.ok(writeFrontMatter(CLEAN, 'math', 'mathjax').includes('math: mathjax'));
    assert.equal(writeFrontMatter(CLEAN, 'math', 'katex'), CLEAN);
    assert.equal(writeFrontMatter(CLEAN, 'math', ''), CLEAN);
  });

  test('preserves unmanaged keys (style, backgroundColor) on write-back', async () => {
    const { writeFrontMatter } = await import(MOD);
    const src = '---\nmarp: true\nbackgroundColor: "#000"\nstyle: section{}\n---\n\n# Deck\n';
    const out = writeFrontMatter(src, 'paginate', true);
    assert.ok(out.includes('backgroundColor: "#000"'));
    assert.ok(out.includes('style: section{}'));
    assert.ok(out.includes('paginate: true'));
  });

  test('round-trips: write then read returns the same field value', async () => {
    const { writeFrontMatter, readFrontMatter } = await import(MOD);
    const out = writeFrontMatter(CLEAN, 'footer', 'Q3: notes');
    assert.equal(readFrontMatter(out).footer, 'Q3: notes');
  });

  test('updates an existing key in place rather than duplicating it', async () => {
    const { writeFrontMatter } = await import(MOD);
    let src = writeFrontMatter(CLEAN, 'header', 'First');
    src = writeFrontMatter(src, 'header', 'Second');
    assert.equal((src.match(/header:/g) || []).length, 1);
    assert.ok(src.includes('header: Second'));
  });
});

describe('createConfigPanel (DOM)', () => {
  let dom;
  before(() => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.com/' });
    global.document = dom.window.document;
    global.window = dom.window;
  });
  after(() => { delete global.document; delete global.window; });

  // A tiny editor stand-in: holds the source, hands it out, takes it back.
  function mount(initial) {
    let source = initial;
    const host = document.createElement('div');
    const trigger = document.createElement('button');
    return import(MOD).then(({ createConfigPanel }) => {
      const panel = createConfigPanel({
        host,
        trigger,
        getSource: () => source,
        setSource: (next) => { source = next; },
      });
      return { panel, host, trigger, get: () => source };
    });
  }

  test('renders controls pre-filled from the deck front matter', async () => {
    const { panel, host } = await mount('---\nmarp: true\nsize: 4K\npaginate: true\n---\n\n# Deck\n');
    panel.render();
    const size = host.querySelector('select');
    assert.equal(size.value, '4K', 'size select reflects the deck');
    const paginate = host.querySelector('.db-switch-input');
    assert.equal(paginate.checked, true, 'paginate switch reflects the deck');
  });

  test('toggling the paginate switch writes it into the source', async () => {
    const { panel, host, get } = await mount(CLEAN);
    panel.render();
    const sw = host.querySelector('.db-switch-input');
    sw.checked = true;
    sw.dispatchEvent(new dom.window.Event('change'));
    assert.ok(get().includes('paginate: true'), 'source rewritten with the directive');
    assert.ok(get().startsWith('---\nmarp: true'), 'managed block added');
  });

  test('the trigger lights (is-set) only when the deck carries front matter', async () => {
    const { panel, host, trigger, get } = await mount(CLEAN);
    panel.render();
    assert.equal(trigger.classList.contains('is-set'), false, 'clean deck → quiet chip');
    const sw = host.querySelector('.db-switch-input');
    sw.checked = true;
    sw.dispatchEvent(new dom.window.Event('change'));
    panel.syncTrigger();
    assert.equal(trigger.classList.contains('is-set'), true, 'configured deck → lit chip');
    assert.ok(get().includes('paginate: true'));
  });
});
