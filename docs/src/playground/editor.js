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
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { bracketMatching, HighlightStyle, indentOnInput, LanguageDescription, LanguageSupport, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { mapAutocomplete } from './map-complete.js';

// ── Mermaid: StreamLanguage ported from PrismJS's prism-mermaid grammar ──────
// (prismjs/components/prism-mermaid.js). Prism's regexes are whole-document with
// one lookbehind each; StreamLanguage tokenizes left-to-right per line, so each
// pattern is anchored with `\G` semantics (sticky from stream.pos) and the
// Prism "lookbehind" prev-char guard is checked against the char before the
// match. Token names are the CodeMirror legacy-mode names that resolve to
// highlight tags (keyword/operator/string/propertyName/comment/number/
// variableName/meta/punctuation/labelName); latticeHighlight styles them.
//
// Covered (matching Prism): %% comments; classDef/style/linkStyle style lines
// (property:value); inter-arrow labels (text on -- / == links with arrowheads);
// the four arrow families (ER, flowchart, sequence, class); |edge labels|;
// (node)/[text]/{shapes}; "strings"; <<interface>>/[[fork]] annotations; both
// case-sensitive and case-insensitive keyword sets; #entity; & : ::: operators;
// (){};  punctuation.
const KW_DECLARE =
	/^(?:action|callback|class|classDef|classDiagram|click|direction|erDiagram|flowchart|gantt|gitGraph|graph|journey|link|linkStyle|pie|requirementDiagram|sequenceDiagram|stateDiagram-v2|stateDiagram|style|subgraph)(?![\w$-])/;
const KW_FLOW =
	/^(?:activate|alt|and|as|autonumber|deactivate|else|end(?:[ \t]+note)?|loop|opt|par|participant|rect|state|note[ \t]+(?:over|(?:left|right)[ \t]+of))(?![\w$-])/i;
const ANNOTATION = /^(?:<<(?:abstract|choice|enumeration|fork|interface|join|service)>>|\[\[(?:choice|fork|join)\]\])/i;
// Arrow families (Prism's four `arrow` patterns), anchored; prev-char guard
// applied separately so the leading negated class isn't consumed.
const ARROWS = [
	/^[|}][|o](?:--|\.\.)[|o][|{]/, // ER
	/^(?:[<ox](?:==+|--+|-\.*-)[>ox]?|(?:==+|--+|-\.*-)[>ox]|===+|---+|-\.+-)/, // flowchart
	/^(?:--?(?:>>|[x>)])|(?:<<|[x<(])--?(?!-))/, // sequence
	/^(?:[*o]--|--[*o]|<\|?(?:--|\.\.)|(?:--|\.\.)\|?>|--|\.\.)/, // class
];
const ARROW_PREV = [/[{}|o.-]/, /[<>ox.=-]/, /[<>()x-]/, /[<>|*o.-]/];

const mermaidParser = {
	startState: () => ({ lineStart: true }),
	token(stream, state) {
		// Logical line start = beginning of line after any indent. Set it on sol,
		// keep it across the indent-eating call, THEN read it — so a non-indented
		// keyword line isn't misjudged from the previous line's trailing state.
		if (stream.sol()) state.lineStart = true;
		if (stream.eatSpace()) return null;
		const atLineStart = state.lineStart;
		const prev = stream.string.charAt(stream.start - 1);
		const emit = (tok) => {
			state.lineStart = false;
			return tok;
		};

		// comment
		if (stream.match(/^%%.*/)) return emit('comment');

		// "string"
		if (stream.match(/^"[^"\r\n]*"/)) return emit('string');

		// annotation  <<interface>>  [[fork]]
		if (stream.match(ANNOTATION)) return emit('meta');

		// arrows — try each family, honoring Prism's prev-char guard. Run before
		// the node-id matcher so a bare id (e.g. `A`) can't swallow the dashes of
		// `A-->B`; the id matcher below also refuses to eat `--` runs.
		for (let i = 0; i < ARROWS.length; i++) {
			if (prev && ARROW_PREV[i].test(prev)) continue;
			if (stream.match(ARROWS[i])) return emit('operator');
		}

		// |edge label|
		if (prev !== '|' && prev !== '<' && stream.match(/^\|(?:[^\r\n"|]|"[^"\r\n]*")+\|/)) {
			return emit('labelName');
		}

		// node text:  [text]  (text)  {shape}  >flag
		if (stream.match(/^(?:[([{]+|\b>)(?:[^\r\n"()[\]{}]|"[^"\r\n]*")+(?:[)\]}]+|>)/)) {
			return emit('string');
		}

		// keywords — Prism anchors these to line start (lookbehind on ^[ \t]*), so
		// match only at logical line start. This avoids colouring node ids that
		// happen to be keyword words mid-line (`A --> end`, a node called `state`).
		// KW_DECLARE includes classDef/linkStyle/style, so style lines are covered.
		if (atLineStart && (stream.match(KW_DECLARE) || stream.match(KW_FLOW))) {
			return emit('keyword');
		}

		// entity  #1f2c3d;  #amp;
		if (stream.match(/^#[a-z0-9]+;/i)) return emit('meta');

		// operators  :::  :  &
		if (stream.match(/^(?::::|:|&)/)) return emit('operator');

		// numbers
		if (stream.match(/^\b\d+\b/)) return emit('number');

		// punctuation (`,` included for classDef/style value lists, per Prism)
		if (stream.match(/^[(){};,]/)) return emit('punctuation');

		// style-line property:value — colour `prop:` identifiers as properties
		// (Prism's style.inside.property).
		if (stream.match(/^\w[\w-]*(?=[ \t]*:)/)) return emit('propertyName');

		// default: a node id (variableName). Allow internal hyphens (mermaid ids
		// may contain them) but NOT a `--` run, so arrows like `A-->B` tokenize as
		// id + arrow + id rather than the id eating `A--`.
		if (stream.match(/^[\w$]+(?:-[\w$]+)*/)) return emit('variableName');

		stream.next();
		return emit(null);
	},
};
const mermaidLang = StreamLanguage.define(mermaidParser);

// Fenced-code highlighting. The languages Lattice authors actually use (per the
// component samples: js, python, sql, plus mermaid and the common config/markup
// formats) are bundled EAGERLY as ready LanguageDescriptions, so ```fences
// highlight immediately — no first-use lag while a lazy chunk loads. Everything
// else falls back to @codemirror/language-data's full lazy-loaded set. lang-
// markdown matches a fence's info string against these by name/alias in order,
// so the eager entries win for the languages we care about.
const EAGER_LANGUAGES = [
	LanguageDescription.of({ name: 'mermaid', alias: ['mmd'], support: new LanguageSupport(mermaidLang) }),
	LanguageDescription.of({ name: 'javascript', alias: ['js', 'jsx', 'node'], support: javascript() }),
	LanguageDescription.of({ name: 'typescript', alias: ['ts'], support: javascript({ typescript: true }) }),
	LanguageDescription.of({ name: 'tsx', support: javascript({ typescript: true, jsx: true }) }),
	LanguageDescription.of({ name: 'python', alias: ['py'], support: python() }),
	LanguageDescription.of({ name: 'sql', support: sql() }),
	LanguageDescription.of({ name: 'json', alias: ['json5'], support: json() }),
	LanguageDescription.of({ name: 'yaml', alias: ['yml'], support: yaml() }),
	LanguageDescription.of({ name: 'css', support: css() }),
	LanguageDescription.of({ name: 'html', alias: ['htm'], support: html() }),
];

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
	// Mermaid token tags (ported from Prism): node ids, edge labels, style props,
	// annotations, punctuation. Distinct hues so a diagram reads structurally.
	{ tag: [t.variableName], color: 'var(--text-heading)' },
	{ tag: [t.propertyName], color: 'var(--accent)' },
	{ tag: [t.labelName], color: 'var(--text-body)', fontStyle: 'italic' },
	{ tag: [t.punctuation, t.separator], color: 'var(--text-muted)' },
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
	// On touch devices, iOS Safari auto-zooms the page when you focus an input
	// whose font is under 16px. Bump the editable surface to 16px on coarse
	// pointers so tapping in doesn't zoom; desktop keeps the denser 13.5px.
	'@media (pointer: coarse)': {
		'.cm-content': { fontSize: '16px' },
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

// Editor chrome variant that grows to fit its content instead of filling a
// fixed-height pane — no inner scrollbar, so the whole markdown is visible at
// once. Used by the component-page Specimen ("see the full source without
// scrolling"); the playground keeps the fixed-pane default.
const autoHeightTheme = EditorView.theme({
	'&': { height: 'auto' },
	'.cm-scroller': { overflow: 'visible' },
});

// Create the editor in `parent`. `onChange(value)` fires (debounced by caller)
// on every doc change. `autoHeight` grows the editor to its content (no inner
// scroll) rather than filling the parent. `onCursor` (optional) fires with the
// 1-based line number of the primary selection head whenever the selection or
// doc changes — the Drawing Board uses it to sync the preview filmstrip to the
// slide under the cursor. Returns
// { getValue, setValue, focus, destroy, goToLine }.
export function createEditor({ parent, doc = '', onChange, onCursor, autoHeight = false }) {
	const listener = EditorView.updateListener.of((u) => {
		if (u.docChanged && onChange) onChange(u.state.doc.toString());
		if (onCursor && (u.docChanged || u.selectionSet)) {
			onCursor(u.state.doc.lineAt(u.state.selection.main.head).number);
		}
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
					// Eager (immediate) languages first, then the full lazy-loaded set
					// from language-data as a fallback for anything else.
					codeLanguages: [...EAGER_LANGUAGES, ...languages],
				}),
				EditorView.lineWrapping,
				// Region-name autocomplete for `map` slides — static vocab from the
				// baked basemaps, no model call. Inert outside a map list item.
				mapAutocomplete(),
				latticeTheme,
				...(autoHeight ? [autoHeightTheme] : []),
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
		// Move the cursor to (1-based) line `n` and scroll it into view. Clamped
		// to the document. Used by the Drawing Board's preview->editor sync.
		goToLine: (n) => {
			const total = view.state.doc.lines;
			const line = view.state.doc.line(Math.max(1, Math.min(total, n)));
			view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
			view.focus();
		},
		// 1-based line of the primary cursor — used by focus edit modes to find the
		// fenced/math block under the caret.
		getCursorLine: () => view.state.doc.lineAt(view.state.selection.main.head).number,
		// The primary selection (refine actions operate on it). `empty` is true for
		// a bare caret. Offsets are character positions in the doc.
		getSelection: () => {
			const s = view.state.selection.main;
			return { text: view.state.sliceDoc(s.from, s.to), from: s.from, to: s.to, empty: s.empty };
		},
		// Replace the current selection (one undoable transaction → re-render +
		// re-lint). Used by refine actions to apply a model rewrite.
		replaceSelection: (text) => {
			const s = view.state.selection.main;
			view.dispatch({ changes: { from: s.from, to: s.to, insert: text }, selection: { anchor: s.from, head: s.from + text.length } });
			view.focus();
		},
		// Replace an inclusive 1-based line range with `text`, as one undoable
		// transaction (fires onChange → re-render + re-lint). Focus modes write the
		// edited fragment back through this so it stays in the editor's history.
		replaceLines: (fromLine, toLine, text) => {
			const total = view.state.doc.lines;
			const a = view.state.doc.line(Math.max(1, Math.min(total, fromLine)));
			const b = view.state.doc.line(Math.max(1, Math.min(total, toLine)));
			view.dispatch({ changes: { from: a.from, to: b.to, insert: text }, selection: { anchor: a.from } });
			view.focus();
		},
	};
}
