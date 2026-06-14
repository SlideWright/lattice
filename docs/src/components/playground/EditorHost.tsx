import * as React from 'react';
import { createEditor } from '@/playground/editor.js';

/** The editor adapter the controller reads/writes source through (a subset of
 *  createEditor's return — the same contract as the old window.__pgEditor). */
export type EditorAdapter = {
	getValue: () => string;
	setValue: (text: string) => void;
	focus: () => void;
};

/**
 * Wraps the vanilla CodeMirror editor (createEditor → editor.js) in React
 * lifecycle: a single-init useRef + useEffect mounts ONE EditorView into a
 * React-owned host, guarded against React 18/19 StrictMode double-invocation,
 * and destroys it on unmount. The editor is NOT reimplemented — this is the
 * R-B "wrap, don't reinvent" boundary from the migration contract.
 *
 * `onReady` hands the parent an adapter (getValue/setValue/focus) — the same
 * surface the old window.__pgEditor exposed — so the controller drives source
 * through it. `onChange` fires on every edit (debounced render upstream).
 */
export function EditorHost({
	initialDoc,
	onChange,
	onReady,
}: {
	initialDoc: string;
	onChange: (value: string) => void;
	onReady: (adapter: EditorAdapter) => void;
}) {
	const hostRef = React.useRef<HTMLDivElement>(null);
	const viewRef = React.useRef<ReturnType<typeof createEditor> | null>(null);
	// Keep the latest callbacks in refs so the mount effect can stay [] (one init)
	// without going stale.
	const onChangeRef = React.useRef(onChange);
	const onReadyRef = React.useRef(onReady);
	onChangeRef.current = onChange;
	onReadyRef.current = onReady;
	// The starter doc seeds the editor exactly once; later prop changes (there are
	// none in practice) must not re-init the single EditorView. Read it from a ref
	// so the mount effect has no reactive dependency on it.
	const initialDocRef = React.useRef(initialDoc);

	React.useEffect(() => {
		const host = hostRef.current;
		if (!host || viewRef.current) return; // StrictMode double-mount guard
		const ed = createEditor({
			parent: host,
			doc: initialDocRef.current,
			onChange: (v: string) => onChangeRef.current(v),
		});
		viewRef.current = ed;
		onReadyRef.current({
			getValue: () => ed.getValue(),
			setValue: (t: string) => ed.setValue(t),
			focus: () => ed.focus(),
		});
		return () => {
			ed.destroy();
			viewRef.current = null;
		};
	}, []);

	// id="editor-host" is a guided-tour target (playground-tour.js).
	return <div className="pg-editor-host" id="editor-host" ref={hostRef} />;
}
