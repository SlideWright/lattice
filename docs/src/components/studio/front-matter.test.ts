import { describe, expect, it } from 'vitest';
import { frontMatterBlock, getFrontMatter, setFrontMatter, stripFrontMatter } from './front-matter';

const BODY = '<!-- _class: title -->\n\n# Hello\n\n---\n\n## Second';

describe('front-matter', () => {
	it('creates a block on the first directive', () => {
		const out = setFrontMatter(BODY, 'size', 'square');
		expect(out.startsWith('---\nsize: square\n---\n\n')).toBe(true);
		expect(stripFrontMatter(out)).toBe(BODY);
		expect(getFrontMatter(out, 'size')).toBe('square');
	});

	it('updates an existing key, preserves the others', () => {
		let out = setFrontMatter(BODY, 'size', '16:9');
		out = setFrontMatter(out, 'paginate', 'true');
		out = setFrontMatter(out, 'size', 'standard');
		expect(getFrontMatter(out, 'size')).toBe('standard');
		expect(getFrontMatter(out, 'paginate')).toBe('true');
		// Body is untouched (and not duplicated).
		expect(stripFrontMatter(out)).toBe(BODY);
	});

	it('removes the block when the last key is cleared', () => {
		const withFm = setFrontMatter(BODY, 'paginate', 'true');
		expect(frontMatterBlock(withFm)).not.toBe('');
		const cleared = setFrontMatter(withFm, 'paginate', null);
		expect(frontMatterBlock(cleared)).toBe('');
		expect(cleared).toBe(BODY);
	});

	it('quotes values that need it (header text with spaces)', () => {
		const out = setFrontMatter(BODY, 'header', 'Q3 Board Review');
		expect(out).toContain('header: "Q3 Board Review"');
		expect(getFrontMatter(out, 'header')).toBe('Q3 Board Review');
	});

	it('the body separator `---` is not mistaken for front-matter', () => {
		// No leading block → the inter-slide `---` stays in the body.
		expect(frontMatterBlock(BODY)).toBe('');
		expect(stripFrontMatter(BODY)).toBe(BODY);
	});
});
