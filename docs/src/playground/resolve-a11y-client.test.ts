import { describe, expect, it } from 'vitest';
import { readA11yFrontMatter, resolveA11yType, resolveRenderInputs } from './resolve-a11y-client.js';

// The client resolver mirrors lib/core/resolve-accessibility.js's precedence
// (workspace > front-matter `accessibility:` > off). These cases pin the
// agreement so the two can't drift on the behaviour the controllers rely on.

const FM = (v: string) => `---\ntheme: indaco\naccessibility: ${v}\n---\n\n# Deck\n`;

describe('resolveA11yType — precedence', () => {
  it('off when neither tier is set', () => {
    expect(resolveA11yType(null, null)).toBe(null);
    expect(resolveA11yType('', '')).toBe(null);
  });

  it('front matter activates when workspace is unset', () => {
    expect(resolveA11yType(null, 'deuteranopia')).toBe('deuteranopia');
  });

  it('workspace wins over a differing front-matter type', () => {
    expect(resolveA11yType('tritanopia', 'deuteranopia')).toBe('tritanopia');
  });

  it('explicit workspace off overrides a front-matter on', () => {
    expect(resolveA11yType('off', 'deuteranopia')).toBe(null);
  });

  it('canonicalizes dichromacy aliases (deutan → deuteranopia)', () => {
    expect(resolveA11yType('deutan', null)).toBe('deuteranopia');
    expect(resolveA11yType(null, 'protan')).toBe('protanopia');
  });

  it('recognizes achromatopsia + its aliases', () => {
    for (const a of ['achromatopsia', 'monochromacy', 'achromat', 'monochrome']) {
      expect(resolveA11yType(a, null)).toBe('achromatopsia');
    }
  });

  it('treats an unknown token as unset (a typo never silently disables)', () => {
    expect(resolveA11yType('banana', 'tritanopia')).toBe('tritanopia');
  });

  it("treats 'normal' as an explicit off (exact mirror of the server)", () => {
    expect(resolveA11yType('normal', 'deuteranopia')).toBe(null);
    expect(resolveA11yType(null, 'normal')).toBe(null);
  });
});

describe('readA11yFrontMatter', () => {
  it('reads the accessibility: key (bare or quoted)', () => {
    expect(readA11yFrontMatter(FM('deuteranopia'))).toBe('deuteranopia');
    expect(readA11yFrontMatter('---\naccessibility: "tritanopia"\n---\n')).toBe('tritanopia');
  });
  it('returns null with no front matter / no key', () => {
    expect(readA11yFrontMatter('# Just a heading')).toBe(null);
    expect(readA11yFrontMatter('---\ntheme: indaco\n---\n')).toBe(null);
  });
});

describe('resolveRenderInputs — effective palette', () => {
  const mkRoot = (attrs: Record<string, string | null>) => ({
    getAttribute: (k: string) => (k in attrs ? attrs[k] : null),
  });

  it('an active workspace need overrides the theme with a11y-<type>', () => {
    const root = mkRoot({ 'data-palette': 'cuoio', 'data-mode': 'light', 'data-a11y': 'deuteranopia' });
    expect(resolveRenderInputs(root, '')).toEqual({ palette: 'a11y-deuteranopia', mode: 'light', a11y: 'deuteranopia' });
  });

  it('falls back to the deck theme when no accessibility is set', () => {
    const root = mkRoot({ 'data-palette': 'cuoio', 'data-mode': 'dark' });
    expect(resolveRenderInputs(root, FM(''))).toEqual({ palette: 'cuoio', mode: 'dark', a11y: null });
  });

  it("uses the deck's accessibility: key when the workspace is unset", () => {
    const root = mkRoot({ 'data-palette': 'indaco', 'data-mode': 'light' });
    expect(resolveRenderInputs(root, FM('protanopia'))).toEqual({ palette: 'a11y-protanopia', mode: 'light', a11y: 'protanopia' });
  });
});
