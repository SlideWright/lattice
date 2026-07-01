// Reference-doc attach UI (#640) — one hook, reused by every Studio surface that
// grounds AI generation in a user-supplied doc (theme, component, deck chat). Keeps
// the paperclip control + filename chip in ONE place (HARD RULE #15).
//
// The paperclip opens a picker: "Add a file…" plus every doc in the SHARED library
// (persisted in IndexedDB, reusable across all decks). Pick a saved doc to reuse it,
// or trash it. The chip shows the active doc + an honest "billed each run" note.
import { Paperclip, Plus, Trash2, X } from 'lucide-react';
import * as React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatBytes, REF_DOC_ACCEPT, type ReferenceDoc, readReferenceDoc } from './reference-doc';
import { deleteRefDoc, listRefDocs, type RefDocRecord, recordToDoc, saveRefDoc } from './reference-doc-store';

/**
 * Manage one attached reference document for a generation surface. Returns the
 * current `doc` (feed it to the generate / chatComplete calls), a `clear()` to drop
 * it after a successful run, and two ready-made elements: `attachButton` (the
 * paperclip picker — drop it in the prompt row) and `chip` (render it below the row).
 */
export function useReferenceDoc(notify?: (msg: string) => void) {
	const [doc, setDoc] = React.useState<ReferenceDoc | null>(null);
	const [saved, setSaved] = React.useState<RefDocRecord[]>([]);
	const inputRef = React.useRef<HTMLInputElement>(null);

	const refresh = React.useCallback(() => {
		listRefDocs().then(setSaved).catch(() => setSaved([]));
	}, []);
	React.useEffect(() => refresh(), [refresh]);

	const onFile = async (file?: File | null) => {
		if (!file) return;
		try {
			const d = await readReferenceDoc(file);
			const rec = await saveRefDoc(d, Date.now()); // persist to the shared library
			setDoc({ ...d, id: rec.id }); // carry the record id so delete-by-id can match it
			refresh();
			notify?.(`Attached “${d.name}” — saved to your reference library and grounding the next generation (its tokens are billed each run).`);
		} catch (e) {
			notify?.((e as Error)?.message || 'Could not read that file.');
		}
		if (inputRef.current) inputRef.current.value = ''; // allow re-picking the same file
	};

	const pickSaved = (rec: RefDocRecord) => {
		setDoc(recordToDoc(rec));
		notify?.(`Grounding in “${rec.name}”.`);
	};

	const removeSaved = async (rec: RefDocRecord, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		await deleteRefDoc(rec.id);
		refresh();
		if (doc?.id === rec.id) setDoc(null); // clear the active doc only if it IS the deleted one
	};

	const attachButton = (
		<>
			{/* Re-read the shared library each time the picker opens, so a doc saved (or
			    deleted) from another surface's picker shows up here without a remount. */}
			<DropdownMenu onOpenChange={(open) => open && refresh()}>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Attach a reference document"
						title="Attach or reuse a reference doc (.txt, .md, .pdf) to ground generation"
						className={cn(
							'grid size-7 shrink-0 place-items-center rounded-md hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]',
							doc ? 'text-[var(--accent)]' : 'text-muted-foreground',
						)}
					>
						<Paperclip className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-64">
					{/* Defer the picker open so the menu can close first (avoids a focus race). */}
					<DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTimeout(() => inputRef.current?.click(), 0); }}>
						<Plus className="size-4" />
						<span className="font-semibold text-[var(--text-heading)]">Add a file…</span>
					</DropdownMenuItem>
					{saved.length > 0 ? (
						<>
							<DropdownMenuSeparator />
							{saved.map((rec) => (
								<DropdownMenuItem key={rec.id} onSelect={() => pickSaved(rec)} className="group gap-2">
									<Paperclip className="size-3.5 shrink-0 text-[var(--accent)]" />
									<span className="min-w-0 flex-1 truncate">{rec.name}</span>
									<span className="shrink-0 text-[10px] uppercase text-muted-foreground">{rec.docKind === 'pdf' ? 'PDF' : 'txt'}</span>
									<button type="button" aria-label={`Delete ${rec.name}`} onClick={(e) => removeSaved(rec, e)} className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-[var(--fail,#b3261e)] group-hover:opacity-100">
										<Trash2 className="size-3.5" />
									</button>
								</DropdownMenuItem>
							))}
						</>
					) : (
						<div className="px-2 py-1.5 text-[11px] leading-snug text-muted-foreground">Saved docs appear here — a brand guide or deck, shared across all your decks.</div>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<input ref={inputRef} type="file" accept={REF_DOC_ACCEPT} hidden onChange={(e) => onFile(e.target.files?.[0])} />
		</>
	);

	const chip = doc ? (
		<div className="flex items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] text-[var(--text-heading)]">
			<Paperclip className="size-3 shrink-0 text-[var(--accent)]" />
			<span className="max-w-[14rem] truncate font-medium">{doc.name}</span>
			<span className="shrink-0 text-muted-foreground">
				{doc.kind === 'pdf' ? 'PDF' : 'text'} · {formatBytes(doc.bytes)} · billed each run
			</span>
			<button type="button" onClick={() => setDoc(null)} aria-label="Remove reference document" className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground">
				<X className="size-3" />
			</button>
		</div>
	) : null;

	return { doc, clear: () => setDoc(null), attachButton, chip };
}
