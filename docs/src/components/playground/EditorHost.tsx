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
	// Show an SSR text placeholder (the starter source) until CodeMirror mounts,
	// so the editor's text paints at first paint instead of after hydration. This
	// is what keeps the playground's LCP element from being a post-hydration
	// `.cm-line` (the migration's dropped <textarea> fallback used to do this).
	const [mounted, setMounted] = React.useState(false);
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
		setMounted(true); // drop the placeholder now that the real editor is up
		onReadyRef.current({
			getValue: () => ed.getValue(),
			setValue: (t: string) => ed.setValue(t),
			focus: () => ed.focus(),
		});
		return () => {
			ed.destroy();
			viewRef.current = null;
			setMounted(false);
		};
	}, []);

	// id="editor-host" is a guided-tour target (playground-tour.js). CodeMirror
	// mounts into the inner .pg-editor-mount (kept out of React's child reconciler
	// so CM's imperative DOM and React don't fight); the <pre> overlay paints the
	// starter source immediately for LCP and is removed once CM is up.
	return (
		<div className="pg-editor-host" id="editor-host">
			<div className="pg-editor-mount" ref={hostRef} />
			{!mounted && (
				<pre className="pg-editor-placeholder" aria-hidden="true">
					{initialDocRef.current}
				</pre>
			)}
		</div>
	);
}
