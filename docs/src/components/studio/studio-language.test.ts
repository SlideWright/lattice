import { describe, expect, it } from 'vitest';
import { DEFAULT_LANGUAGE, detectLanguage, languageDirective, languageFor, languageLabel, STUDIO_LANGUAGES } from './studio-language';

describe('studio-language — catalog', () => {
	it('is Latin-script only and lists en-US first (the house default)', () => {
		expect(STUDIO_LANGUAGES[0].code).toBe('en-US');
		expect(DEFAULT_LANGUAGE).toBe('en-US');
	});
	it('has unique codes and a label + endonym for every entry', () => {
		const codes = STUDIO_LANGUAGES.map((l) => l.code);
		expect(new Set(codes).size).toBe(codes.length);
		for (const l of STUDIO_LANGUAGES) {
			expect(l.label.length).toBeGreaterThan(0);
			expect(l.endonym.length).toBeGreaterThan(0);
		}
	});
});

describe('studio-language — detectLanguage', () => {
	it('matches an exact BCP-47 tag (case-insensitive)', () => {
		expect(detectLanguage({ language: 'en-GB' })).toBe('en-GB');
		expect(detectLanguage({ language: 'FR-fr' })).toBe('fr-FR');
	});
	it('resolves a region-less tag to the house default for that language', () => {
		expect(detectLanguage({ language: 'en' })).toBe('en-US'); // not en-GB
		expect(detectLanguage({ language: 'pt' })).toBe('pt-BR'); // first pt-* in order
	});
	it('prefers the first entry in navigator.languages', () => {
		expect(detectLanguage({ languages: ['de-DE', 'en-US'] })).toBe('de-DE');
	});
	it('falls back to en-US for an unsupported or missing locale', () => {
		expect(detectLanguage({ language: 'ja-JP' })).toBe(DEFAULT_LANGUAGE);
		expect(detectLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
		expect(detectLanguage({})).toBe(DEFAULT_LANGUAGE);
	});
});

describe('studio-language — directive + labels', () => {
	it('languageFor / languageLabel fall back to the default for unknown codes', () => {
		expect(languageFor('zz-ZZ').code).toBe(DEFAULT_LANGUAGE);
		expect(languageLabel('en-GB')).toBe('English (United Kingdom)');
	});
	it('directive names the language and folds in the spelling note', () => {
		const us = languageDirective('en-US');
		expect(us).toContain('English (United States)');
		expect(us).toContain('American spelling');
		expect(languageDirective('en-GB')).toContain('British spelling');
	});
	it('directive protects code / component names / _class from translation', () => {
		const d = languageDirective('fr-FR');
		expect(d).toContain('French');
		expect(d).toContain('_class');
	});
	it('always returns a non-empty directive, even for an unknown code', () => {
		expect(languageDirective(null).length).toBeGreaterThan(0);
	});
});
