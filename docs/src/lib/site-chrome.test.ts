import { afterEach, describe, expect, it } from 'vitest';
import { getMode, getPalette, setMode, setPalette, syncFromStorage, toggleMode } from './site-chrome';

afterEach(() => {
	const r = document.documentElement;
	r.removeAttribute('data-palette');
	r.removeAttribute('data-mode');
	r.removeAttribute('data-theme');
	localStorage.clear();
});

describe('site-chrome controller', () => {
	it('setPalette writes the attribute + localStorage', () => {
		setPalette('cuoio');
		expect(document.documentElement.getAttribute('data-palette')).toBe('cuoio');
		expect(localStorage.getItem('lattice-docs-palette')).toBe('cuoio');
		expect(getPalette()).toBe('cuoio');
	});

	it('setMode writes data-mode + data-theme in lockstep + both localStorage keys', () => {
		setMode('dark');
		const r = document.documentElement;
		expect(r.getAttribute('data-mode')).toBe('dark');
		expect(r.getAttribute('data-theme')).toBe('dark'); // Starlight lockstep
		expect(localStorage.getItem('lattice-docs-mode')).toBe('dark');
		expect(localStorage.getItem('starlight-theme')).toBe('dark');
	});

	it('toggleMode flips and returns the next mode', () => {
		setMode('light');
		expect(toggleMode()).toBe('dark');
		expect(getMode()).toBe('dark');
		expect(toggleMode()).toBe('light');
		expect(getMode()).toBe('light');
	});

	it('getPalette defaults to indaco when unset', () => {
		expect(getPalette()).toBe('indaco');
	});

	it('syncFromStorage re-applies the stored palette/mode to the attributes', () => {
		localStorage.setItem('lattice-docs-palette', 'onyx');
		localStorage.setItem('lattice-docs-mode', 'dark');
		const s = syncFromStorage();
		expect(s).toEqual({ palette: 'onyx', mode: 'dark' });
		expect(document.documentElement.getAttribute('data-palette')).toBe('onyx');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
	});
});
