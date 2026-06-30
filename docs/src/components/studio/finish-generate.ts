// Pure parametric finish generator — turns the faculty's slider params into a
// `section.<name> { … }` CSS rule that writes the tint/mark compositor slots
// (--_bg-radial / --_bg-linear). Palette-blind by construction (every color is
// color-mix of var(--accent)), no url(), no mask — so a fabricated finish carries
// the same export-safety + zero-exfil guarantees as the built-ins. The generated
// class name always contains `backdrop` so the treatments compositor
// (`[class*="backdrop"]`) paints its slots.

export type FinishBase = 'wash' | 'aurora' | 'blueprint' | 'dots' | 'hatch';

export type FinishParams = {
	base: FinishBase;
	intensity: number; // accent alpha %, ~4–24
	scale: number; // motif spacing px (grid/dots/hatch), ~10–48
	angle: number; // hatch angle deg, 0–90
};

export const DEFAULT_PARAMS: Record<FinishBase, FinishParams> = {
	wash: { base: 'wash', intensity: 8, scale: 24, angle: 45 },
	aurora: { base: 'aurora', intensity: 13, scale: 24, angle: 45 },
	blueprint: { base: 'blueprint', intensity: 7, scale: 28, angle: 45 },
	dots: { base: 'dots', intensity: 16, scale: 22, angle: 45 },
	hatch: { base: 'hatch', intensity: 6, scale: 12, angle: 45 },
};

const acc = (p: number) => `color-mix(in srgb, var(--accent) ${Math.round(p)}%, transparent)`;

/** The slot declarations (without the selector) for a set of params. */
function slotBody(p: FinishParams): string {
	const s = Math.max(6, Math.round(p.scale));
	switch (p.base) {
		case 'wash':
			return `--_bg-linear:none;--_bg-radial:radial-gradient(ellipse 130% 120% at 50% 0%, ${acc(p.intensity)} 0%, transparent 68%)`;
		case 'aurora':
			return `--_bg-linear:none;--_bg-radial:radial-gradient(ellipse 72% 60% at 0% 0%, ${acc(p.intensity)} 0%, transparent 62%), radial-gradient(ellipse 72% 60% at 100% 100%, ${acc(Math.max(2, p.intensity * 0.7))} 0%, transparent 60%)`;
		case 'blueprint':
			return `--_bg-radial:none;--_bg-linear:repeating-linear-gradient(0deg, ${acc(p.intensity)} 0 1px, transparent 1px ${s}px), repeating-linear-gradient(90deg, ${acc(p.intensity)} 0 1px, transparent 1px ${s}px)`;
		case 'dots':
			return `--_bg-linear:none;--_bg-radial:radial-gradient(circle, ${acc(p.intensity)} 0 1.4px, transparent 1.9px);background-size:${s}px ${s}px`;
		case 'hatch':
			return `--_bg-radial:none;--_bg-linear:repeating-linear-gradient(${Math.round(p.angle)}deg, ${acc(p.intensity)} 0 1px, transparent 1px ${s}px)`;
	}
}

/**
 * The full `section.<name> { … }` rule for a fabricated finish. The name is
 * re-sanitized to a safe class fragment HERE (defense in depth — the generator
 * never trusts its caller): only `[a-z0-9-]` survive, so a crafted name can't
 * close the selector or inject a second rule into the same-origin preview frame.
 * Params are numeric (Math.round/Math.max), never interpolated as strings.
 */
export function generateFinishCss(name: string, p: FinishParams): string {
	const safe = String(name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'backdrop-custom';
	return `section.${safe} { ${slotBody(p)}; }`;
}

/** A preview-chip background (params bumped for visibility at small size). */
export function generateSwatch(p: FinishParams): { background: string; backgroundSize?: string } {
	const vivid: FinishParams = { ...p, intensity: Math.min(60, p.intensity * 3.5), scale: Math.max(6, Math.round(p.scale / 4)) };
	const body = slotBody(vivid);
	// Pull the gradient out of whichever slot carries it, plus any size.
	const grad = /--_bg-(?:radial|linear):\s*(?!none)([^;]+)/.exec(body)?.[1] ?? 'var(--accent)';
	const size = /background-size:\s*([^;]+)/.exec(body)?.[1];
	return { background: grad, backgroundSize: size };
}
