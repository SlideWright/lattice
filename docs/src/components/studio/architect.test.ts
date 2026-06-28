import { afterEach, describe, expect, it } from 'vitest';
import { applyDeckEdit, architectSpend, refineSelection, requestFindingFix, runArchitect, setBudget } from './architect';
import { suggestFor } from './Editor';

afterEach(() => {
	try {
		localStorage.clear();
	} catch {
		/* no storage */
	}
});

// Bug A11: fixAll used to hardcode `kpi`; it now lands the SAME "did you mean"
// the inline underline promises. suggestFor is the shared source of that pick.
describe('suggestFor — the shared "did you mean"', () => {
	const known = new Set(['title', 'kpi', 'agenda', 'cards-grid', 'closing']);
	it('matches the longest shared prefix', () => {
		expect(suggestFor('agendaa', known)).toBe('agenda');
		expect(suggestFor('titl', known)).toBe('title'); // tit… → title
		expect(suggestFor('closin', known)).toBe('closing');
	});
	it('falls back to kpi when nothing is close', () => {
		expect(suggestFor('zzz-bogus', known)).toBe('kpi');
	});
});

describe('setBudget — the cap the architect honours', () => {
	it('persists a cap + mode, and clears the cap at 0', () => {
		setBudget(5, 'stop');
		let s = architectSpend();
		expect(s.cap).toBe(5);
		expect(s.mode).toBe('stop');
		setBudget(null, 'alert');
		s = architectSpend();
		expect(s.cap).toBe(0);
		expect(s.mode).toBe('alert');
	});
});

describe('runArchitect — honest offline degradation', () => {
	it('returns `offline` when no model is connected (the floor)', async () => {
		// No OpenRouter key, no on-device model in the test env → the floor. The
		// architect must NOT fabricate an edit; it reports offline so the UI can
		// point the author at Workspace instead of faking a change.
		const out = await runArchitect('<!-- _class: title -->\n\n# Hello', 'Rewrite slide 1.');
		expect(out.status).toBe('offline');
	});
});

describe('requestFindingFix — honest per-finding fix', () => {
	const finding = { slide: 2, rule: 'wall-of-text', severity: 'warning', message: 'Too many words on this slide.' };
	it('returns `offline` with no model connected — never a fabricated rewrite', async () => {
		const out = await requestFindingFix('<!-- _class: title -->\n\n# A', finding, []);
		expect(out.status).toBe('offline');
	});
	it('applyDeckEdit splices a replace edit into the right slide', () => {
		const src = '<!-- _class: title -->\n\n# One\n\n---\n\n<!-- _class: kpi -->\n\n# Two';
		const next = applyDeckEdit(src, { action: 'replace', slide: 2, body: '<!-- _class: kpi -->\n\n# Rewritten' });
		expect(next).toContain('# Rewritten');
		expect(next).toContain('# One'); // slide 1 untouched
		expect(next).not.toContain('# Two');
	});
});

describe('refineSelection — honest selection refine', () => {
	it('returns `nochange` for empty/whitespace text without touching the model', async () => {
		expect((await refineSelection('polish', '')).status).toBe('nochange');
		expect((await refineSelection('shorten', '   \n  ')).status).toBe('nochange');
	});
	it('returns `offline` with no model connected (the floor) — never a fabricated rewrite', async () => {
		// Same honesty contract as runArchitect: no model → no rewrite, just a
		// signal the UI can act on (point at Workspace), not a faked change.
		const out = await refineSelection('polish', 'Tighten this sentence please.');
		expect(out.status).toBe('offline');
	});
});
