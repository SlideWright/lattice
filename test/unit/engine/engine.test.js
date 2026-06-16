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
const { createEngine } = require('../../../lib/engine');
const { composeCss, parseSizes, scaffold } = require('../../../lib/engine/css');

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
    assert.match(secs[0], /data-lattice-pagination="1"/);
    assert.doesNotMatch(secs[1], /data-lattice-pagination=/);
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
    assert.match(s, /content:\s*attr\(data-lattice-pagination\)/);
    assert.match(s, /@page\s*\{[^}]*size:\s*1280px 720px/);
    assert.match(s, /@media print/);
  });

  test('scaffold scopes the slide box to div.marpit > section (Marpit geometry specificity)', () => {
    const s = scaffold({ width: '1280px', height: '720px' });
    // Bare `section` (0,0,1) would lose @size to a preview frame's `.marpit >
    // section { width }` (0,1,1); marp's `div.marpit > section` (0,1,2) wins, so
    // ours must too or the slide collapses to the frame's size.
    assert.match(s, /div\.marpit > section\s*\{[^}]*container-type:\s*size/);
    assert.doesNotMatch(s, /^section\s*\{/m); // no UNscoped section box at a line start
  });

  test('scaffold carries NONE of marp-core’s baggage', () => {
    const s = scaffold({ width: '1280px', height: '720px' });
    assert.doesNotMatch(s, /marp-h1/);
    assert.doesNotMatch(s, /data-marp-twemoji/);
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

  test('render() reports the resolved @size box in px (drives preview fit-scale)', () => {
    const eng = createEngine();
    eng.addThemes([BASE, PALETTE]);
    // No size: → HD default box.
    const hd = eng.render('# A\n', 'cuoio');
    assert.deepEqual({ width: hd.width, height: hd.height }, { width: 1280, height: 720 });
    // size: 4K → the 3840×2160 box (numbers, not '3840px'), so a host divides by
    // the real width instead of a hardcoded 1280 (the 4K-preview-oversized bug).
    const k = eng.render('---\nsize: 4K\n---\n# A\n', 'cuoio');
    assert.deepEqual({ width: k.width, height: k.height }, { width: 3840, height: 2160 });
  });

  test('geometry() resolves the box without a full render (marp escape-hatch path)', () => {
    const eng = createEngine();
    eng.addThemes([BASE, PALETTE]);
    assert.deepEqual(eng.geometry('# A\n', 'cuoio'), { width: 1280, height: 720 });
    assert.deepEqual(eng.geometry('---\nsize: 4K\n---\n# A\n', 'cuoio'), { width: 3840, height: 2160 });
    // Unknown theme / no registered sizes still yields a usable HD divisor.
    assert.deepEqual(createEngine().geometry('# A\n', 'ghost'), { width: 1280, height: 720 });
  });

  // Regression (#192 default-flip broke dark mode): every `*-dark` theme is a
  // thin wrapper — `@import '<base>'; :root{color-scheme:dark}` — so the store
  // must resolve theme-to-theme imports recursively. Without it the wrapper's
  // import hoisted as a dead `@import '<base>';` and the sheet collapsed to
  // scaffold-only (~2 KB, no tokens) → unstyled near-black slides. Sweeps the
  // REAL themes + dist/lattice.css so a new palette can't reintroduce it. See
  // lib/engine/themes.js resolveThemeImports.
  test('every real *-dark theme resolves its base import to a full sheet', () => {
    const eng = createEngine();
    const themeDir = path.join(ROOT, 'themes');
    const files = fs.readdirSync(themeDir).filter((f) => f.endsWith('.css'));
    for (const f of files) eng.addThemes([fs.readFileSync(path.join(themeDir, f), 'utf8')]);
    eng.addThemes([fs.readFileSync(path.join(ROOT, 'dist', 'lattice.css'), 'utf8')]);
    const darks = files.map((f) => f.replace(/\.css$/, '')).filter((n) => n.endsWith('-dark'));
    assert.ok(darks.length >= 10, `expected the dark-wrapper set, got ${darks.length}`);
    for (const name of darks) {
      const css = eng.render('# A\n', name).css;
      assert.match(css, /--fs-body\b/, `${name}: base tokens missing — collapsed sheet`);
      assert.match(css, /light-dark\(/, `${name}: light-dark() missing — base not inlined`);
      // No dead theme-name @import left behind (font url() imports are fine).
      assert.doesNotMatch(css, /@import\s+['"][A-Za-z0-9_-]+['"]/, `${name}: unresolved theme-name @import`);
      assert.ok(css.length > 100000, `${name}: sheet only ${css.length}B — collapsed`);
    }
  });

  // Regression: a `:root` token block must be relocated onto the slide section
  // (as Marpit's pack does), or cqi-valued tokens declared there resolve against
  // the viewport — fine on desktop Chromium, collapsed on mobile WebKit. See the
  // rootToSection note in lib/engine/css.js.
  test('relocates :root token blocks onto :where(section):not([\\20 root]) — mobile-cqi fix, preserving (0,1,0) specificity', () => {
    const ROOTY = "/* @theme cuoio */\n@import 'lattice';\n:root { --sp-md: 1.875cqi; }\n:root, section { --fs-body: 2cqi; }";
    const out = composeCss({ themeCss: ROOTY, baseLatticeCss: BASE });
    // the cqi token is owned by a section selector, not bare :root …
    assert.match(out, /:where\(section\)[^{]*\{[^}]*--sp-md:\s*1\.875cqi/);
    assert.doesNotMatch(out, /(^|[\s,}]):root\s*\{[^}]*--sp-md/m); // no bare :root carrying it
    // … AND it carries Marpit's `:not([\20 root])` specificity guard, so the real
    // tokens (0,1,0) still beat lattice.css's `:where(:root)` fallbacks (0,0,0).
    // Bare `:where(section)` (0,0,0) was the cascade slip behind the mobile bug.
    assert.match(out, /:where\(section\):not\(\[\\20 root\]\)\s*\{[^}]*--sp-md:\s*1\.875cqi/);
  });

  test('packs theme selectors under the slide container (Marpit prepend), keeping body live-but-scoped', () => {
    const THEME =
      "/* @theme cuoio */\n@import 'lattice';\nsection.foo { color: red; }\n.bar { color: blue; }\nbody { counter-reset: n; }";
    const out = composeCss({ themeCss: THEME, baseLatticeCss: BASE });
    // a section-leading selector → div.marpit > section.foo (the slide), not a descendant
    assert.match(out, /div\.marpit > section\.foo\s*\{[^}]*color:\s*red/);
    // a bare class → descendant of the slide (still matches in-slide content)
    assert.match(out, /div\.marpit > section \.bar\s*\{[^}]*color:\s*blue/);
    // `body` becomes the dead `div.marpit > section body` so counters fall back to
    // the implicit root reset — matching marp (the "dropped counters" fix).
    assert.match(out, /div\.marpit > section body\s*\{[^}]*counter-reset:\s*n/);
  });

  test('comments out non-pagination ::after content (Marpit pagination plugin)', () => {
    const THEME =
      "/* @theme cuoio */\n@import 'lattice';\n" +
      "section.num::after { content: counter(c); color: red; }\n" +
      "section.page::after { content: attr(data-lattice-pagination); }\n" +
      "section.tag::before { content: 'DRAFT'; }";
    const out = composeCss({ themeCss: THEME, baseLatticeCss: BASE });
    assert.match(out, /\/\* content: counter\(c\); \*\//); // masked: commented, not deleted
    const live = out.replace(/\/\*[\s\S]*?\*\//g, ''); // strip comments → only live decls remain
    assert.doesNotMatch(live, /content:\s*counter\(c\)/); // no live numbered ::after content
    assert.match(out, /color:\s*red/); // sibling decls survive
    assert.match(out, /content:\s*attr\(data-lattice-pagination\)/); // the page number is kept
    assert.match(out, /content:\s*'DRAFT'/); // ::before content is untouched (not a pagination target)
  });

  test('inlines the base exactly once (a prose @import in a comment is ignored)', () => {
    // The palette mentions `@import 'lattice'` inside a comment; only the real
    // rule should inline the base — otherwise the sheet doubles in size.
    const PROSE = "/* @theme cuoio — pulls the base via @import 'lattice'; */\n@import 'lattice';\nsection { --x: 1; }";
    const out = composeCss({ themeCss: PROSE, baseLatticeCss: BASE });
    assert.equal((out.match(/color:\s*#111/g) || []).length, 1); // base body inlined once
  });
});

// The owned CSS emitter's mobile-WebKit regressions (collapsed cqi, dropped
// counters) are INVISIBLE to the headless-Chromium pixel gates — they live in the
// CSS cascade, not the rendered frame. So we gate the emitter at the RULE level:
// pack the REAL dist/lattice.css through the engine and assert the three
// load-bearing pack behaviours directly. Rule-level ⇒ browser-independent ⇒
// catches the bug class the pixel harness cannot. (These were cross-checked
// against marp-core's packer during the migration; the engine is now canonical,
// so the assertions stand on their own.)
describe('lattice-engine: CSS-pack (load-bearing rules)', () => {
  const LATTICE = fs.readFileSync(path.join(ROOT, 'dist/lattice.css'), 'utf8');
  const PALETTE = fs.readFileSync(path.join(ROOT, 'themes/indaco.css'), 'utf8');
  const enginePack = composeCss({ themeCss: PALETTE, baseLatticeCss: LATTICE });
  const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
  // The selector block that declares the first match of `re` (e.g. a token).
  const declaringSelector = (css, re) => {
    const c = strip(css);
    const m = re.exec(c);
    if (!m) return null;
    const open = c.lastIndexOf('{', m.index);
    return c.slice(c.lastIndexOf('}', open) + 1, open).trim().replace(/\s+/g, ' ');
  };

  test('cqi tokens carry the specificity-preserving selector', () => {
    for (const re of [/--sp-md:/, /--sp-lg:/, /--radius-md:/]) {
      const e = declaringSelector(enginePack, re);
      assert.ok(e && /:where\(section\):not\(\[\\20 root\]\)/.test(e), `engine ${re} on "${e}"`); // incl. the (0,1,0) guard
    }
  });

  test('divider/closing counters reset on the dead root selector', () => {
    const re = /counter-reset:\s*lat-divider/;
    const e = declaringSelector(enginePack, re);
    assert.match(e, /section body$/); // dead → implicit root reset
  });

  test('no live non-pagination ::after content', () => {
    const live = (css) => /content:\s*counter\(lat-/.test(strip(css));
    assert.equal(live(enginePack), false);
  });
});
