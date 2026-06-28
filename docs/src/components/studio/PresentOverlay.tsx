import { ChevronLeft, ChevronRight, FileText, LayoutGrid, Monitor, Pause, Sparkles, Volume2, X } from 'lucide-react';
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

export function PresentOverlay({ open, onClose, options, slides, startIndex = 0 }: { open: boolean; onClose: () => void; options: SingleSlideOptions; slides: string[]; startIndex?: number }) {
	const [lens, setLens] = React.useState<PresentLens>('full');
	const [idx, setIdx] = React.useState(0);

	const set = React.useMemo(() => presentationSet(slides, lens), [slides, lens]);
	const count = set.length;
	const clamped = Math.min(idx, Math.max(0, count - 1));
	const cur = set[clamped] ?? '';

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
		<div role="dialog" aria-modal="true" aria-label="Present" className="lx-ui fixed inset-0 z-[100] flex flex-col items-center bg-background">
			<div className="flex w-full items-center px-5 py-3.5">
				<button type="button" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:text-foreground" aria-label="Exit present"><X className="size-5" /></button>
				<div className="flex-1" />
				<div className="inline-flex gap-1 rounded-full border border-border bg-card p-1">
					{LENSES.map((l) => (
						<button type="button" key={l.key} onClick={() => pickLens(l.key)} aria-pressed={l.key === lens} className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold', l.key === lens ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}>{l.icon}{l.label}</button>
					))}
				</div>
				<div className="flex-1" />
				<button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground"><Monitor className="size-4" />Presenter screen</button>
			</div>

			<div className="flex min-h-0 w-full flex-1 items-center justify-center gap-4 px-4 sm:px-6">
				<button type="button" onClick={goPrev} disabled={clamped === 0} className="hidden shrink-0 rounded-full border border-border bg-card p-2 text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:block" aria-label="Previous slide"><ChevronLeft className="size-5" /></button>
				<DeckPreview options={options} sample={cur} mermaid={false} className="relative aspect-video w-full max-w-[960px] overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(10,22,40,.18)]" aria-label="Presented slide" />
				<button type="button" onClick={goNext} disabled={clamped >= count - 1} className="hidden shrink-0 rounded-full border border-border bg-card p-2 text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:block" aria-label="Next slide"><ChevronRight className="size-5" /></button>
			</div>

			<div className="mb-7 mt-4 flex items-center gap-3.5 rounded-full border border-border bg-card px-3.5 py-2.5 shadow-[0_8px_24px_rgba(10,22,40,.10)]">
				<button type="button" onClick={goPrev} disabled={clamped === 0} className="grid size-9 place-items-center rounded-full text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:hidden" aria-label="Previous slide"><ChevronLeft className="size-5" /></button>
				<span className="font-mono text-[12px] font-semibold text-[var(--text-heading)]">{clamped + 1} / {count}</span>
				<button type="button" onClick={goNext} disabled={clamped >= count - 1} className="grid size-9 place-items-center rounded-full text-foreground hover:text-[var(--accent)] disabled:opacity-30 sm:hidden" aria-label="Next slide"><ChevronRight className="size-5" /></button>
				<span className="h-5 w-px bg-border" />
				<button type="button" className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground" aria-label="Pause read-aloud"><Pause className="size-5" /></button>
				<div className="relative hidden h-[5px] w-[180px] rounded-full bg-border sm:block">
					<span className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-primary" />
					<span className="absolute -top-1 left-[38%] size-[13px] rounded-full bg-primary shadow" />
				</div>
				<span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">0:21 / 0:54</span>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-[var(--accent)]"><Volume2 className="size-3.5" />Aria</span>
			</div>
		</div>
	);
}
