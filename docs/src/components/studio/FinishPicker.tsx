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

// A saved (Fabricated) finish, shaped for the picker. Its `name` is NOT in the
// engine FINISH_REGISTER, so it renders via injected CSS + an applied class (the
// consumption loop in StudioShell), not the `finish:` register.
export type SavedFinishMenuEntry = { id: string; name: string; label: string; swatch?: { background: string; backgroundSize?: string } };

/**
 * The finish (BACKDROP) list, rendered inside any `<DropdownMenuContent>`:
 * None → Finishes (the layered field presets) → Saved (your Fabricated finishes).
 * The rendering MODE (boardroom / sketch) is a SEPARATE control now — the `mode:`
 * picker (ModeMenuItems). `finish` is the active selection — a register name for a
 * built-in, or a saved finish's slug. Picking a saved one renders it in the deck
 * preview (StudioShell injects its CSS + applies its class).
 */
export function FinishMenuItems({
	finish, onPick, saved = [],
}: { finish: string; onPick: (name: string) => void; saved?: SavedFinishMenuEntry[] }) {
	const none = FINISHES.filter((f) => f.group === 'plain'); // the sole `none` baseline
	const presets = FINISHES.filter((f) => f.group === 'finish');
	// A saved finish is active when the selection matches its slug (and isn't a
	// built-in register name).
	const builtin = activeFinish(finish).name;
	const savedActive = !FINISHES.some((f) => f.name === finish) && finish;
	return (
		<>
			{none.map((f) => <FinishItem key={f.name} entry={f} active={!savedActive && f.name === builtin} onPick={onPick} />)}
			<DropdownMenuSeparator />
			<DropdownMenuLabel className={LABEL}>Finishes</DropdownMenuLabel>
			{presets.map((f) => <FinishItem key={f.name} entry={f} active={!savedActive && f.name === builtin} onPick={onPick} />)}
			{saved.length > 0 && (
				<>
					<DropdownMenuSeparator />
					<DropdownMenuLabel className={LABEL}>Saved</DropdownMenuLabel>
					{saved.map((s) => {
						// The deck names a saved finish by its PREFIXED token `finish-<slug>`
						// (consistent with per-slide `finish-<slug>` classes); accept the bare
						// slug too so a pre-prefix deck still shows as active.
						const token = `finish-${s.name}`;
						const on = savedActive === token || savedActive === s.name;
						return (
							<DropdownMenuItem key={s.id} onSelect={() => onPick(token)} className={cn('gap-2', on && 'font-semibold')}>
								<Swatch background={s.swatch?.background ?? 'var(--accent-soft, var(--bg))'} backgroundSize={s.swatch?.backgroundSize} />
								<span className="truncate">{s.label}</span>
								{on && <Check className="ml-auto size-3.5 text-[var(--accent)]" />}
							</DropdownMenuItem>
						);
					})}
				</>
			)}
		</>
	);
}

/** Label + swatch for the active finish (for a trigger button). A saved finish
 *  (not in the register) is matched by its prefixed token `finish-<slug>` (or the
 *  bare slug, for back-compat) against `saved`. */
export function activeFinishLabel(
	finish: string,
	saved: SavedFinishMenuEntry[] = [],
): { label: string; swatch: string; backgroundSize?: string } {
	const savedHit = saved.find((s) => finish === `finish-${s.name}` || finish === s.name);
	if (savedHit && !FINISHES.some((f) => f.name === finish)) {
		return { label: savedHit.label, swatch: savedHit.swatch?.background ?? 'var(--accent)', backgroundSize: savedHit.swatch?.backgroundSize };
	}
	const e = activeFinish(finish);
	return { label: e.label, swatch: e.swatch.background, backgroundSize: e.swatch.backgroundSize };
}
