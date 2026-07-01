import { Check } from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { activeMode, MODES } from './mode-catalog';

// The Studio mode picker — the deck's rendering MODE (boardroom / sketch),
// the sibling of the Finish (backdrop) picker. A mode is applied by writing the
// `mode:` front-matter register (the axis is named "mode" because Marp already
// owns `style:` for inline-CSS injection); per-slide overrides use `_class: sketch`
// (or `_class: boardroom` to opt back to clean). REUSE (#15): same DropdownMenu
// primitives + swatch grammar as the theme + finish pickers.

function Swatch({ background, backgroundSize }: { background: string; backgroundSize?: string }) {
	return (
		<span
			className="size-4 shrink-0 rounded-[3px] border border-[color-mix(in_srgb,var(--text-heading)_18%,transparent)]"
			style={{ background, backgroundSize }}
		/>
	);
}

/** The mode list, rendered inside any `<DropdownMenuContent>`: boardroom / sketch
 *  / sketch-clean. `mode` is the active register name. */
export function ModeMenuItems({ mode, onPick }: { mode: string; onPick: (name: string) => void }) {
	const active = activeMode(mode).name;
	return (
		<>
			{MODES.map((s) => (
				<DropdownMenuItem key={s.name} onSelect={() => onPick(s.name)} className={cn('gap-2', s.name === active && 'font-semibold')} title={s.blurb}>
					<Swatch background={s.swatch.background} backgroundSize={s.swatch.backgroundSize} />
					<span className="truncate">{s.label}</span>
					{s.name === active && <Check className="ml-auto size-3.5 text-[var(--accent)]" />}
				</DropdownMenuItem>
			))}
		</>
	);
}

/** Label + swatch for the active mode (for a trigger button). */
export function activeModeLabel(mode: string): { label: string; swatch: string; backgroundSize?: string } {
	const e = activeMode(mode);
	return { label: e.label, swatch: e.swatch.background, backgroundSize: e.swatch.backgroundSize };
}
