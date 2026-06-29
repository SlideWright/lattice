import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { css } from '@codemirror/lang-css';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { editorTheme, studioHighlight } from './editor-theme';

// A small, single-purpose CodeMirror 6 field — syntax highlighting + line numbers
// for the Component studio's CSS and skeleton inputs. WRAP, DON'T REINVENT: it
// shares the deck Editor's visual theme (editor-theme.ts) and the same
// construct-once + textarea-fallback pattern, but carries none of the deck
// editor's lint/autocomplete/slide-nav machinery (wrong tool for a CSS box).
// Degrades to a <textarea> when CodeMirror can't construct (jsdom), so it never
// breaks a test — the fallback keeps the same aria-label + onChange contract.

const LANGS = { css, markdown } as const;

export function CodeField({
	value,
	onChange,
	language,
	ariaLabel,
	className,
}: {
	value: string;
	onChange: (next: string) => void;
	language: keyof typeof LANGS;
	ariaLabel: string;
	className?: string;
}) {
	const hostRef = React.useRef<HTMLDivElement>(null);
	const viewRef = React.useRef<EditorView | null>(null);
	const onChangeRef = React.useRef(onChange);
	onChangeRef.current = onChange;
	// CodeMirror can't lay out under jsdom (no real geometry), and a content <div>
	// can't take a `change` event — so a test driving the field via fireEvent.change
	// would silently no-op. Render the accessible <textarea> fallback there; it
	// keeps the same aria-label + onChange contract a real browser's CM exposes.
	const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');
	const [failed, setFailed] = React.useState(isJsdom);

	// Single init (StrictMode-safe): `value` seeds the doc; later changes sync via
	// the effect below, so it is deliberately absent from the dep array.
	// biome-ignore lint/correctness/useExhaustiveDependencies: construct-once editor; value seeds the doc and is synced separately.
	React.useEffect(() => {
		if (isJsdom || viewRef.current || !hostRef.current) return;
		try {
			const view = new EditorView({
				parent: hostRef.current,
				state: EditorState.create({
					doc: value,
					extensions: [
						lineNumbers(),
						history(),
						keymap.of([...defaultKeymap, ...historyKeymap]),
						LANGS[language](),
						syntaxHighlighting(studioHighlight),
						editorTheme,
						EditorView.lineWrapping,
						EditorView.contentAttributes.of({ 'aria-label': ariaLabel }),
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
	}, [language]);

	// External value changes (e.g. a starter reseed) → replace doc in place.
	React.useEffect(() => {
		const v = viewRef.current;
		if (v && value !== v.state.doc.toString()) {
			v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
		}
	}, [value]);

	if (failed) {
		return (
			<textarea
				className={cn('resize-none p-2.5 font-mono text-[12px] leading-relaxed text-foreground outline-none', className)}
				style={{ background: 'var(--bg)' }}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				spellCheck={false}
				aria-label={ariaLabel}
			/>
		);
	}
	return <div ref={hostRef} className={cn('overflow-auto', className)} />;
}
