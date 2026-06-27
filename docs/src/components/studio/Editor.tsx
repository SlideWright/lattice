import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { type Diagnostic, linter, lintGutter } from '@codemirror/lint';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import * as React from 'react';

// A small, self-contained CodeMirror 6 markdown editor for the Studio prototype.
// WRAP, DON'T REINVENT — but this is a fresh, bus-free wrapper (the playground's
// editor.js is coupled to its own globals). Single-init ref (StrictMode-safe),
// token-themed, with an inline "unknown component" linter that mirrors the shipped
// #562 inline validation (underline + Quick fix). Degrades to a <textarea> if
// CodeMirror can't construct (e.g. jsdom), so it never breaks tests.

const editorTheme = EditorView.theme({
	'&': { backgroundColor: 'var(--bg)', color: 'var(--text-body)', height: '100%', fontSize: '13px' },
	'.cm-content': { fontFamily: 'var(--font-mono, ui-monospace, monospace)', padding: '14px 4px', lineHeight: '1.85' },
	'.cm-gutters': { backgroundColor: 'var(--bg)', color: 'var(--text-muted)', border: 'none', fontFamily: 'var(--font-mono)' },
	'.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 5%, transparent)' },
	'.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--accent)' },
	'.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
	'&.cm-focused': { outline: 'none' },
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
		backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)',
	},
	'.cm-lintRange-error': { textDecorationColor: '#b42318' },
});

const CLASS_RE = /<!--\s*_class:\s*([A-Za-z0-9-]+)\s*-->/g;

function makeLinter(known: Set<string>) {
	return linter((view): Diagnostic[] => {
		const text = view.state.doc.toString();
		const out: Diagnostic[] = [];
		let m: RegExpExecArray | null;
		CLASS_RE.lastIndex = 0;
		while ((m = CLASS_RE.exec(text))) {
			const name = m[1];
			if (known.size && !known.has(name)) {
				const from = m.index + m[0].indexOf(name);
				const to = from + name.length;
				// Cheapest "did you mean" — a known name sharing the longest prefix.
				const suggestion =
					[...known].find((k) => k.startsWith(name.slice(0, Math.max(2, name.length - 1)))) ||
					[...known].find((k) => name.startsWith(k)) ||
					'kpi';
				out.push({
					from,
					to,
					severity: 'error',
					message: `Unknown component “${name}”. Did you mean “${suggestion}”?`,
					actions: [
						{
							name: `Quick fix → ${suggestion}`,
							apply(v, a, b) {
								v.dispatch({ changes: { from: a, to: b, insert: suggestion } });
							},
						},
					],
				});
			}
		}
		return out;
	});
}

export type EditorHandle = { fixAll: () => void };

export const Editor = React.forwardRef<EditorHandle, {
	value: string;
	onChange: (next: string) => void;
	knownComponents?: string[];
	className?: string;
}>(function Editor({ value, onChange, knownComponents = [], className }, ref) {
	const hostRef = React.useRef<HTMLDivElement>(null);
	const viewRef = React.useRef<EditorView | null>(null);
	const onChangeRef = React.useRef(onChange);
	onChangeRef.current = onChange;
	const [failed, setFailed] = React.useState(false);
	const known = React.useMemo(() => new Set(knownComponents), [knownComponents]);

	React.useImperativeHandle(ref, () => ({
		fixAll() {
			const v = viewRef.current;
			if (!v) return;
			let text = v.state.doc.toString();
			CLASS_RE.lastIndex = 0;
			text = text.replace(CLASS_RE, (full, name: string) =>
				known.size && !known.has(name) ? full.replace(name, 'kpi') : full,
			);
			if (text !== v.state.doc.toString()) {
				v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: text } });
			}
		},
	}));

	// Single init (StrictMode-safe): construct once, never on every render. `value`
	// is the seed doc only — later changes flow through the effect below, not a
	// re-init — so it is deliberately absent from the dep array.
	// biome-ignore lint/correctness/useExhaustiveDependencies: construct-once editor; value seeds the doc and is synced separately.
	React.useEffect(() => {
		if (viewRef.current || !hostRef.current) return;
		try {
			const view = new EditorView({
				parent: hostRef.current,
				state: EditorState.create({
					doc: value,
					extensions: [
						lineNumbers(),
						history(),
						keymap.of([...defaultKeymap, ...historyKeymap]),
						markdown(),
						makeLinter(known),
						lintGutter(),
						editorTheme,
						EditorView.lineWrapping,
						EditorView.contentAttributes.of({ 'aria-label': 'Deck source' }),
						EditorView.updateListener.of((u) => {
							if (u.docChanged) onChangeRef.current(u.state.doc.toString());
						}),
					],
				}),
			});
			viewRef.current = view;
		} catch {
			setFailed(true);
		}
		return () => {
			viewRef.current?.destroy();
			viewRef.current = null;
		};
	}, [known]);

	// External value changes (deck switch) → replace doc without losing the editor.
	React.useEffect(() => {
		const v = viewRef.current;
		if (v && value !== v.state.doc.toString()) {
			v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
		}
	}, [value]);

	if (failed) {
		return (
			<textarea
				className={className}
				style={{ width: '100%', height: '100%', resize: 'none', border: 'none', outline: 'none', background: 'var(--bg)', color: 'var(--text-body)', fontFamily: 'var(--font-mono)', fontSize: 13, padding: 14, lineHeight: 1.85 }}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				spellCheck={false}
				aria-label="Deck source"
			/>
		);
	}
	return <div ref={hostRef} className={className} style={{ height: '100%', overflow: 'auto' }} />;
});
