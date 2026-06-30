import { describe, expect, it } from 'vitest';
import { packBundle, packComponent, packFinish, packTheme, showcaseDeck, unpackBundle } from './asset-bundle';
import type { StudioComponent } from './component-library';
import { DEFAULT_RECIPE } from './finish-generate';
import type { StudioFinish } from './finish-library';
import type { StudioTheme } from './theme-library';

const theme: StudioTheme = {
	id: 't1',
	name: 'harbor',
	label: 'Harbor',
	css: '@theme harbor { --accent: #2d4ed8; }',
	essentials: { accent: '#2d4ed8', bg: '#ffffff' },
};
const comp: StudioComponent = { id: 'c1', name: 'callout', bucket: 'statement', css: 'section.callout { color: var(--accent); }', skeleton: '<!-- _class: callout -->\n\n## Hi' };
const finish: StudioFinish = { id: 'f1', name: 'mybrand', label: 'My Brand', css: 'section.finish.finish-mybrand { --fin-wash: none; }', recipe: { ...DEFAULT_RECIPE, mark: { type: 'monogram', placement: 'bottom-right', glyph: 'AB' } } };

describe('asset-bundle — pack/unpack roundtrip', () => {
	it('packs a theme and reads it back (name/label/essentials/css)', async () => {
		const round = await unpackBundle(await packTheme(theme));
		expect(round.themes).toHaveLength(1);
		expect(round.components).toHaveLength(0);
		expect(round.themes[0]).toEqual({ name: 'harbor', label: 'Harbor', essentials: theme.essentials, css: theme.css });
	});

	it('records the showcase PDF in the manifest when supplied', async () => {
		const pdf = new Blob([new Uint8Array([1, 2, 3])], { type: 'application/pdf' });
		const { default: JSZip } = await import('jszip');
		const zip = await JSZip.loadAsync(await packTheme(theme, pdf));
		expect(zip.file('harbor-showcase.pdf')).toBeTruthy();
		const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'));
		expect(manifest.items[0].showcase).toBe('harbor-showcase.pdf');
	});

	it('packs a component and reads it back (css + skeleton + bucket)', async () => {
		const round = await unpackBundle(await packComponent(comp));
		expect(round.components).toEqual([{ name: 'callout', bucket: 'statement', css: comp.css, skeleton: comp.skeleton }]);
	});

	it('packs a finish and reads it back (css + recipe roundtrip)', async () => {
		const round = await unpackBundle(await packFinish(finish));
		expect(round.themes).toHaveLength(0);
		expect(round.components).toHaveLength(0);
		expect(round.finishes).toHaveLength(1);
		expect(round.finishes[0].name).toBe('mybrand');
		expect(round.finishes[0].label).toBe('My Brand');
		expect(round.finishes[0].css).toBe(finish.css);
		// The structured recipe survives (coerced — so a hand-edited number stays in-vocab).
		expect(round.finishes[0].recipe.mark.type).toBe('monogram');
		expect(round.finishes[0].recipe.mark.glyph).toBe('AB');
	});

	it('a finish re-imports renderable even when the recipe JSON is absent (coerced)', async () => {
		const { default: JSZip } = await import('jszip');
		const zip = new JSZip();
		zip.file('mybrand.finish.css', finish.css);
		zip.file('manifest.json', JSON.stringify({ format: 'lattice-asset/1', kind: 'finish', items: [{ kind: 'finish', name: 'mybrand', label: 'My Brand', css: 'mybrand.finish.css', recipe: 'mybrand.recipe.json' }] }));
		const round = await unpackBundle(await zip.generateAsync({ type: 'blob' }));
		expect(round.finishes).toHaveLength(1);
		expect(round.finishes[0].recipe).toBeDefined(); // coerceRecipe gives a renderable default
	});

	it('packs a mixed bundle and reads back all three kinds', async () => {
		const round = await unpackBundle(await packBundle([{ theme }], [comp], [finish]));
		expect(round.themes.map((t) => t.name)).toEqual(['harbor']);
		expect(round.components.map((c) => c.name)).toEqual(['callout']);
		expect(round.finishes.map((f) => f.name)).toEqual(['mybrand']);
	});

	it('rejects a zip without a Lattice manifest', async () => {
		const { default: JSZip } = await import('jszip');
		const z = new JSZip();
		z.file('hello.txt', 'not a lattice asset');
		await expect(unpackBundle(await z.generateAsync({ type: 'blob' }))).rejects.toThrow(/manifest/i);
	});

	it('showcase deck exercises the engine range', () => {
		const d = showcaseDeck('Harbor');
		for (const cls of ['title', 'kpi', 'journey', 'diagram', 'split-panel', 'closing']) expect(d).toContain(`_class: ${cls}`);
		expect(d).toContain('```mermaid');
		expect(d).toContain('# Harbor');
	});
});
