/**
 * Unit: lattice-engine (the Marp-replacement engine core, P1).
 *
 * Two kinds of assertion:
 *   1. Contract tests — the engine reproduces Marpit's token/attribute contract
 *      the Lattice plugins bind to (slide splitting, directive application,
 *      `![bg]` consumption, math) and composes the real plugins + transformer
 *      registry.
 *   2. Differential parity — the engine's per-section HTML structure matches
 *      @marp-team/marp-core (the marp-cli engine) across the baseline gallery
 *      and a couple of bucket galleries, in-process (no PDF). twemoji is the one
 *      intentional divergence (emoji render via font, not <img class="emoji">)
 *      per engineering/decisions/2026-06-10-marp-replacement-proposal.md.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Marp } = require('@marp-team/marp-core');
const { createEngine } = require('../../../lib/engine');
const { composeCss, parseSizes, scaffold } = require('../../../lib/engine/css');
const plugins = require('../../../lib/integrations/marp/plugins');
const { applyAllToHtml } = require('../../../lib/transformers/registry');

const ROOT = path.join(__dirname, '..', '..', '..');

// Stub themes keyed by @theme name — enough for the structural HTML contract
// (real palettes @import 'lattice'; the page/bundler resolves that, not the
// engine). One per palette so the `theme:` directive resolves in both engines.
const THEME_NAMES = ['lattice', ...fs.readdirSync(path.join(ROOT, 'themes'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => f.replace(/\.css$/, ''))];
const THEME_CSS = THEME_NAMES.map((n) => `/* @theme ${n} */\nsection{}`);

function makeEngine() {
  const eng = createEngine();
  eng.addThemes(THEME_CSS);
  return eng;
}

// Reference marp-core, composed exactly like lib/playground/index.js.
function makeMarp() {
  const m = new Marp({ html: true, math: 'katex', minifyCSS: false, script: false, inlineSVG: false });
  for (const t of THEME_CSS) { try { m.themeSet.add(t); } catch (_e) { /* dup */ } }
  plugins.registerMermaidHljs(m);
  m.use(plugins.deckClassPropagate).use(plugins.verdictGridBadges).use(plugins.obligationMatrixBadges)
    .use(plugins.checklistItemStates).use(plugins.slotLabelLift).use(plugins.glossaryListToTable)
    .use(plugins.glossaryRange).use(plugins.stripHeadingPeriods).use(plugins.addHeadingPeriods)
    .use(plugins.latticeplotFences);
  const orig = m.render.bind(m);
  m.render = (md, env) => {
    const r = orig(md, env);
    if (r && typeof r.html === 'string') {
      r.html = applyAllToHtml(r.html);
      r.html = plugins.applyDeckLogoToHtml(r.html, md);
    }
    return r;
  };
  return m;
}

// Per-section structural fingerprint. Discounts twemoji (intentional drop).
function profile(html) {
  const secs = [];
  const re = /<section\b([^>]*)>([\s\S]*?)<\/section>/g;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1];
    const body = m[2].replace(/<img class="emoji"[^>]*>/g, '');
    const style = (attrs.match(/\bstyle="([^"]*)"/) || [])[1] || '';
    secs.push({
      cls: ((attrs.match(/(?<![\w-])class="([^"]*)"/) || [])[1] || '').split(/\s+/).filter(Boolean).sort().join(' '),
      style: style.replace(/&quot;/g, '"').split(/;(?![^(]*\))/).map((s) => s.trim()).filter(Boolean).sort().join(';'),
      badges: (body.match(/class="badge\b/g) || []).length,
      states: (body.match(/class="state\b/g) || []).length,
      strongs: (body.match(/<strong>/g) || []).length,
      tables: (body.match(/<table>/g) || []).length,
      lis: (body.match(/<li\b/g) || []).length,
      imgs: (body.match(/<img\b/g) || []).length,
      headers: (body.match(/<header>/g) || []).length,
    });
  }
  return secs;
}

describe('lattice-engine: contract', () => {
  test('splits slides on `---` into <section>s wrapped in div.marpit', () => {
    const { html } = makeEngine().render('# A\n\n---\n\n# B\n\n---\n\n# C\n', 'lattice');
    assert.equal((html.match(/<section\b/g) || []).length, 3);
    assert.match(html, /<div class="marpit">/);
  });

  test('applies `_class:` to the section and `class:` deck-wide (deckClassPropagate)', () => {
    const md = '---\nclass: dark\n---\n\n# A\n\n---\n\n<!-- _class: title -->\n\n# B\n';
    const secs = profile(makeEngine().render(md, 'lattice').html);
    assert.equal(secs[0].cls, 'dark');
    assert.equal(secs[1].cls, 'dark title'); // _class title + deck-wide dark, sorted
  });

  test('paginate true emits pagination attrs; false emits none', () => {
    const md = '<!-- paginate: true -->\n\n# A\n\n---\n\n<!-- _paginate: false -->\n\n# B\n';
    const { html } = makeEngine().render(md, 'lattice');
    const secs = html.match(/<section[^>]*>/g);
    assert.match(secs[0], /data-marpit-pagination="1"/);
    assert.doesNotMatch(secs[1], /data-marpit-pagination=/);
    assert.doesNotMatch(secs[1], /--paginate:false/);
  });

  test('composes the real plugins: verdict-grid state marker → badge span', () => {
    const md = '<!-- _class: verdict-grid -->\n\n# V\n\n- Tier\n  - [x] included\n';
    const { html } = makeEngine().render(md, 'lattice');
    assert.match(html, /<span class="badge[^"]*">included<\/span>/);
  });

  test('does NOT double-wrap an already-bold slot label (clean inline tokens)', () => {
    const md = '<!-- _class: list-criteria -->\n\n## H\n\n- **Speed**\n  - body\n';
    const { html } = makeEngine().render(md, 'lattice');
    assert.match(html, /<strong>Speed<\/strong>/);
    assert.doesNotMatch(html, /<strong><strong>/);
  });

  test('consumes `![bg]` into the section background (0 <img>, cover/contain)', () => {
    const cover = makeEngine().render('# A\n\n![bg](pic.svg)\n', 'lattice').html;
    assert.doesNotMatch(cover, /<img/);
    assert.match(cover, /background-image:url\(&quot;pic\.svg&quot;\)/);
    assert.match(cover, /background-size:cover/);
    const fit = makeEngine().render('# A\n\n![bg fit](pic.svg)\n', 'lattice').html;
    assert.match(fit, /background-size:contain/);
  });

  test('renders inline and display math via KaTeX', () => {
    const { html } = makeEngine().render('Inline $a^2$ here.\n\n$$\\int x\\,dx$$\n', 'lattice');
    assert.match(html, /class="katex"/);
  });

  test('addThemes / hasTheme reflect registration; theme directive gated on it', () => {
    const eng = createEngine();
    assert.equal(eng.hasTheme('indaco'), false);
    eng.addThemes(['/* @theme indaco */\nsection{}']);
    assert.equal(eng.hasTheme('indaco'), true);
    // Unregistered theme is not applied as a section attr (marp-core parity).
    const { html } = eng.render('<!-- theme: ghost -->\n\n# A\n', 'ghost');
    assert.doesNotMatch(html, /--theme:ghost/);
  });
});

describe('lattice-engine: css emission (P1.1)', () => {
  const BASE = '/* @theme lattice\n * @size hd 1280px 720px\n * @size 4K 3840px 2160px */\nsection { color: #111; }';
  const PALETTE = "/* @theme cuoio */\n@import 'lattice';\n:root { --accent: #840; }";

  test('scaffold emits the load-bearing rules with @size geometry', () => {
    const s = scaffold({ width: '1280px', height: '720px' });
    assert.match(s, /width:\s*1280px/);
    assert.match(s, /height:\s*720px/);
    assert.match(s, /container-type:\s*size/);
    assert.match(s, /content:\s*attr\(data-marpit-pagination\)/);
    assert.match(s, /@page\s*\{[^}]*size:\s*1280px 720px/);
    assert.match(s, /@media print/);
  });

  test('scaffold carries NONE of marp-core’s baggage', () => {
    const s = scaffold({ width: '1280px', height: '720px' });
    assert.doesNotMatch(s, /marp-h1/);
    assert.doesNotMatch(s, /data-marp-twemoji/);
    assert.doesNotMatch(s, /div\.marpit\s*>/);
    assert.doesNotMatch(s, /scroll-snap-align/);
    assert.doesNotMatch(s, /webkit-media-controls/);
    assert.doesNotMatch(s, /padding:\s*inherit/); // the rule that forced !important
  });

  test('composeCss resolves @import ‘lattice’ against the registered base', () => {
    const out = composeCss({ themeCss: PALETTE, baseLatticeCss: BASE });
    assert.doesNotMatch(out, /@import\s+['"]lattice['"]/); // resolved, not left dangling
    assert.match(out, /--accent:\s*#840/); // palette tokens present
    assert.match(out, /color:\s*#111/); // base rules inlined
  });

  test('size: directive selects the matching @size geometry', () => {
    assert.equal(parseSizes(BASE).get('4K').width, '3840px');
    const out = composeCss({ themeCss: PALETTE, baseLatticeCss: BASE, sizeName: '4K' });
    assert.match(out, /width:\s*3840px/);
    assert.match(out, /size:\s*3840px 2160px/);
  });

  test('render() returns scaffold + resolved theme; unknown theme → empty', () => {
    const eng = createEngine();
    eng.addThemes([BASE, PALETTE]);
    const { css } = eng.render('# A\n', 'cuoio');
    assert.match(css, /container-type:\s*size/); // scaffold
    assert.match(css, /--accent:\s*#840/); // resolved palette
    assert.equal(eng.render('# A\n', 'ghost').css, '');
  });

  // Regression: a `:root` token block must be relocated onto the slide section
  // (as Marpit's pack does), or cqi-valued tokens declared there resolve against
  // the viewport — fine on desktop Chromium, collapsed on mobile WebKit. See the
  // rootToSection note in lib/engine/css.js.
  test('relocates :root token blocks onto :where(section) (mobile-cqi fix)', () => {
    const ROOTY = "/* @theme cuoio */\n@import 'lattice';\n:root { --sp-md: 1.875cqi; }\n:root, section { --fs-body: 2cqi; }";
    const out = composeCss({ themeCss: ROOTY, baseLatticeCss: BASE });
    // the cqi token is now owned by a section selector, not bare :root
    assert.match(out, /:where\(section\)[^{]*\{[^}]*--sp-md:\s*1\.875cqi/);
    assert.doesNotMatch(out, /(^|[\s,}]):root\s*\{[^}]*--sp-md/m); // no bare :root carrying it
  });

  test('inlines the base exactly once (a prose @import in a comment is ignored)', () => {
    // The palette mentions `@import 'lattice'` inside a comment; only the real
    // rule should inline the base — otherwise the sheet doubles in size.
    const PROSE = "/* @theme cuoio — pulls the base via @import 'lattice'; */\n@import 'lattice';\nsection { --x: 1; }";
    const out = composeCss({ themeCss: PROSE, baseLatticeCss: BASE });
    assert.equal((out.match(/color:\s*#111/g) || []).length, 1); // base body inlined once
  });
});

describe('lattice-engine: structural parity vs marp-core', () => {
  const decks = [
    'test/integration/baseline-decks/gallery.md',
    'lib/components/evidence/kpi/kpi.gallery.md',
    'lib/components/comparison/comparison.gallery.light.md',
  ].filter((d) => fs.existsSync(path.join(ROOT, d)));

  for (const deck of decks) {
    test(`${deck} — every section matches`, () => {
      const src = fs.readFileSync(path.join(ROOT, deck), 'utf8');
      // Let each deck's own `theme:` directive win in both engines (no forced
      // override) so the only variable is the renderer.
      const mp = profile(makeMarp().render(src).html);
      const ep = profile(makeEngine().render(src).html);
      assert.equal(ep.length, mp.length, 'slide count');
      for (let i = 0; i < mp.length; i++) {
        assert.deepEqual(ep[i], mp[i], `slide ${i + 1} structural fingerprint`);
      }
    });
  }
});
