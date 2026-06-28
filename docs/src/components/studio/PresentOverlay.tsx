import { ChevronLeft, ChevronRight, FileText, LayoutGrid, Monitor, Pause, Play, Sparkles, Timer, Volume2, X } from 'lucide-react';
import * as React from 'react';
import DeckPreview from '@/components/DeckPreview';
import type { SingleSlideOptions } from '@/lib/single-slide-render';
import { cn } from '@/lib/utils';
import { type PresentLens, presentationSet } from './lint';

// Present = a verb (plan §17): a full-screen takeover you ENTER and exit, with a
// reader-facing lens switch that actually RESHAPES the deck (meet the reader where
// they want to go) and real slide navigation (←/→/Space). The slide is the live
// engine render.
const LENSES: { key: PresentLens; icon: React.ReactNode; label: string }[] = [
	{ key: 'full', icon: <FileText className="size-3.5" />, label: 'Full deck' },
	{ key: 'exec', icon: <Sparkles className="size-3.5" />, label: 'Exec summary' },
	{ key: 'onepager', icon: <LayoutGrid className="size-3.5" />, label: 'One-pager' },
];
// Practice's delivery coaching — ambient, timed beats over the slide.
const BEATS = ['Pause — let the number land.', 'Look up from the slide.', 'Signpost what comes next.', 'Slow down — half pace here.', 'Breathe. One beat of silence.'];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function PresentOverlay({ open, onClose, options, slides, startIndex = 0, notify }: { open: boolean; onClose: () => void; options: SingleSlideOptions; slides: string[]; startIndex?: number; notify: (msg: string) => void }) {
	const [lens, setLens] = React.useState<PresentLens>('full');
	const [idx, setIdx] = React.useState(0);
	const [playing, setPlaying] = React.useState(false);
	const [rehearse, setRehearse] = React.useState(false); // Practice mode — folded into Present (plan §line 266)
	const [elapsed, setElapsed] = React.useState(0); // rehearsal seconds

	const set = React.useMemo(() => presentationSet(slides, lens), [slides, lens]);
	const count = set.length;
	const clamped = Math.min(idx, Math.max(0, count - 1));
	const cur = set[clamped] ?? '';

	// Practice's pacing math: a target talk length (~40s/slide) and a live timer;
	// "behind" once you run past the expected pace for where you are in the deck.
	const target = Math.max(60, count * 40);
	const expected = Math.round((target * (clamped + 1)) / count);
	const behind = elapsed > expected + 5;
	const beat = BEATS[Math.floor(elapsed / 7) % BEATS.length];

	// On open, start the full lens on the slide you were editing; the reshaping
	// lenses always start at the top of their reshaped set.
	React.useEffect(() => {
		if (open) {
			setLens('full');
			setIdx(Math.max(0, Math.min(startIndex, slides.length - 1)));
		}
	}, [open, startIndex, slides.length]);

	function pickLens(nextLens: PresentLens) {
		setLens(nextLens);
		setIdx(0);
	}
	function toggleRehearse() {
		setRehearse((v) => !v);
		setElapsed(0);
		setPlaying(false);
	}

	// The rehearsal clock — ticks only while playing in Rehearse mode.
	React.useEffect(() => {
		if (!open || !rehearse || !playing) return;
		const id = setInterval(() => setElapsed((e) => e + 1), 1000);
		return () => clearInterval(id);
	}, [open, rehearse, playing]);
	// Reset rehearsal state whenever Present closes.
	React.useEffect(() => {
		if (!open) { setRehearse(false); setElapsed(0); setPlaying(false); }
	}, [open]);
	const goNext = React.useCallback(() => setIdx((i) => Math.min(i + 1, count - 1)), [count]);
	const goPrev = React.useCallback(() => setIdx((i) => Math.max(i - 1, 0)), []);

	React.useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
			else if (e.key === 'ArrowRight' || e.key === ' ') {
				e.preventDefault();
				goNext();
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				goPrev();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose, goNext, goPrev]);

	if (!open) return null;
	return (
		<div role="dialog" aria-modal="true" aria-label="Present" className="lx-ui fixed inset-0 z-[100] flex flex-col items-center overflow-x-hidden bg-background">
			<div className="flex w-full items-center gap-2 px-3 py-3 sm:px-5 sm:py-3.5">
				<button type="button" onClick={onClose} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground" aria-label="Exit present"><X className="size-5" /></button>
				{/* Lens switch — centered, and scrolls instead of wrapping/clipping if it ever can't fit. */}
				<div className="flex min-w-0 flex-1 justify-center overflow-x-auto">
					<div className="inline-flex shrink-0 gap-1 rounded-full border border-border bg-card p-1">
						{LENSES.map((l) => (
							<button type="button" key={l.key} onClick={() => pickLens(l.key)} aria-pressed={l.key === lens} className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-1.5 text-[11px] font-semibold sm:gap-1.5 sm:px-3 sm:text-[12.5px]', l.key === lens ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{l.icon}{l.label}</button>
						))}
					</div>
				</div>
				<button type="button" onClick={toggleRehearse} aria-pressed={rehearse} className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold sm:text-[13px]', rehearse ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-border text-muted-foreground hover:text-foreground')}><Timer className="size-4" />Rehearse</button>
				<button type="button" onClick={() => notify('Presenter screen — speaker notes + next-slide preview on your second display.')} className="hidden shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground md:inline-flex"><Monitor className="size-4" />Presenter screen</button>
			</div>

			<div className="relative flex min-h-0 w-full flex-1 items-center justify-center gap-4 px-4 sm:px-6">
				<button type="button" onClick={goPrev} disabled={clamped === 0} className="hidden shrink-0 rounded-full border border-border bg-card p-2 text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:block" aria-label="Previous slide"><ChevronLeft className="size-5" /></button>
				<DeckPreview options={options} sample={cur} mermaid={false} className="relative aspect-video w-full max-w-[960px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(10,22,40,.18)]" aria-label="Presented slide" />
				<button type="button" onClick={goNext} disabled={clamped >= count - 1} className="hidden shrink-0 rounded-full border border-border bg-card p-2 text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:block" aria-label="Next slide"><ChevronRight className="size-5" /></button>
				{/* Practice's delivery coaching — ambient beat over the slide while rehearsing. */}
				{rehearse && playing && (
					<div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center px-4">
						<span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--bg))] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-heading)] shadow-[0_8px_24px_rgba(10,22,40,.14)]"><Sparkles className="size-3.5 text-[var(--accent)]" />{beat}</span>
					</div>
				)}
			</div>

			<div className="mb-7 mt-4 flex items-center gap-3.5 rounded-full border border-border bg-card px-3.5 py-2.5 shadow-[0_8px_24px_rgba(10,22,40,.10)]">
				<button type="button" onClick={goPrev} disabled={clamped === 0} className="grid size-9 place-items-center rounded-full text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:hidden" aria-label="Previous slide"><ChevronLeft className="size-5" /></button>
				<span className="font-mono text-[12px] font-semibold text-[var(--text-heading)]">{clamped + 1} / {count}</span>
				<button type="button" onClick={goNext} disabled={clamped >= count - 1} className="grid size-9 place-items-center rounded-full text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:hidden" aria-label="Next slide"><ChevronRight className="size-5" /></button>
				<span className="h-5 w-px bg-border" />
				<button type="button" onClick={() => setPlaying((v) => !v)} className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground" aria-label={rehearse ? (playing ? 'Pause rehearsal' : 'Start rehearsal') : playing ? 'Pause read-aloud' : 'Play read-aloud'}>{playing ? <Pause className="size-5" /> : <Play className="size-5" />}</button>
				<div className="relative hidden h-[5px] w-[180px] rounded-full bg-border sm:block">
					<span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${rehearse ? Math.min(100, (elapsed / target) * 100) : 38}%` }} />
				</div>
				<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{rehearse ? `${fmt(elapsed)} / ${fmt(target)}` : '0:21 / 0:54'}</span>
				{rehearse ? (
					<span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold', behind ? 'border-[color-mix(in_srgb,var(--chart-2,#9c3f00)_45%,transparent)] text-[var(--chart-2,#9c3f00)]' : 'border-[color-mix(in_srgb,var(--chart-3,#2e6f00)_45%,transparent)] text-[var(--chart-3,#2e6f00)]')}><Timer className="size-3.5" />{behind ? 'Behind pace' : 'On pace'}</span>
				) : (
					<span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]"><Volume2 className="size-3.5" />Aria</span>
				)}
			</div>
		</div>
	);
}
