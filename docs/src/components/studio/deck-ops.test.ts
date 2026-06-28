import { describe, expect, it } from 'vitest';
import { addSlideAfter, deleteSlide, duplicateSlide, moveSlide, NEW_SLIDE } from './deck-ops';
import { stripFrontMatter } from './front-matter';
import { splitSlides } from './lint';

const DECK = '<!-- _class: title -->\n\n# A\n\n---\n\n<!-- _class: kpi -->\n\n## B\n\n---\n\n<!-- _class: closing -->\n\n## C';
const count = (s: string) => splitSlides(stripFrontMatter(s)).length;

describe('deck-ops — structural slide editing', () => {
	it('addSlideAfter inserts and returns the new index', () => {
		const r = addSlideAfter(DECK, 0);
		expect(count(r.source)).toBe(4);
		expect(r.active).toBe(1);
		expect(splitSlides(stripFrontMatter(r.source))[1]).toBe(NEW_SLIDE);
	});

	it('duplicateSlide copies the slide right after it', () => {
		const r = duplicateSlide(DECK, 1);
		const slides = splitSlides(stripFrontMatter(r.source));
		expect(count(r.source)).toBe(4);
		expect(slides[1]).toBe(slides[2]); // B duplicated
		expect(r.active).toBe(2);
	});

	it('deleteSlide removes the slide, never the last one', () => {
		const r = deleteSlide(DECK, 1);
		const slides = splitSlides(stripFrontMatter(r.source));
		expect(count(r.source)).toBe(2);
		expect(slides.some((s) => s.includes('## B'))).toBe(false);
		// A one-slide deck is never emptied.
		const single = '<!-- _class: title -->\n\n# Only';
		expect(count(deleteSlide(single, 0).source)).toBe(1);
	});

	it('moveSlide reorders and the active index follows', () => {
		const r = moveSlide(DECK, 0, 2); // A to the end
		const slides = splitSlides(stripFrontMatter(r.source));
		expect(slides[2]).toContain('# A');
		expect(r.active).toBe(2);
	});

	it('preserves front-matter across every op', () => {
		const withFm = `---\nsize: square\npaginate: true\n---\n\n${DECK}`;
		for (const r of [addSlideAfter(withFm, 0), duplicateSlide(withFm, 0), deleteSlide(withFm, 0), moveSlide(withFm, 0, 1)]) {
			expect(r.source).toMatch(/^---\nsize: square\npaginate: true\n---\n/);
			// The front-matter is not counted as a slide.
			expect(count(r.source)).toBeGreaterThanOrEqual(2);
		}
	});
});
