// CodeMirror 6 editor for the Lattice playground.
//
// Lightweight, on-brand replacement for the plain <textarea>: markdown syntax
// highlighting with basic Mermaid highlighting inside ```mermaid fences, themed
// entirely through the page's CSS custom properties (--bg / --accent / …) so it
// recolours with the palette + light/dark toggle like everything else.
//
// Astro/Vite bundles this (imported from playground.astro), so no separate
// esbuild step — the CodeMirror packages live in docs/package.json.

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { bracketMatching, HighlightStyle, indentOnInput, LanguageSupport, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

// ── Mermaid: a tiny StreamLanguage so ```mermaid fences get keyword colour ──
// Not a full grammar (that's a rabbit hole) — just the diagram keywords,
// arrows/links, node-shape brackets, and comments. Enough that a flowchart or
// sequence diagram reads as code, not flat text.
const MERMAID_KEYWORDS = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|requirementDiagram|C4Context|subgraph|end|participant|actor|loop|alt|opt|par|note|class|state|section|title|direction|click|style|linkStyle|classDef)\b/;
const mermaidParser = {
	token(stream) {
		if (stream.eatSpace()) return null;
		if (stream.match(/%%.*/)) return 'comment';
		if (stream.match(MERMAID_KEYWORDS)) return 'keyword';
		// Links / arrows: -->  ---  ==>  -.->  --x  --o  : etc.
		if (stream.match(/(-{2,3}>?|={2,3}>?|-\.->?|--[xo]|:::?|<\|?--|--\|?>)/)) return 'operator';
		// Node-shape delimiters
		if (stream.match(/[[\](){}>]/)) return 'bracket';
		if (stream.match(/"(?:[^"\\]|\\.)*"/)) return 'string';
		if (stream.match(/\b\d+\b/)) return 'number';
		stream.next();
		return null;
	},
};
const mermaidLang = new LanguageSupport(StreamLanguage.define(mermaidParser));

// Highlight palette mapped onto Lattice CSS tokens. CodeMirror needs concrete
// colours per tag, but we point them at var(--token) so they track the palette.
const latticeHighlight = HighlightStyle.define([
	{ tag: t.heading, color: 'var(--text-heading)', fontWeight: '700' },
	{ tag: [t.strong], color: 'var(--text-heading)', fontWeight: '700' },
	{ tag: [t.emphasis], fontStyle: 'italic' },
	{ tag: [t.link, t.url], color: 'var(--accent)', textDecoration: 'underline' },
	{ tag: [t.monospace], color: 'var(--accent)' },
	{ tag: [t.comment], color: 'var(--text-muted)', fontStyle: 'italic' },
	{ tag: [t.keyword], color: 'var(--accent)', fontWeight: '600' },
	{ tag: [t.operator], color: 'var(--text-muted)' },
	{ tag: [t.bracket], color: 'var(--text-muted)' },
	{ tag: [t.string], color: 'var(--text-body)' },
	{ tag: [t.number], color: 'var(--accent)' },
	{ tag: [t.processingInstruction, t.meta], color: 'var(--text-muted)' },
	{ tag: [t.list], color: 'var(--accent)' },
	{ tag: [t.quote], color: 'var(--text-muted)', fontStyle: 'italic' },
]);

// Editor chrome themed off the page tokens so it matches the playground shell
// and recolours with the palette/mode (CSS vars resolve live on every paint).
const latticeTheme = EditorView.theme({
	'&': {
		height: '100%',
		fontSize: '13.5px',
		color: 'var(--text-body)',
		backgroundColor: 'var(--bg)',
	},
	'.cm-scroller': {
		fontFamily: 'var(--font-mono)',
		lineHeight: '1.6',
		overflow: 'auto',
	},
	'.cm-content': { padding: '14px 0', caretColor: 'var(--accent)' },
	'.cm-gutters': {
		backgroundColor: 'var(--bg)',
		color: 'var(--text-muted)',
		border: 'none',
		borderRight: '1px solid var(--border)',
	},
	'.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)' },
	'.cm-activeLineGutter': { backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)', color: 'var(--accent)' },
	'&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
		backgroundColor: 'color-mix(in srgb, var(--accent) 22%, transparent)',
	},
	'.cm-matchingBracket': { backgroundColor: 'color-mix(in srgb, var(--accent) 18%, transparent)', outline: 'none' },
});

// Create the editor in `parent`. `onChange(value)` fires (debounced by caller)
// on every doc change. Returns { getValue, setValue, focus, destroy }.
export function createEditor({ parent, doc = '', onChange }) {
	const listener = EditorView.updateListener.of((u) => {
		if (u.docChanged && onChange) onChange(u.state.doc.toString());
	});
	const view = new EditorView({
		parent,
		state: EditorState.create({
			doc,
			extensions: [
				lineNumbers(),
				highlightActiveLine(),
				highlightActiveLineGutter(),
				history(),
				drawSelection(),
				indentOnInput(),
				bracketMatching(),
				syntaxHighlighting(latticeHighlight),
				markdown({
					base: markdownLanguage,
					codeLanguages: (info) =>
						/^mermaid$/i.test(info) ? mermaidLang : (languages.find((l) => l.alias.includes(info.toLowerCase())) || null),
				}),
				EditorView.lineWrapping,
				latticeTheme,
				keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
				listener,
			],
		}),
	});
	return {
		getValue: () => view.state.doc.toString(),
		setValue: (text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
		focus: () => view.focus(),
		destroy: () => view.destroy(),
	};
}
