import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { slideClass, splitSlides, unknownComponents, usedComponents } from './lint';

const KNOWN = ['title', 'kpi', 'quote', 'cards-grid', 'stats'];
// Component-name-ish tokens (won't accidentally contain a `-->` or a fence).
const nameArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/);
// Slide body that can't introduce an accidental `\n---\n` fence.
const bodyArb = fc.stringMatching(/^[\p{L}\p{N} .,!?#*]{0,40}$/u);

describe('splitSlides (fuzz)', () => {
	it('never throws and yields trimmed, non-empty chunks for ANY input', () => {
		fc.assert(
			fc.property(fc.string(), (s) => {
				const out = splitSlides(s);
				expect(Array.isArray(out)).toBe(true);
				for (const chunk of out) {
					expect(chunk.length).toBeGreaterThan(0);
					expect(chunk).toBe(chunk.trim());
				}
			}),
		);
	});

	it('recovers exactly N slides from N fenced bodies', () => {
		fc.assert(
			fc.property(fc.array(bodyArb.filter((b) => b.trim().length > 0), { minLength: 1, maxLength: 8 }), (bodies) => {
				const src = bodies.join('\n---\n');
				expect(splitSlides(src)).toHaveLength(bodies.length);
			}),
		);
	});

	it('handles undefined/empty without throwing', () => {
		expect(splitSlides(undefined as unknown as string)).toEqual([]);
		expect(splitSlides('')).toEqual([]);
	});
});

describe('unknownComponents (fuzz)', () => {
	it('flags exactly the names not in the known set — never throws', () => {
		fc.assert(
			fc.property(fc.array(nameArb, { maxLength: 12 }), (names) => {
				const src = names.map((n) => `<!-- _class: ${n} -->\n# ${n}`).join('\n---\n');
				const flagged = unknownComponents(src, KNOWN);
				const expected = names.filter((n) => !KNOWN.includes(n));
				expect(flagged).toEqual(expected);
				// Invariant: flagged ⊆ used, and none are known.
				const used = new Set(usedComponents(src));
				for (const f of flagged) {
					expect(used.has(f)).toBe(true);
					expect(KNOWN.includes(f)).toBe(false);
				}
			}),
		);
	});

	it('a deck of only-known components has zero issues', () => {
		fc.assert(
			fc.property(fc.array(fc.constantFrom(...KNOWN), { minLength: 1, maxLength: 10 }), (names) => {
				const src = names.map((n) => `<!-- _class: ${n} -->`).join('\n---\n');
				expect(unknownComponents(src, KNOWN)).toEqual([]);
			}),
		);
	});

	it('arbitrary prose never crashes the detector', () => {
		fc.assert(
			fc.property(fc.string(), (s) => {
				expect(() => unknownComponents(s, KNOWN)).not.toThrow();
			}),
		);
	});
});

describe('slideClass (fuzz)', () => {
	it("returns the slide's first `_class`, or `text` for a bare slide — never throws", () => {
		fc.assert(
			fc.property(nameArb, bodyArb, (name, body) => {
				expect(slideClass(`<!-- _class: ${name} -->\n${body}`)).toBe(name);
			}),
		);
		// Bare-Markdown slide (no _class) and degenerate inputs fall back to `text`.
		expect(slideClass('## Just a heading\n\nSome prose.')).toBe('text');
		expect(slideClass('')).toBe('text');
		expect(slideClass(undefined as unknown as string)).toBe('text');
	});

	it('reads only the FIRST class when a slide somehow carries two', () => {
		expect(slideClass('<!-- _class: kpi -->\n<!-- _class: quote -->')).toBe('kpi');
	});
});
