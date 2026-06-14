// Pure orchestration logic for the playground, lifted out of the old inline
// IIFE (playground.astro) so it is unit-testable and free of DOM/global
// coupling. The React controller (PlaygroundApp) owns the wiring; this module
// owns the decisions: which component a deck is, which variants it offers, and
// the theme-name resolution. The render itself (engine + iframe) is driven by
// the React layer through window.LatticePlayground / window.LatticeDeckPreview —
// those irreducible, scar-tissued pieces are WRAPPED, never reimplemented.

export type VariantDoc = { key: string; label: string; caption: string; sample: string };
export type CatalogEntry = { skeleton: string; sample: string; variants: VariantDoc[] };
export type Catalog = Record<string, CatalogEntry>;

export type VariantOption = { value: string; label: string; title?: string };

export const SOURCE_KEY = 'lattice-docs-pg-source';

/**
 * Detect which component (and variant) a deck source is, from the first
 * `<!-- _class: ... -->`: the first class token that names a component, plus any
 * remaining token that matches one of its documented variant keys. Lets the
 * pickers reflect a deck loaded via "Open in Playground", a reload, or a paste —
 * instead of sitting on "Pick a component…". Returns null when no component is
 * recognised. Faithful port of the inline `detectComponent`.
 */
export function detectComponent(catalog: Catalog, src: string): { name: string; variant: string } | null {
	const m = /<!--\s*_class:\s*([^>]*?)\s*-->/.exec(src || '');
	if (!m) return null;
	const tokens = m[1].trim().split(/\s+/).filter(Boolean);
	let name: string | null = null;
	for (const tok of tokens) {
		if (catalog[tok]) {
			name = tok;
			break;
		}
	}
	if (!name) return null;
	let variant = 'default';
	const vs = catalog[name].variants || [];
	for (const v of vs) {
		if (tokens.indexOf(v.key) >= 0) {
			variant = v.key;
			break;
		}
	}
	return { name, variant };
}

/**
 * The Variant <select> options for a component: 'default' (the base sample) plus
 * each documented modifier. Empty array → the control is disabled (no variants
 * or no component picked). Faithful port of the inline `populateVariants`.
 */
export function variantOptions(catalog: Catalog, name: string | null): VariantOption[] {
	const comp = name ? catalog[name] : null;
	const variants = comp?.variants || [];
	if (!comp || !variants.length) return [];
	return [
		{ value: 'default', label: 'default' },
		...variants.map((v) => ({ value: v.key, label: v.label, title: v.caption || undefined })),
	];
}

/**
 * The markdown for a picked component + variant: the base sample for 'default',
 * else the modifier's own sample (falling back to the base sample). Port of the
 * inline variant-change handler.
 */
export function variantSource(catalog: Catalog, name: string, variantKey: string): string {
	const comp = catalog[name];
	if (!comp) return '';
	if (!variantKey || variantKey === 'default') return comp.sample;
	const v = (comp.variants || []).find((x) => x.key === variantKey);
	return v ? v.sample : comp.sample;
}

/**
 * Resolve the theme name to render with: `<palette>-dark` in dark mode when that
 * theme is loaded, else the base palette. Mirrors the inline render().
 */
export function resolveThemeName(palette: string, mode: 'light' | 'dark', hasDark: boolean): string {
	return mode === 'dark' && hasDark ? `${palette}-dark` : palette;
}

/** The render signature deck-preview.js keys its patch-vs-rewrite decision on. */
export function renderSig(theme: string, mode: string, w: number, h: number): string {
	return `${theme}|${mode}|${w}x${h}`;
}
