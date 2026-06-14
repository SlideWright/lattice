import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	FACULTIES,
	FACULTY_KEY,
	isFacultyVisible,
	PANES,
	paneLabel,
	readFaculty,
	writeFaculty,
} from './workbench-controller';

describe('faculty constants', () => {
	it('lists the two benches in order', () => {
		expect(FACULTIES.map((f) => f.value)).toEqual(['theme', 'layout']);
	});
});

describe('readFaculty / writeFaculty', () => {
	beforeEach(() => localStorage.clear());
	afterEach(() => localStorage.clear());

	it('defaults to the Theme Studio with nothing saved', () => {
		expect(readFaculty()).toBe('theme');
	});

	it('round-trips a saved faculty', () => {
		writeFaculty('layout');
		expect(localStorage.getItem(FACULTY_KEY)).toBe('layout');
		expect(readFaculty()).toBe('layout');
	});

	it('ignores a garbage saved value', () => {
		localStorage.setItem(FACULTY_KEY, 'nonsense');
		expect(readFaculty()).toBe('theme');
	});
});

describe('paneLabel', () => {
	it('labels the third pane Contrast in the Theme Studio and Gate in the Layout Studio', () => {
		expect(paneLabel('contrast', 'theme')).toBe('Contrast');
		expect(paneLabel('contrast', 'layout')).toBe('Gate');
	});

	it('shares the first two pane labels across faculties', () => {
		expect(paneLabel('design', 'theme')).toBe('Design');
		expect(paneLabel('preview', 'layout')).toBe('Preview');
	});

	it('drives the same data-tab key for the third pane regardless of label', () => {
		expect(PANES.find((p) => p.value === 'contrast')?.value).toBe('contrast');
	});
});

describe('isFacultyVisible', () => {
	it('shows only the active faculty', () => {
		expect(isFacultyVisible('theme', 'theme')).toBe(true);
		expect(isFacultyVisible('layout', 'theme')).toBe(false);
		expect(isFacultyVisible('layout', 'layout')).toBe(true);
	});
});
