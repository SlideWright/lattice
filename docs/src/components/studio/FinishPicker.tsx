import { Check } from 'lucide-react';
import {
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { activeFinish, FINISHES, type FinishEntry } from './finish-catalog';

// The Studio finish picker — every built-in finish, grouped, shared by the
// Inspector "Finish" field and (later) the Finish faculty. Mirrors ThemePicker:
// a swatch chip + label + active check, grouped Plain → Backdrops → your saved
// finishes. A finish is applied by writing the `finish:` front-matter register
// (no new key); per-slide overrides use `_class: backdrop …`. REUSE (#15): same
// DropdownMenu primitives + visual grammar as the theme picker.

function Swatch({ background, backgroundSize }: { background: string; backgroundSize?: string }) {
	return (
		<span
			className="size-4 shrink-0 rounded-[3px] border border-[color-mix(in_srgb,var(--text-heading)_18%,transparent)]"
			style={{ background, backgroundSize }}
		/>
	);
}

function FinishItem({
	entry, active, onPick,
}: { entry: FinishEntry; active: boolean; onPick: (n: string) => void }) {
	return (
		<DropdownMenuItem
			onSelect={() => onPick(entry.name)}
			className={cn('gap-2', active && 'font-semibold')}
			title={entry.blurb}
		>
			<Swatch background={entry.swatch.background} backgroundSize={entry.swatch.backgroundSize} />
			<span className="truncate">{entry.label}</span>
			{active && <Check className="ml-auto size-3.5 text-[var(--accent)]" />}
		</DropdownMenuItem>
	);
}

const LABEL = 'font-mono text-[10px] uppercase tracking-wider text-muted-foreground';

/**
 * The grouped finish list, rendered inside any `<DropdownMenuContent>`:
 * Plain (boardroom / sketch) → Backdrops (the field finishes). `finish` is the
 * active deck `finish:` value. (Saved custom finishes from the faculty are
 * Export-only in v1 — listing them here is the next slice.)
 */
export function FinishMenuItems({
	finish, onPick,
}: { finish: string; onPick: (name: string) => void }) {
	const plain = FINISHES.filter((f) => f.group === 'plain');
	const backdrops = FINISHES.filter((f) => f.group === 'backdrop');
	const active = activeFinish(finish).name;
	return (
		<>
			<DropdownMenuLabel className={LABEL}>Plain</DropdownMenuLabel>
			{plain.map((f) => <FinishItem key={f.name} entry={f} active={f.name === active} onPick={onPick} />)}
			<DropdownMenuSeparator />
			<DropdownMenuLabel className={LABEL}>Backdrops</DropdownMenuLabel>
			{backdrops.map((f) => <FinishItem key={f.name} entry={f} active={f.name === active} onPick={onPick} />)}
		</>
	);
}

/** Label + swatch for the active finish (for a trigger button). */
export function activeFinishLabel(
	finish: string,
): { label: string; swatch: string; backgroundSize?: string } {
	const e = activeFinish(finish);
	return { label: e.label, swatch: e.swatch.background, backgroundSize: e.swatch.backgroundSize };
}
