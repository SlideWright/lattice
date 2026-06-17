import { SelectGroup, SelectItem, SelectLabel } from '@/components/ui/select';

// Clean display label: strip the `a11y-` prefix (the group header already says
// "Accessibility"), then title-case. "indaco" → "Indaco";
// "a11y-achromatopsia" → "Achromatopsia".
export const paletteLabel = (name: string) =>
	name.replace(/^a11y-/, '').replace(/(^|-)(\w)/g, (_m, sep, c) => (sep ? ' ' : '') + c.toUpperCase());

export const A11Y_GROUP_LABEL = 'Accessibility · colour-blindness';

/**
 * The ONE shared rendering of palette `<SelectItem>`s, so every picker (the
 * chrome-wide PaletteControls AND the Drawing Board topbar) lists themes
 * identically: the brand palettes first (in their given order), then a single
 * labelled "Accessibility" group for the curated colour-vision-deficiency
 * themes (`a11y-*`) at the END — regardless of where a11y sorts in the input
 * array. An a11y palette is just a theme; this only governs presentation.
 */
export function PaletteSelectItems({ palettes }: { palettes: string[] }) {
	const brand = palettes.filter((p) => !p.startsWith('a11y-'));
	const a11y = palettes.filter((p) => p.startsWith('a11y-'));
	return (
		<>
			{brand.map((p) => (
				<SelectItem key={p} value={p}>
					{paletteLabel(p)}
				</SelectItem>
			))}
			{a11y.length > 0 && (
				<SelectGroup>
					<SelectLabel>{A11Y_GROUP_LABEL}</SelectLabel>
					{a11y.map((p) => (
						<SelectItem key={p} value={p}>
							{paletteLabel(p)}
						</SelectItem>
					))}
				</SelectGroup>
			)}
		</>
	);
}
