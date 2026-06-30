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

export type SavedFinish = { id: string; name: string; label: string; swatch?: string };

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
 * Plain (boardroom / sketch) → Backdrops (the field finishes) → your saved
 * finishes (if any). `finish` is the active deck `finish:` value.
 */
export function FinishMenuItems({
	finish, onPick, saved = [],
}: { finish: string; onPick: (name: string) => void; saved?: SavedFinish[] }) {
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
			{saved.length > 0 && (
				<>
					<DropdownMenuSeparator />
					<DropdownMenuLabel className={LABEL}>Your finishes</DropdownMenuLabel>
					{saved.map((s) => (
						<DropdownMenuItem
							key={s.id}
							onSelect={() => onPick(s.name)}
							className={cn('gap-2', s.name === finish && 'font-semibold')}
						>
							<Swatch background={s.swatch ?? 'var(--accent)'} />
							<span className="truncate">{s.label}</span>
							{s.name === finish && <Check className="ml-auto size-3.5 text-[var(--accent)]" />}
						</DropdownMenuItem>
					))}
				</>
			)}
		</>
	);
}

/** Label + swatch for the active finish (for a trigger button). */
export function activeFinishLabel(
	finish: string, saved: SavedFinish[] = [],
): { label: string; swatch: string; backgroundSize?: string } {
	const s = saved.find((f) => f.name === finish);
	if (s) return { label: s.label, swatch: s.swatch ?? 'var(--accent)' };
	const e = activeFinish(finish);
	return { label: e.label, swatch: e.swatch.background, backgroundSize: e.swatch.backgroundSize };
}
