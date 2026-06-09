/**
 * Unit: slide-context.js — the pure slide-context detection + completion grammar
 * behind the editor's autocomplete sources.
 *
 * Proves the backward-walk to the active `_class:` directive, the open-directive
 * completion parse (component name vs modifier position), the option builders,
 * and the map basemap selection — including the regression for the bug where a
 * bare `<!-- _class: map -->` (a WORLD map) resolved to the US basemap, hiding
 * every country + group (Global South, blocs) behind a redundant `world` token.
 *
 * Import-free module → tested directly with a plain line accessor, no
 * CodeMirror (a docs-only dep, absent from the repo-root install). Mirrors the
 * focus-block.js split.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
	return import('../../../docs/src/playground/slide-context.js');
}

// 1-based line accessor over an array of lines, matching CodeMirror's doc.line.
const getter = (lines) => (n) => lines[n - 1];

describe('slideClassAt', () => {
	test('finds the directive governing the cursor, parsing name + modifiers', async () => {
		const { slideClassAt } = await load();
		const lines = ['<!-- _class: map us -->', '', '- California `4`', '- Texas `7`'];
		const info = slideClassAt(getter(lines), 3);
		assert.equal(info.name, 'map');
		assert.deepEqual(info.modifiers, ['us']);
		assert.deepEqual(info.tokens, ['map', 'us']);
		assert.equal(info.directiveLine, 1);
	});

	test('reads the directive on the cursor line itself', async () => {
		const { slideClassAt } = await load();
		const lines = ['<!-- _class: cards-grid four -->'];
		const info = slideClassAt(getter(lines), 1);
		assert.equal(info.name, 'cards-grid');
		assert.deepEqual(info.modifiers, ['four']);
	});

	test('returns null when a slide boundary sits between cursor and directive', async () => {
		const { slideClassAt } = await load();
		const lines = ['<!-- _class: map -->', '- Brazil `4`', '', '---', '', '# next slide'];
		assert.equal(slideClassAt(getter(lines), 6), null);
	});

	test('returns null in front matter / before any directive', async () => {
		const { slideClassAt } = await load();
		const lines = ['---', 'marp: true', '---', '', '# untitled'];
		assert.equal(slideClassAt(getter(lines), 5), null);
	});

	test('tolerates missing lines from the accessor', async () => {
		const { slideClassAt } = await load();
		assert.equal(slideClassAt(() => undefined, 3), null);
	});
});

describe('classDirectiveCompletion', () => {
	test('completes the component name on the first token', async () => {
		const { classDirectiveCompletion } = await load();
		const spot = classDirectiveCompletion('<!-- _class: ti');
		assert.equal(spot.kind, 'class');
		assert.equal(spot.typed, 'ti');
		assert.equal(spot.from, '<!-- _class: '.length);
	});

	test('offers the empty first token (for explicit Ctrl-Space)', async () => {
		const { classDirectiveCompletion } = await load();
		const spot = classDirectiveCompletion('<!-- _class: ');
		assert.equal(spot.kind, 'class');
		assert.equal(spot.typed, '');
	});

	test('switches to modifier completion after the component name', async () => {
		const { classDirectiveCompletion } = await load();
		const spot = classDirectiveCompletion('<!-- _class: map u');
		assert.equal(spot.kind, 'modifier');
		assert.equal(spot.name, 'map');
		assert.equal(spot.typed, 'u');
		assert.deepEqual(spot.present, []);
	});

	test('reports already-present modifiers so they can be excluded', async () => {
		const { classDirectiveCompletion } = await load();
		const spot = classDirectiveCompletion('<!-- _class: kpi dark ');
		assert.equal(spot.kind, 'modifier');
		assert.equal(spot.name, 'kpi');
		assert.deepEqual(spot.present, ['dark']);
		assert.equal(spot.typed, '');
	});

	test('stays quiet once the directive is closed (cursor past `-->`)', async () => {
		const { classDirectiveCompletion } = await load();
		assert.equal(classDirectiveCompletion('<!-- _class: map --> '), null);
		assert.equal(classDirectiveCompletion('## A heading'), null);
		assert.equal(classDirectiveCompletion('- a bullet'), null);
	});
});

describe('classOptions / modifierOptions', () => {
	const catalog = [
		{ name: 'map', bucket: 'chart', variants: ['us', 'world', 'highlight'], summary: 'A choropleth.' },
		{ name: 'title', bucket: 'anchor', variants: [] },
	];
	const universals = ['dark', 'scale-l', 'silent'];

	test('classOptions maps catalog entries to {label, detail}', async () => {
		const { classOptions } = await load();
		const opts = classOptions(catalog);
		assert.deepEqual(opts.map((o) => o.label), ['map', 'title']);
		const map = opts.find((o) => o.label === 'map');
		assert.equal(map.detail, 'chart');
		assert.equal(map.type, 'class');
	});

	test('modifierOptions lists a component variants first, universals after', async () => {
		const { modifierOptions } = await load();
		const opts = modifierOptions('map', catalog, universals);
		const labels = opts.map((o) => o.label);
		assert.deepEqual(labels.slice(0, 3), ['us', 'world', 'highlight']);
		assert.deepEqual(labels.slice(3), ['dark', 'scale-l', 'silent']);
		assert.equal(opts[0].detail, 'variant');
		assert.equal(opts[3].detail, 'universal');
	});

	test('modifierOptions excludes already-present tokens and dedupes', async () => {
		const { modifierOptions } = await load();
		const opts = modifierOptions('map', catalog, universals, ['us', 'dark']);
		const labels = opts.map((o) => o.label);
		assert.ok(!labels.includes('us'));
		assert.ok(!labels.includes('dark'));
		assert.ok(labels.includes('world'));
	});

	test('modifierOptions on an unknown component still offers universals', async () => {
		const { modifierOptions } = await load();
		const opts = modifierOptions('nope', catalog, universals);
		assert.deepEqual(opts.map((o) => o.label), ['dark', 'scale-l', 'silent']);
	});
});

describe('mapBasemapFor — world is the default basemap (regression)', () => {
	test('a bare `map` slide resolves to the WORLD basemap, not US', async () => {
		const { mapBasemapFor } = await load();
		assert.equal(mapBasemapFor({ name: 'map', modifiers: [] }), 'world');
	});

	test('`map us` and `map usa` switch to the US basemap', async () => {
		const { mapBasemapFor } = await load();
		assert.equal(mapBasemapFor({ name: 'map', modifiers: ['us'] }), 'us');
		assert.equal(mapBasemapFor({ name: 'map', modifiers: ['usa'] }), 'us');
	});

	test('an explicit `world` token is still world', async () => {
		const { mapBasemapFor } = await load();
		assert.equal(mapBasemapFor({ name: 'map', modifiers: ['world'] }), 'world');
	});

	test('returns null for non-map slides and null info', async () => {
		const { mapBasemapFor } = await load();
		assert.equal(mapBasemapFor({ name: 'kpi', modifiers: [] }), null);
		assert.equal(mapBasemapFor(null), null);
	});
});
