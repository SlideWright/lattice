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
		const atLineStart = state.lineStart;
		// Track whether the *next* token is at logical line start (after leading
		// indent). Used for the m-flag keyword/style patterns.
		if (stream.sol()) state.lineStart = true;
		if (stream.eatSpace()) return null;
		const prev = stream.string.charAt(stream.start - 1);

		// comment
		if (stream.match(/^%%.*/)) return 'comment';

		// style / classDef / linkStyle line (only at line start)
		if (atLineStart && stream.match(/^(?:classDef|linkStyle|style)(?![\w$-])/)) {
			state.lineStart = false;
			return 'keyword';
		}

		// "string"
		if (stream.match(/^"[^"\r\n]*"/)) {
			state.lineStart = false;
			return 'string';
		}

		// annotation  <<interface>>  [[fork]]
		if (stream.match(ANNOTATION)) {
			state.lineStart = false;
			return 'meta';
		}

		// arrows — try each family, honoring the prev-char guard
		for (let i = 0; i < ARROWS.length; i++) {
			if (prev && ARROW_PREV[i].test(prev)) continue;
			if (stream.match(ARROWS[i])) {
				state.lineStart = false;
				return 'operator';
			}
		}

		// |edge label|
		if (prev !== '|' && prev !== '<' && stream.match(/^\|(?:[^\r\n"|]|"[^"\r\n]*")+\|/)) {
			state.lineStart = false;
			return 'labelName';
		}

		// node text:  [text]  (text)  {shape}  >flag
		if (stream.match(/^(?:[([{]+|\b>)(?:[^\r\n"()[\]{}]|"[^"\r\n]*")+(?:[)\]}]+|>)/)) {
			state.lineStart = false;
			return 'string';
		}

		// keywords (declarative, case-sensitive) then flow (case-insensitive)
		if (atLineStart && (stream.match(KW_DECLARE) || stream.match(KW_FLOW))) {
			state.lineStart = false;
			return 'keyword';
		}
		// keywords can also appear mid-line in places Prism's ^ anchor allowed
		// via the m-flag on each statement; approximate by also matching when the
		// token boundary is clean (not after an identifier char).
		if (!/[\w$-]/.test(prev) && (stream.match(KW_DECLARE) || stream.match(KW_FLOW))) {
			state.lineStart = false;
			return 'keyword';
		}

		// entity  #1f2c3d;  #amp;
		if (stream.match(/^#[a-z0-9]+;/i)) {
			state.lineStart = false;
			return 'meta';
		}

		// operators  :::  :  &
		if (stream.match(/^(?::::|:|&)/)) {
			state.lineStart = false;
			return 'operator';
		}

		// numbers
		if (stream.match(/^\b\d+\b/)) {
			state.lineStart = false;
			return 'number';
		}

		// punctuation
		if (stream.match(/^[(){};]/)) {
			state.lineStart = false;
			return 'punctuation';
		}

		// style-line property:value — after a style keyword, colour `prop:`
		// identifiers as properties (Prism's `style.inside.property`).
		if (stream.match(/^\w[\w-]*(?=[ \t]*:)/)) {
			state.lineStart = false;
			return 'propertyName';
		}

		// default: consume one identifier/char as a node id (variableName)
		if (stream.match(/^[\w$-]+/)) {
			state.lineStart = false;
			return 'variableName';
		}
		stream.next();
		state.lineStart = false;
		return null;
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
