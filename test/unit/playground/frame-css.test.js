/**
 * Unit: frame-css.js — the single source of truth for the preview slide box.
 *
 * Proves the size-aware helpers pin the box to the deck's resolved `@size`
 * geometry (not a hardcoded 1280×720). A host that scales by `w / slideWidth`
 * MUST size the section to the same width, or a `size: 4K` deck renders at the
 * wrong size — the 4K-preview bug. The no-arg form is the HD default the
 * single-slide hosts (landing hero, component specimens) rely on.
 *
 * DOM-free module → tested directly, no iframe / browser.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
	return import('../../../docs/src/playground/frame-css.js');
}

describe('frame-css geometry helpers', () => {
	test('slideBox() defaults to the HD box', async () => {
		const { slideBox, DEFAULT_W, DEFAULT_H } = await load();
		assert.equal(DEFAULT_W, 1280);
		assert.equal(DEFAULT_H, 720);
		assert.equal(slideBox(), '.marpit>section{width:1280px;height:720px}');
	});

	test('slideBox(w, h) sizes the box to the deck geometry (4K)', async () => {
		const { slideBox } = await load();
		assert.equal(slideBox(3840, 2160), '.marpit>section{width:3840px;height:2160px}');
	});

	test('singleSlideFrame() pins viewport + wrapper + box to one geometry', async () => {
		const { singleSlideFrame, slideBox } = await load();
		const hd = singleSlideFrame();
		assert.match(hd, /html,body\{[^}]*width:1280px;height:720px/);
		assert.match(hd, /\.marpit\{width:1280px;height:720px\}/);
		assert.ok(hd.includes(slideBox()), 'includes the section box');
		// At 4K every dimension tracks the box so the scaled element fills the host.
		const k = singleSlideFrame(3840, 2160);
		assert.match(k, /html,body\{[^}]*width:3840px;height:2160px/);
		assert.match(k, /\.marpit\{width:3840px;height:2160px\}/);
		assert.ok(k.includes(slideBox(3840, 2160)), 'includes the 4K section box');
	});
});
