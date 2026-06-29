// The Lattice asset-share format — a portable `.zip` for a saved theme or
// component, built on ONE `manifest.json` envelope (the same shape the
// `.lattice` deck format uses: `engineering/decisions/2026-06-16-lattice-export-format.md`).
// Pack here is pure data + JSZip; the live theme PDF showcase is rendered by the
// caller (Library) and handed in as a Blob, so this module stays engine-free and
// testable. Unpack re-hydrates straight into the shared asset store.
//
// Layout — single asset (files at root), bundle (one zip, many assets):
//   <slug>.lattice-theme.zip      manifest.json · <slug>.css · <slug>-showcase.pdf · README.md
//   <slug>.lattice-component.zip  manifest.json · <slug>.css · <slug>.skeleton.md · README.md
//   lattice-assets.zip            manifest.json · themes/<slug>/… · components/<slug>/… · README.md

import type { StudioComponent } from './component-library';
import type { StudioTheme } from './theme-library';

export const ASSET_FORMAT = 'lattice-asset/1';

export type ThemeItem = { kind: 'theme'; name: string; label: string; essentials: Record<string, string> | null; css: string; showcase?: string };
export type ComponentItem = { kind: 'component'; name: string; bucket: string | null; css: string; skeleton: string };
export type ManifestItem = ThemeItem | ComponentItem;
export type AssetManifest = { format: typeof ASSET_FORMAT; kind: 'theme' | 'component' | 'bundle'; items: ManifestItem[] };

export type ParsedTheme = { name: string; label: string; essentials: Record<string, string> | null; css: string };
export type ParsedComponent = { name: string; bucket: string | null; css: string; skeleton: string };
export type ParsedBundle = { themes: ParsedTheme[]; components: ParsedComponent[] };

export const themeZipName = (t: { name: string }) => `${t.name}.lattice-theme.zip`;
export const componentZipName = (c: { name: string }) => `${c.name}.lattice-component.zip`;

// A representative deck that exercises the theme across the engine's range —
// title, KPIs, a journey chart (the categorical series band), a Mermaid flow, a
// split-panel, and a closing slide — rendered live in the theme so showcase.pdf
// SHOWS the look. (Journey reads the `--chart-catN` series tokens the derived
// theme emits; piechart would need `--chart-cat-N-hue`, which it doesn't.)
export function showcaseDeck(label: string): string {
	const L = label || 'Your theme';
	return `---
size: hd
paginate: true
---

<!-- _class: title -->
<!-- _paginate: false -->

# ${L}

\`Lattice · theme showcase\`

Every surface this palette touches — type, charts, diagrams, structure.

---

<!-- _class: kpi -->

\`Highlights · at a glance\`

## The numbers, framed.

1. 100
   - Tokens derived
2. AA
   - Contrast floor
3. 8
   - Chart series

---

<!-- _class: journey -->

\`Charts · a journey map\`

## From first touch to activation.

- Evaluate
  - Read the case study \`@prospect\` \`:4\`
  - Book a demo \`@prospect\` \`:3\`
- Trial
  - First win \`@user\` \`:5\`
  - Invite the team \`@user\` \`:4\`
- Adopt
  - Roll out \`@team\` \`:5\`
  - Renew \`@team\` \`:5\`

---

<!-- _class: diagram -->

\`Diagrams · Mermaid\`

## How the work flows.

\`\`\`mermaid
flowchart LR
  A[Plan] --> B[Build] --> C[Review] --> D[Ship]
  D -.risk.-> B
\`\`\`

---

<!-- _class: split-panel -->

\`Structure · split panel\`

## Two columns that hold their weight.

A framing sentence that sets up the supporting points beside it.

- Palette-blind
  - Every color is a token, so the layout never hard-codes a hue.
- Contrast-safe
  - The derivation repairs to WCAG AA in light and dark.
- Portable
  - One file re-opens into Lattice with the look intact.

---

<!-- _class: closing -->
<!-- _paginate: false -->

## ${L}, on every surface.

\`Lattice · theme showcase\`
`;
}

function themeReadme(t: StudioTheme, hasShowcase: boolean): string {
	return `# ${t.label} — a Lattice theme

A palette-blind theme for [Lattice](https://lattice.style). Every color is a
token; the derivation is WCAG-AA in light **and** dark.

## What's inside
- \`${t.name}.css\` — the serialized \`@theme ${t.name}\` (drop into \`themes/\` or load in the Studio).
${hasShowcase ? `- \`${t.name}-showcase.pdf\` — a representative deck rendered in this theme (title · KPIs · chart · Mermaid · split-panel · closer).\n` : ''}- \`manifest.json\` — the asset envelope (re-imports losslessly into the Studio Library).

## Use it
Open the Studio → **Library** → **Import .zip**, or drop \`${t.name}.css\` into a deck's \`themes/\`.
`;
}

function componentReadme(c: StudioComponent): string {
	return `# .${c.name} — a Lattice component

A local, palette-blind, scope-checked component for [Lattice](https://lattice.style).

## What's inside
- \`${c.name}.css\` — the \`.${c.name}\`-scoped styles (palette-blind).
- \`${c.name}.skeleton.md\` — a sample slide that invokes \`<!-- _class: ${c.name} -->\`.
- \`manifest.json\` — the asset envelope (re-imports into the Studio Library).

## Use it
Open the Studio → **Library** → **Import .zip**, then **Insert** it into any deck.
`;
}

// biome-ignore lint/suspicious/noExplicitAny: JSZip is dynamically imported.
async function jszip(): Promise<any> {
	const { default: JSZip } = await import('jszip');
	return new JSZip();
}

/** Pack ONE theme → a `.zip` Blob. `showcasePdf` (rendered by the caller) rides as `<slug>-showcase.pdf`. */
export async function packTheme(theme: StudioTheme, showcasePdf?: Blob | null): Promise<Blob> {
	const zip = await jszip();
	const item: ThemeItem = { kind: 'theme', name: theme.name, label: theme.label, essentials: theme.essentials, css: `${theme.name}.css` };
	zip.file(`${theme.name}.css`, theme.css);
	if (showcasePdf) {
		item.showcase = `${theme.name}-showcase.pdf`;
		zip.file(item.showcase, showcasePdf);
	}
	zip.file('manifest.json', JSON.stringify({ format: ASSET_FORMAT, kind: 'theme', items: [item] } satisfies AssetManifest, null, 2));
	zip.file('README.md', themeReadme(theme, !!showcasePdf));
	return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Pack ONE component → a `.zip` Blob. */
export async function packComponent(c: StudioComponent): Promise<Blob> {
	const zip = await jszip();
	const item: ComponentItem = { kind: 'component', name: c.name, bucket: c.bucket, css: `${c.name}.css`, skeleton: `${c.name}.skeleton.md` };
	zip.file(item.css, c.css);
	zip.file(item.skeleton, c.skeleton);
	zip.file('manifest.json', JSON.stringify({ format: ASSET_FORMAT, kind: 'component', items: [item] } satisfies AssetManifest, null, 2));
	zip.file('README.md', componentReadme(c));
	return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Pack a MIX of themes + components → one `lattice-assets.zip` Blob (sub-dir layout). */
export async function packBundle(themes: { theme: StudioTheme; showcase?: Blob | null }[], components: StudioComponent[]): Promise<Blob> {
	const zip = await jszip();
	const items: ManifestItem[] = [];
	for (const { theme, showcase } of themes) {
		const base = `themes/${theme.name}`;
		const item: ThemeItem = { kind: 'theme', name: theme.name, label: theme.label, essentials: theme.essentials, css: `${base}/${theme.name}.css` };
		zip.file(item.css, theme.css);
		if (showcase) {
			item.showcase = `${base}/${theme.name}-showcase.pdf`;
			zip.file(item.showcase, showcase);
		}
		items.push(item);
	}
	for (const c of components) {
		const base = `components/${c.name}`;
		zip.file(`${base}/${c.name}.css`, c.css);
		zip.file(`${base}/${c.name}.skeleton.md`, c.skeleton);
		items.push({ kind: 'component', name: c.name, bucket: c.bucket, css: `${base}/${c.name}.css`, skeleton: `${base}/${c.name}.skeleton.md` });
	}
	zip.file('manifest.json', JSON.stringify({ format: ASSET_FORMAT, kind: 'bundle', items } satisfies AssetManifest, null, 2));
	zip.file('README.md', `# Lattice asset bundle\n\n${themes.length} theme(s) + ${components.length} component(s). Import via the Studio → **Library** → **Import .zip**.\n`);
	return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

/** Read a `.zip` (single or bundle) back into themes + components ready to save. */
export async function unpackBundle(file: Blob): Promise<ParsedBundle> {
	const { default: JSZip } = await import('jszip');
	const zip = await JSZip.loadAsync(file);
	const manifestFile = zip.file('manifest.json');
	if (!manifestFile) throw new Error('Not a Lattice asset zip — manifest.json missing.');
	const manifest = JSON.parse(await manifestFile.async('string')) as AssetManifest;
	if (manifest.format !== ASSET_FORMAT) throw new Error(`Unsupported asset format: ${manifest.format}`);
	const out: ParsedBundle = { themes: [], components: [] };
	for (const item of manifest.items) {
		if (item.kind === 'theme') {
			const css = await zip.file(item.css)?.async('string');
			if (css) out.themes.push({ name: item.name, label: item.label, essentials: item.essentials ?? null, css });
		} else if (item.kind === 'component') {
			const css = await zip.file(item.css)?.async('string');
			const skeleton = await zip.file(item.skeleton)?.async('string');
			if (css && skeleton != null) out.components.push({ name: item.name, bucket: item.bucket ?? null, css, skeleton });
		}
	}
	return out;
}
