/**
 * Unit: debug-overlay.js — the layout DEBUG overlay for the live preview.
 *
 * Covers the pure levers (config resolution + chip text), the CSS contract
 * (outline-only so it can't reflow a slide; scoped under .lattice; the overlay is
 * pointer-events:none), the WCAG-AA contrast of the layout-mode hues, and the
 * apply/teardown lifecycle against jsdom. jsdom has no layout engine, so pixel
 * positions/sizes are verified in the visual review, not here.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');

async function load() {
	return import('../../../docs/src/playground/debug-overlay.js');
}

// A frame whose contentDocument/Window come from jsdom. `pretendToBeVisual` gives
// us requestAnimationFrame + a window that supports addEventListener/setTimeout.
function frameWith(bodyHtml) {
	const jd = new JSDOM(`<!doctype html><html><body>${bodyHtml}</body></html>`, { pretendToBeVisual: true });
	return { contentDocument: jd.window.document, contentWindow: jd.window };
}

describe('resolveConfig', () => {
	test('follow-the-deck: absent/off → null, on/empty → default profile in hover mode', async () => {
		const { resolveConfig } = await load();
		assert.equal(resolveConfig(null, null), null); // no attribute
		assert.equal(resolveConfig('off', null), null);
		assert.equal(resolveConfig('false', null), null);
		assert.deepEqual(resolveConfig('on', null), { facets: ['identity', 'layout', 'size'], reveal: 'hover' });
		assert.deepEqual(resolveConfig('', null), { facets: ['identity', 'layout', 'size'], reveal: 'hover' }); // bare _debug
	});

	test('a facet list is intersected with the known levers, in canonical order', async () => {
		const { resolveConfig } = await load();
		assert.deepEqual(resolveConfig('layout identity', null), { facets: ['identity', 'layout'], reveal: 'hover' });
		assert.deepEqual(resolveConfig('class, box', null), { facets: ['class', 'box'], reveal: 'hover' });
		assert.deepEqual(resolveConfig('all', null), { facets: ['identity', 'layout', 'size', 'class', 'box'], reveal: 'hover' });
		// unknown-only falls back to the default profile (lint warns on the typo separately)
		assert.deepEqual(resolveConfig('bogus', null), { facets: ['identity', 'layout', 'size'], reveal: 'hover' });
	});

	test('reveal mode: `always`/`pinned` pin the chips; it composes with facets', async () => {
		const { resolveConfig } = await load();
		assert.equal(resolveConfig('always', null).reveal, 'always');
		assert.equal(resolveConfig('pinned', null).reveal, 'always');
		assert.equal(resolveConfig('hover', null).reveal, 'hover');
		assert.deepEqual(resolveConfig('always class box', null), { facets: ['class', 'box'], reveal: 'always' });
		// a bare `always` keeps the default facet profile
		assert.deepEqual(resolveConfig('always', null).facets, ['identity', 'layout', 'size']);
	});

	test('session override wins: force off mutes a debugging deck; force on lights a plain one', async () => {
		const { resolveConfig } = await load();
		assert.equal(resolveConfig('on', 'off'), null);
		assert.equal(resolveConfig('always', 'off'), null);
		assert.deepEqual(resolveConfig(null, 'on'), { facets: ['identity', 'layout', 'size'], reveal: 'hover' });
		assert.deepEqual(resolveConfig('always class', 'on'), { facets: ['class'], reveal: 'always' }); // deck's own config kept
	});
});

describe('facetLabel', () => {
	const info = { identity: 'verdict-grid', mode: 'grid', gap: 16, w: 720, h: 360, className: 'verdict-grid tier', padding: '24' };

	test('default profile → identity · layout(+gap) · size', async () => {
		const { facetLabel } = await load();
		assert.equal(facetLabel(info, ['identity', 'layout', 'size']), 'verdict-grid · grid gap:16 · 720×360');
	});

	test('layout drops the gap suffix when there is none; class/box are opt-in', async () => {
		const { facetLabel } = await load();
		assert.equal(facetLabel({ ...info, gap: 0 }, ['layout']), 'grid');
		assert.equal(facetLabel(info, ['class']), '.verdict-grid.tier');
		assert.equal(facetLabel(info, ['box']), 'pad:24 gap:16');
	});
});

describe('debugCss', () => {
	test('is outline-only (never border) and inset, so it cannot reflow a slide', async () => {
		const { debugCss } = await load();
		const css = debugCss();
		assert.match(css, /outline:1px solid/);
		assert.doesNotMatch(css, /border\s*:/); // border-left on the CHIP is fine — see below
		assert.match(css, /outline-offset:-1px/);
	});

	test('outline rules scope under .lattice; the overlay is non-interactive', async () => {
		const { debugCss, LAYOUT_COLORS } = await load();
		const css = debugCss();
		for (const line of css.split('\n')) {
			if (!line.includes('outline:1px')) continue;
			assert.ok(line.includes('.lattice '), `unscoped outline rule: ${line}`);
		}
		assert.match(css, /pointer-events:none/);
		for (const hue of Object.values(LAYOUT_COLORS)) assert.ok(css.includes(hue), `missing hue ${hue}`);
	});
});

describe('LAYOUT_COLORS — WCAG-AA over both preview backgrounds', () => {
	// Relative luminance + contrast ratio (WCAG 2.x).
	const lin = (c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	const lum = (hex) => {
		const n = Number.parseInt(hex.slice(1), 16);
		return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
	};
	const ratio = (a, b) => {
		const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
		return (hi + 0.05) / (lo + 0.05);
	};

	test('every layout hue clears 3:1 (non-text UI) on #0c0c0c and #e7e7ea', async () => {
		const { LAYOUT_COLORS } = await load();
		for (const [mode, hue] of Object.entries(LAYOUT_COLORS)) {
			assert.ok(ratio(hue, '#0c0c0c') >= 3, `${mode} ${hue} vs dark = ${ratio(hue, '#0c0c0c').toFixed(2)}`);
			assert.ok(ratio(hue, '#e7e7ea') >= 3, `${mode} ${hue} vs light = ${ratio(hue, '#e7e7ea').toFixed(2)}`);
		}
	});
});

describe('applyDebug — lifecycle', () => {
	const deck = (attr) =>
		`<div class="lattice"><section${attr ? ` data-debug="${attr}"` : ''}><h1>A</h1></section></div>`;

	test('no-ops safely with no document', async () => {
		const { applyDebug } = await load();
		assert.doesNotThrow(() => applyDebug(null));
		assert.doesNotThrow(() => applyDebug({ contentDocument: null }));
	});

	test('a deck with no data-debug injects nothing', async () => {
		const { applyDebug, DEBUG_STYLE_ID, DEBUG_OVERLAY_ID } = await load();
		const frame = frameWith(deck(null));
		applyDebug(frame, { force: null });
		const doc = frame.contentDocument;
		assert.equal(doc.getElementById(DEBUG_STYLE_ID), null);
		assert.equal(doc.getElementById(DEBUG_OVERLAY_ID), null);
	});

	test('debug: on injects the style + overlay and labels the slide; teardown is clean', async () => {
		const { applyDebug, DEBUG_STYLE_ID, DEBUG_OVERLAY_ID } = await load();
		const frame = frameWith(deck('on'));
		const doc = frame.contentDocument;

		applyDebug(frame, { force: null });
		assert.ok(doc.getElementById(DEBUG_STYLE_ID), 'style injected');
		const overlay = doc.getElementById(DEBUG_OVERLAY_ID);
		assert.ok(overlay, 'overlay injected');
		const chips = overlay.querySelectorAll('.dbg-chip');
		assert.ok(chips.length >= 1, 'section labelled');
		assert.match(chips[0].textContent, /slide 1/); // identity facet
		assert.equal(doc.querySelector('section').getAttribute('data-dbg-layout'), 'flow');

		// A redraw does not stack duplicates.
		applyDebug(frame, { force: null });
		assert.equal(doc.querySelectorAll(`#${DEBUG_OVERLAY_ID}`).length, 1);

		// force:'off' overrides the deck and leaves the DOM pristine.
		applyDebug(frame, { force: 'off' });
		assert.equal(doc.getElementById(DEBUG_OVERLAY_ID), null);
		assert.equal(doc.getElementById(DEBUG_STYLE_ID), null);
		assert.equal(doc.querySelector('section').getAttribute('data-dbg-layout'), null, 'stamp removed');
	});

	test('force:on lights a deck that never asked for debug', async () => {
		const { applyDebug, DEBUG_OVERLAY_ID } = await load();
		const frame = frameWith(deck(null));
		applyDebug(frame, { force: 'on' });
		assert.ok(frame.contentDocument.getElementById(DEBUG_OVERLAY_ID), 'overlay injected by override');
	});

	test('hover mode wires capture-phase document listeners (debug owns input); always does not; teardown clears', async () => {
		const { applyDebug } = await load();
		// hover (the default) → the agent owns pointer input via document listeners
		// (no fixed capture div — that broke on iOS); teardown removes them.
		const f1 = frameWith(deck('on'));
		const d1 = f1.contentDocument;
		applyDebug(f1, { force: null });
		assert.ok(d1.__dbgListeners, 'hover mode wires the document listeners');
		assert.equal(typeof d1.__dbgListeners.onUp, 'function');
		applyDebug(f1, { force: 'off' });
		assert.equal(d1.__dbgListeners, null, 'teardown clears the listeners');

		// `always` mode pins the chips and leaves the deck interactive — no input capture.
		const f2 = frameWith(deck('always'));
		applyDebug(f2, { force: null });
		assert.equal(f2.contentDocument.__dbgListeners, null, 'always mode does not capture input');
	});

	test('touch: a TAP reveals the box beneath (then dismisses); a SWIPE reveals nothing', async () => {
		const { applyDebug } = await load();
		const frame = frameWith(deck('on'));
		const doc = frame.contentDocument;
		applyDebug(frame, { force: null });
		const section = doc.querySelector('section');
		doc.elementsFromPoint = () => [section]; // jsdom has no hit-testing
		const L = doc.__dbgListeners;
		const tap = (x = 5, y = 5) => {
			L.onDown({ pointerType: 'touch', clientX: x, clientY: y });
			L.onUp({ pointerType: 'touch', clientX: x, clientY: y });
		};
		tap();
		assert.equal(doc.__dbgHot, section, 'a tap reveals the box beneath the finger');
		tap();
		assert.equal(doc.__dbgHot, null, 'a second tap dismisses');
		// swipe: down → move past threshold → up ⇒ no reveal (the deck scrolled instead).
		L.onDown({ pointerType: 'touch', clientX: 5, clientY: 5 });
		L.onMove({ pointerType: 'touch', clientX: 5, clientY: 80 });
		L.onUp({ pointerType: 'touch', clientX: 5, clientY: 80 });
		assert.equal(doc.__dbgHot, null, 'a swipe reveals nothing');
	});
});
