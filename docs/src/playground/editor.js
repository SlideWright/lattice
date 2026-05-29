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
import { bracketMatching, HighlightStyle, indentOnInput, LanguageDescription, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';

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
const ARROW_PREV = [/[{}|o.\-]/, /[<>ox.=\-]/, /[<>()x\-]/, /[<>|*o.\-]/];

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
// A Language (not LanguageSupport): lang-markdown's codeLanguages function form
// reads `.parser` off the returned value, which a Language has but a
// LanguageSupport does not (its parser is at .language.parser). Returning the
// Language directly is what makes the nested ```mermaid parse actually run.
const mermaidLang = StreamLanguage.define(mermaidParser);

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
					codeLanguages: (info) => {
						if (/^mermaid$/i.test(info)) return mermaidLang;
						// LanguageDescription matches return async-loaders; the markdown
						// package handles those. We only special-case mermaid (bundled).
						return LanguageDescription.matchLanguageName(languages, info, true) || null;
					},
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
