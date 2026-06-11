/**
 * Unit: preview-virtual.js — the pure, DOM-free kernel behind the Drawing
 * Board's virtualized incremental preview.
 *
 * Proves slide splitting from marp's flat `<section>` output, the per-slide
 * diff (which slides changed + whether the count changed), the windowing math
 * (which indices to mount for a given scroll position), the spacer heights that
 * keep the scrollbar honest, and the range-change short-circuit.
 *
 * DOM-free module → tested directly, no iframe / browser. The iframe controller
 * that consumes it lives in drawing-board.astro and is verified interactively.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
	return import('../../../docs/src/playground/preview-virtual.js');
}

describe('splitSections', () => {
	test('splits a flat <section> sequence and ignores trailing wrapper/script', async () => {
		const { splitSections } = await load();
		const html =
			'<div class="marpit">' +
			'<section id="1"><h1>One</h1></section>\n' +
			'<section id="2" class="cards-grid"><h2>Two</h2></section>\n' +
			'<section id="3"><h2>Three</h2></section>' +
			'<script>/* marp polyfill */</script></div>';
		const secs = splitSections(html);
		assert.equal(secs.length, 3);
		assert.match(secs[0], /^<section id="1">/);
		assert.match(secs[0], /<\/section>$/);
		assert.ok(secs[1].includes('class="cards-grid"'));
		assert.ok(!secs[2].includes('<script>'), 'trailing script is not captured');
	});

	test('empty / missing input → empty array', async () => {
		const { splitSections } = await load();
		assert.deepEqual(splitSections(''), []);
		assert.deepEqual(splitSections(null), []);
		assert.deepEqual(splitSections('<div>no slides</div>'), []);
	});

	test('round-trips slide count for many slides', async () => {
		const { splitSections } = await load();
		let html = '<div class="marpit">';
		for (let i = 0; i < 250; i++) html += `<section id="${i + 1}"><h2>S${i}</h2></section>\n`;
		html += '</div>';
		assert.equal(splitSections(html).length, 250);
	});
});

describe('diffSections', () => {
	test('reports only the changed indices, no count change', async () => {
		const { diffSections } = await load();
		const prev = ['<section>a</section>', '<section>b</section>', '<section>c</section>'];
		const next = ['<section>a</section>', '<section>B!</section>', '<section>c</section>'];
		const d = diffSections(prev, next);
		assert.deepEqual(d.changed, [1]);
		assert.equal(d.countChanged, false);
		assert.equal(d.count, 3);
	});

	test('an inserted slide is a count change and shifts everything after it', async () => {
		const { diffSections } = await load();
		const prev = ['<section>a</section>', '<section>b</section>'];
		const next = ['<section>a</section>', '<section>NEW</section>', '<section>b</section>'];
		const d = diffSections(prev, next);
		assert.equal(d.countChanged, true);
		assert.equal(d.count, 3);
		assert.deepEqual(d.changed, [1, 2]); // index 1 differs, index 2 is new vs undefined
	});

	test('identical renders → nothing changed', async () => {
		const { diffSections } = await load();
		const a = ['<section>x</section>', '<section>y</section>'];
		const d = diffSections(a, a.slice());
		assert.deepEqual(d.changed, []);
		assert.equal(d.countChanged, false);
	});

	test('null prev (first render) → every slide is new', async () => {
		const { diffSections } = await load();
		const d = diffSections(null, ['<section>a</section>', '<section>b</section>']);
		assert.deepEqual(d.changed, [0, 1]);
		assert.equal(d.countChanged, true);
	});
});

describe('windowRange', () => {
	const slotH = 100; // 100px per slide slot

	test('top of a long deck mounts the first screenful + buffer', async () => {
		const { windowRange } = await load();
		// viewport 0..500 → slots 0..5; buffer 2 → start 0 (clamped), end 7
		assert.deepEqual(windowRange(0, 500, slotH, 1000, 2), { start: 0, end: 7 });
	});

	test('scrolled into the middle mounts only the visible window', async () => {
		const { windowRange } = await load();
		// scrollTop 5000 (slot 50), viewport 500 (5 slots) → 48..57
		assert.deepEqual(windowRange(5000, 500, slotH, 1000, 2), { start: 48, end: 57 });
	});

	test('end is clamped to the deck length', async () => {
		const { windowRange } = await load();
		const r = windowRange(9600, 500, slotH, 100, 2); // near the bottom of 100 slides
		assert.equal(r.end, 100);
		assert.ok(r.start <= r.end);
	});

	test('degenerate inputs → empty window', async () => {
		const { windowRange } = await load();
		assert.deepEqual(windowRange(0, 500, slotH, 0, 2), { start: 0, end: 0 });
		assert.deepEqual(windowRange(0, 500, 0, 10, 2), { start: 0, end: 0 });
	});
});

describe('spacers', () => {
	test('top + mounted + bottom always sums to the full scroll height', async () => {
		const { spacers, windowRange } = await load();
		const slotH = 80;
		const count = 300;
		const r = windowRange(4000, 600, slotH, count, 2);
		const sp = spacers(r.start, r.end, count, slotH);
		const mounted = (r.end - r.start) * slotH;
		assert.equal(sp.top + mounted + sp.bottom, count * slotH);
	});

	test('whole deck mounted → no spacers', async () => {
		const { spacers } = await load();
		assert.deepEqual(spacers(0, 10, 10, 90), { top: 0, bottom: 0 });
	});
});

describe('rangeChanged', () => {
	test('detects a moved window and short-circuits an unchanged one', async () => {
		const { rangeChanged } = await load();
		assert.equal(rangeChanged({ start: 0, end: 7 }, { start: 0, end: 7 }), false);
		assert.equal(rangeChanged({ start: 0, end: 7 }, { start: 1, end: 8 }), true);
		assert.equal(rangeChanged(null, { start: 0, end: 7 }), true);
	});
});
