import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';
import { makeStudioCompletion } from './editor-complete';

const COMPS = [
	{ name: 'kpi', bucket: 'inventory', description: 'Key metrics' },
	{ name: 'quote', bucket: 'statement', description: 'A pull quote' },
];
const src = makeStudioCompletion(COMPS);

function complete(doc: string, pos = doc.length) {
	const state = EditorState.create({ doc });
	return src(new CompletionContext(state, pos, true));
}
const labels = (r: ReturnType<typeof complete>) => (r ? r.options.map((o) => o.label) : []);

describe('makeStudioCompletion', () => {
	it('completes component names on a _class line', () => {
		const r = complete('<!-- _class: ');
		expect(labels(r)).toEqual(['kpi', 'quote']);
	});

	it('completes a partially-typed component name', () => {
		const r = complete('<!-- _class: kp');
		expect(labels(r)).toContain('kpi');
		// `from` points at the start of the partial word so it replaces, not appends.
		expect(r?.from).toBe('<!-- _class: '.length);
	});

	it('completes fenced-block languages after ```', () => {
		const r = complete('```');
		expect(labels(r)).toContain('mermaid');
		expect(labels(r)).toContain('chart');
	});

	it('completes front-matter keys inside the --- block', () => {
		const r = complete('---\nsi', 6);
		expect(labels(r)).toContain('size');
		expect(labels(r)).toContain('paginate');
	});

	it('completes the backdrop + mode keys in the --- block', () => {
		expect(labels(complete('---\nbackd', 9))).toContain('backdrop');
		expect(labels(complete('---\nmod', 7))).toContain('mode');
	});

	it('does not fire in plain prose', () => {
		expect(complete('Just some body text here')).toBeNull();
	});

	it('does not fire on the front-matter fence line itself', () => {
		// On the closing `---`, the key completer must stand down.
		expect(complete('---\nsize: 16:9\n---', 18)).toBeNull();
	});
});
