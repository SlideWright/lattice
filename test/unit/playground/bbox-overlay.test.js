/**
 * Unit: bbox-overlay.js — the debug "bounding boxes" overlay injected into the
 * preview iframe. Locks the pure CSS contract (outline-only so it can't reflow a
 * slide, scoped under `.lattice`, colour-coded by role) and the inject/remove
 * lifecycle against a minimal stub document (no jsdom needed).
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

async function load() {
	return import('../../../docs/src/playground/bbox-overlay.js');
}

// A tiny stand-in for the iframe's contentDocument: enough surface for applyBbox
// (createElement, head.appendChild, getElementById, element.remove).
function stubDoc() {
	const byId = new Map();
	const head = {
		children: [],
		appendChild(node) {
			this.children.push(node);
			if (node.id) byId.set(node.id, node);
			node._parent = this;
		},
	};
	return {
		head,
		createElement: (tag) => ({ tagName: tag.toUpperCase(), id: '', textContent: '', remove() { this._parent.children = this._parent.children.filter((n) => n !== this); byId.delete(this.id); } }),
		getElementById: (id) => byId.get(id) || null,
	};
}

describe('bboxCss', () => {
	test('is outline-only — never a border, so it cannot reflow a slide', async () => {
		const { bboxCss } = await load();
		const css = bboxCss();
		assert.match(css, /outline:1px solid/);
		assert.doesNotMatch(css, /border\s*:/);
		// Inset offset keeps a child outline from bleeding past its parent.
		assert.match(css, /outline-offset:-1px/);
	});

	test('scopes every rule under .lattice and colour-codes by role', async () => {
		const { bboxCss } = await load();
		const css = bboxCss();
		// Each selector is namespaced to the rendered deck, not the iframe chrome.
		for (const line of css.split('\n')) {
			if (line.startsWith('/*') || !line.includes('{')) continue;
			assert.ok(line.includes('.lattice'), `unscoped rule: ${line}`);
		}
		// Representative roles each carry a distinct hue.
		assert.match(css, /\.lattice section\{outline:1px solid #e6194b/);
		assert.match(css, /\.lattice h1,[^{]*\{outline:1px solid #f58231/);
		assert.match(css, /\.lattice p\{outline:1px solid #4363d8/);
	});
});

describe('applyBbox', () => {
	test('injects one <style> when on, removes it when off, idempotently', async () => {
		const { applyBbox, BBOX_STYLE_ID } = await load();
		const doc = stubDoc();
		const frame = { contentDocument: doc };

		applyBbox(frame, true);
		const style = doc.getElementById(BBOX_STYLE_ID);
		assert.ok(style, 'style injected');
		assert.match(style.textContent, /outline:1px solid/);

		// Calling again does not stack a duplicate.
		applyBbox(frame, true);
		assert.equal(doc.head.children.length, 1);

		applyBbox(frame, false);
		assert.equal(doc.getElementById(BBOX_STYLE_ID), null, 'style removed');
		// Removing again is a no-op.
		applyBbox(frame, false);
		assert.equal(doc.head.children.length, 0);
	});

	test('no-ops safely when the frame has no document yet', async () => {
		const { applyBbox } = await load();
		assert.doesNotThrow(() => applyBbox(null, true));
		assert.doesNotThrow(() => applyBbox({ contentDocument: null }, true));
	});
});
