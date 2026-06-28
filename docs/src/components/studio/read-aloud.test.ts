import { describe, expect, it } from 'vitest';
import { slideToSpeech } from './read-aloud';

// slideToSpeech is the narration extractor — it turns a slide's Markdown into the
// readable prose the teleprompter highlights and the voice ladder speaks. Pure;
// no engine, no DOM.
describe('slideToSpeech — Markdown → readable narration', () => {
	it('drops the _class directive, keeps the prose', () => {
		const out = slideToSpeech('<!-- _class: kpi -->\n\n## Revenue is up\n\nWe grew 40% this quarter.');
		expect(out).toContain('Revenue is up');
		expect(out).toContain('We grew 40% this quarter.');
		expect(out).not.toContain('_class');
		expect(out).not.toContain('##');
	});

	it('strips list markers, emphasis and inline code', () => {
		const out = slideToSpeech('- **Bold** point\n- a `code` token\n- plain item');
		expect(out).toContain('Bold point');
		expect(out).toContain('a code token');
		expect(out).not.toMatch(/[*`]/);
		expect(out).not.toMatch(/(^|\s)-\s/);
	});

	it('keeps the link label, drops the URL', () => {
		const out = slideToSpeech('See [the report](https://example.com/x) for detail.');
		expect(out).toContain('the report');
		expect(out).not.toContain('http');
	});

	it('skips fenced code blocks and background images entirely', () => {
		const out = slideToSpeech('Intro line.\n\n```js\nconst x = 1;\n```\n\n![bg](photo.jpg)\n\nClosing line.');
		expect(out).toContain('Intro line.');
		expect(out).toContain('Closing line.');
		expect(out).not.toContain('const x');
		expect(out).not.toContain('photo.jpg');
	});

	it('returns empty string for image-only / empty slides', () => {
		expect(slideToSpeech('![bg](a.svg)')).toBe('');
		expect(slideToSpeech('')).toBe('');
		expect(slideToSpeech('<!-- _class: cover -->')).toBe('');
	});
});
