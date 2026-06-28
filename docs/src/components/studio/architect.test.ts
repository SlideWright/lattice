import { afterEach, describe, expect, it } from 'vitest';
import { architectSpend, runArchitect, setBudget } from './architect';
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
