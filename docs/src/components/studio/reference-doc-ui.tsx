// Reference-doc attach UI (#640) — one hook, reused by every Studio surface that
// grounds AI generation in a user-supplied doc (theme, component, deck chat). Keeps
// the paperclip control + filename chip in ONE place (HARD RULE #15).
import { Paperclip, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { REF_DOC_ACCEPT, type ReferenceDoc, readReferenceDoc } from './reference-doc';

/**
 * Manage one attached reference document for a generation surface. Returns the
 * current `doc` (feed it to the generate / chatComplete calls), a `clear()` to drop it after
 * a successful run, and two ready-made elements: `attachButton` (drop it in the
 * prompt row) and `chip` (render it below the row — the filename + an honest
 * "billed each run" note, since the doc's tokens ride every call).
 */
export function useReferenceDoc(notify?: (msg: string) => void) {
	const [doc, setDoc] = React.useState<ReferenceDoc | null>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);

	const onFile = async (file?: File | null) => {
		if (!file) return;
		try {
			const d = await readReferenceDoc(file);
			setDoc(d);
			notify?.(`Attached “${d.name}” — it will ground the next generation (its tokens are billed each run).`);
		} catch (e) {
			notify?.((e as Error)?.message || 'Could not read that file.');
		}
		if (inputRef.current) inputRef.current.value = ''; // allow re-picking the same file
	};

	const attachButton = (
		<>
			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				aria-label="Attach a reference document"
				title="Attach a brand guide, deck, or brief (.txt, .md, .pdf) to ground generation"
				className={cn(
					'grid size-7 shrink-0 place-items-center rounded-md hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]',
					doc ? 'text-[var(--accent)]' : 'text-muted-foreground',
				)}
			>
				<Paperclip className="size-4" />
			</button>
			<input ref={inputRef} type="file" accept={REF_DOC_ACCEPT} hidden onChange={(e) => onFile(e.target.files?.[0])} />
		</>
	);

	const chip = doc ? (
		<div className="flex items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] text-[var(--text-heading)]">
			<Paperclip className="size-3 shrink-0 text-[var(--accent)]" />
			<span className="max-w-[14rem] truncate font-medium">{doc.name}</span>
			<span className="shrink-0 text-muted-foreground">
				{doc.kind === 'pdf' ? 'PDF' : 'text'} · {(doc.bytes / 1024).toFixed(0)} KB · billed each run
			</span>
			<button type="button" onClick={() => setDoc(null)} aria-label="Remove reference document" className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground">
				<X className="size-3" />
			</button>
		</div>
	) : null;

	return { doc, clear: () => setDoc(null), attachButton, chip };
}
