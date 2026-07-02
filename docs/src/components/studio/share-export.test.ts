import { describe, expect, it } from 'vitest';
import { embedFinishInMarkdown } from './share-export';

// The source-handoff finish embed (Markdown / Marp share). A saved finish renders
// only from its generated CSS, so the exported copy must carry that CSS inline —
// for a PER-SLIDE finish (`_class: … finish-<slug>`) as well as a deck-wide one.
describe('embedFinishInMarkdown', () => {
	const CSS = 'section.finish.finish-shu { --fin-wash: radial-gradient(circle, red, transparent); }';

	it('embeds the finish CSS as a global <style> after the front matter — PER-SLIDE (no deck-wide class)', () => {
		const src = '---\ntheme: indaco\n---\n\n<!-- _class: title finish-shu -->\n\n# Hi\n';
		// finishClass is empty (the finish is applied per-slide, not deck-wide).
		const out = embedFinishInMarkdown(src, '', CSS);
		expect(out).toContain('<style>');
		expect(out).toContain('--fin-wash'); // the CSS is inlined
		// the <style> lands right after the closing front-matter fence…
		expect(out.indexOf('<style>')).toBeGreaterThan(out.indexOf('\n---\n'));
		// …and BEFORE the first slide content, so it's a global rule.
		expect(out.indexOf('<style>')).toBeLessThan(out.indexOf('_class: title finish-shu'));
		// per-slide: the source's own class line is untouched (no deck-wide class merge).
		expect(out).not.toMatch(/^class:/m);
	});

	it('also merges the deck-wide finish class when one is given', () => {
		const src = '---\nfinish: finish-shu\n---\n\n# Hi\n';
		const out = embedFinishInMarkdown(src, 'finish finish-shu', CSS);
		expect(out).toContain('<style>');
		expect(out).toMatch(/^class:.*\bfinish\b.*\bfinish-shu\b/m); // stamped deck-wide
	});

	it('is a no-op when the deck references no saved finish (nothing to embed)', () => {
		const src = '---\ntheme: indaco\n---\n\n# Plain\n';
		expect(embedFinishInMarkdown(src, '', undefined)).toBe(src);
		expect(embedFinishInMarkdown(src, '', '')).toBe(src);
	});

	it('embeds combined CSS for multiple per-slide finishes', () => {
		const combined = `${CSS}\n\nsection.finish.finish-oct { --fin-texture: none; }`;
		const src = '---\ntheme: indaco\n---\n\n<!-- _class: a finish-shu -->\n\n# A\n\n---\n\n<!-- _class: b finish-oct -->\n\n# B\n';
		const out = embedFinishInMarkdown(src, '', combined);
		expect(out).toContain('finish-shu');
		expect(out).toContain('finish-oct'); // both finishes' CSS present
	});
});
