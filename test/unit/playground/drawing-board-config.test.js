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
    assert.equal(fm.tokens, 'current');
    assert.equal(fm.configured, false);
  });

  test('reads tokens: universal and flags it as configured', async () => {
    const { readFrontMatter } = await import(MOD);
    const fm = readFrontMatter('---\nmarp: true\ntokens: universal\n---\n\n# Deck\n');
    assert.equal(fm.tokens, 'universal');
    assert.equal(fm.configured, true);
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

  test('parses theme, and theme alone does not count as "configured"', async () => {
    const { readFrontMatter } = await import(MOD);
    const fm = readFrontMatter('---\nmarp: true\ntheme: cuoio\n---\n\n# Deck\n');
    assert.equal(fm.theme, 'cuoio');
    assert.equal(fm.configured, false, 'theme is ubiquitous under full sync — not a bespoke-setup signal');
  });

  test('islands toggle: canonicalises on/true/minimal/off; absent = off, not configured', async () => {
    const { readFrontMatter } = await import(MOD);
    assert.equal(readFrontMatter('---\nmarp: true\nislands: on\n---\n').islands, 'on');
    assert.equal(readFrontMatter('---\nmarp: true\nislands: true\n---\n').islands, 'on');
    assert.equal(readFrontMatter('---\nmarp: true\nislands: minimal\n---\n').islands, 'minimal');
    assert.equal(readFrontMatter('---\nmarp: true\nislands: off\n---\n').islands, 'off');
    assert.equal(readFrontMatter(CLEAN).islands, 'off');
    assert.equal(readFrontMatter('---\nmarp: true\nislands: on\n---\n').configured, true);
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

  test('islands: writes on/minimal in canonical slot; off (default) omits it', async () => {
    const { writeFrontMatter } = await import(MOD);
    const on = writeFrontMatter(CLEAN, 'islands', 'on');
    assert.ok(/^---\nmarp: true\nislands: on\n---\n/.test(on));
    const min = writeFrontMatter(CLEAN, 'islands', 'minimal');
    assert.ok(min.includes('islands: minimal\n'));
    // `class` precedes `islands` in the canonical order
    let src = writeFrontMatter(CLEAN, 'islands', 'on');
    src = writeFrontMatter(src, 'class', 'dark');
    const block = src.slice(0, src.indexOf('\n---\n'));
    assert.equal(block, '---\nmarp: true\nclass: dark\nislands: on');
    // off clears it back out
    assert.ok(!writeFrontMatter(on, 'islands', 'off').includes('islands:'));
  });

  test('tokens: universal is emitted; current (the default) is omitted/cleared', async () => {
    const { writeFrontMatter } = await import(MOD);
    const uni = writeFrontMatter(CLEAN, 'tokens', 'universal');
    assert.ok(uni.includes('tokens: universal'));
    // back to the default → the directive drops out (and the block collapses)
    const back = writeFrontMatter(uni, 'tokens', 'current');
    assert.ok(!back.includes('tokens:'), 'current is the default and should not be written');
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

  test('finish: sketch / sketch-clean are written; boardroom + empty are the baseline and omitted', async () => {
    const { writeFrontMatter, readFrontMatter } = await import(MOD);
    assert.ok(writeFrontMatter(CLEAN, 'finish', 'sketch').includes('finish: sketch'));
    assert.ok(writeFrontMatter(CLEAN, 'finish', 'sketch-clean').includes('finish: sketch-clean'));
    assert.equal(writeFrontMatter(CLEAN, 'finish', 'boardroom'), CLEAN, 'boardroom is the baseline → no key');
    assert.equal(writeFrontMatter(CLEAN, 'finish', ''), CLEAN);
    // round-trips, and selecting boardroom over an existing sketch clears it.
    const sketched = writeFrontMatter(CLEAN, 'finish', 'sketch');
    assert.equal(readFrontMatter(sketched).finish, 'sketch');
    assert.equal(writeFrontMatter(sketched, 'finish', 'boardroom'), CLEAN);
  });

  test('finish is emitted right after theme, before size', async () => {
    const { writeFrontMatter } = await import(MOD);
    let src = writeFrontMatter(CLEAN, 'size', '4K');
    src = writeFrontMatter(src, 'finish', 'sketch');
    const block = src.slice(0, src.indexOf('\n---', 4));
    assert.ok(block.indexOf('finish: sketch') < block.indexOf('size: 4K'), block);
  });

  test('a sketch finish counts as "configured" (lights the setup chip)', async () => {
    const { readFrontMatter } = await import(MOD);
    assert.equal(readFrontMatter('---\nmarp: true\nfinish: sketch\n---\n\n# Deck\n').configured, true);
    assert.equal(readFrontMatter('---\nmarp: true\nfinish: boardroom\n---\n\n# Deck\n').configured, false,
      'boardroom is the baseline — not a bespoke-setup signal');
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

  test('theme writes right after marp, and updates in place (no duplicate)', async () => {
    const { writeFrontMatter } = await import(MOD);
    let src = writeFrontMatter(CLEAN, 'theme', 'indaco');
    assert.ok(/^---\nmarp: true\ntheme: indaco\n---\n/.test(src), 'theme leads the block after marp');
    src = writeFrontMatter(src, 'paginate', true);
    src = writeFrontMatter(src, 'theme', 'cuoio'); // switch palette
    assert.equal((src.match(/theme:/g) || []).length, 1, 'no duplicate theme key');
    assert.ok(src.includes('theme: cuoio'));
    assert.ok(src.includes('paginate: true'));
  });

  test('clearing theme ("") drops just the theme key', async () => {
    const { writeFrontMatter } = await import(MOD);
    let src = writeFrontMatter(CLEAN, 'theme', 'indaco');
    src = writeFrontMatter(src, 'paginate', true);
    src = writeFrontMatter(src, 'theme', '');
    assert.ok(!src.includes('theme:'));
    assert.ok(src.includes('paginate: true'));
  });

  test('writeFrontMatter never scrubs an unknown theme from the author source', async () => {
    // Validity is enforced at PROPAGATION (the controller), not here — a typo
    // stays in the deck so the author can fix it; it just isn't applied live.
    const { writeFrontMatter } = await import(MOD);
    const src = writeFrontMatter(CLEAN, 'theme', 'totally-made-up');
    assert.ok(src.includes('theme: totally-made-up'));
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
        palettes: ['indaco', 'cuoio', 'atelier'],
        getDefaultTheme: () => 'indaco',
      });
      return { panel, host, trigger, get: () => source };
    });
  }

  test('renders controls pre-filled from the deck front matter', async () => {
    const { panel, host } = await mount('---\nmarp: true\nsize: 4K\npaginate: true\n---\n\n# Deck\n');
    panel.render();
    const size = host.querySelector('select[aria-label="Slide size"]');
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

  test('theme select is pre-filled (deck theme, else default) and writes on change', async () => {
    const withTheme = await mount('---\nmarp: true\ntheme: cuoio\n---\n\n# Deck\n');
    withTheme.panel.render();
    assert.equal(withTheme.host.querySelector('select').value, 'cuoio', 'reflects the deck theme');

    const clean = await mount(CLEAN);
    clean.panel.render();
    const themeSel = clean.host.querySelector('select');
    assert.equal(themeSel.value, 'indaco', 'falls back to the default theme when the deck declares none');
    themeSel.value = 'atelier';
    themeSel.dispatchEvent(new dom.window.Event('change'));
    assert.ok(clean.get().includes('theme: atelier'), 'picking writes theme into the source');
    assert.equal(clean.trigger.classList.contains('is-set'), false, 'theme alone does not light the chip');
  });

  test('an unknown deck theme shows a caution note and falls back', async () => {
    const { panel, host } = await mount('---\nmarp: true\ntheme: made-up\n---\n\n# Deck\n');
    panel.render();
    const warn = host.querySelector('.db-config-warn');
    assert.ok(warn, 'a caution note renders for the unknown theme');
    assert.match(warn.textContent, /made-up/);
    assert.equal(host.querySelector('select').value, 'indaco', 'the select shows the fallback, not the bad value');
  });
});
