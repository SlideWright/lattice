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
import { Compartment, EditorState } from '@codemirror/state';
import { drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { latticeAutocomplete } from './complete.js';
import { MERMAID_KEYWORDS } from './grammar-vocab.js';

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
// KW_DECLARE is built from the shared MERMAID_KEYWORDS.declare list (one source
// of truth with the in-fence keyword completion in complete.js) — the generated
// source is byte-identical to the prior literal. KW_FLOW stays hand-written: its
// `end note` / `note over|left of|right of` multi-word forms don't reduce to a
// flat list (its single-word members mirror MERMAID_KEYWORDS.flow minus those).
const KW_DECLARE = new RegExp(`^(?:${MERMAID_KEYWORDS.declare.join('|')})(?![\\w$-])`);
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
		// ── Editor contrast tokens ───────────────────────────────────────────────
		// The cursor-line and text-selection highlights were both a flat low-alpha
		// wash of --accent (active line 6%, selection 22%). That left the active
		// line near-invisible on every palette (WCAG band-contrast ~1.06–1.16) and
		// the selection faint on the low-chroma / warm light palettes. These named
		// tokens are the single tunable contract: the active line bumps to a clearly
		// visible band (free — alpha too low to touch text legibility), while the
		// selection keeps its existing 22% fill (so body text stays legible on the
		// worst low-contrast palette, cuoio-light — no accessibility regression) and
		// gains a defining 1px accent edge: the definition a heavier fill can't buy
		// without hurting legibility. A downstream theme can override any of them.
		'--cm-active-line': 'color-mix(in srgb, var(--accent) 12%, transparent)',
		'--cm-active-gutter': 'color-mix(in srgb, var(--accent) 18%, transparent)',
		'--cm-selection': 'color-mix(in srgb, var(--accent) 22%, transparent)',
		'--cm-selection-edge': 'color-mix(in srgb, var(--accent) 45%, transparent)',
		'--cm-match': 'color-mix(in srgb, var(--accent) 26%, transparent)',
		// Autocomplete popup. The panel reused --bg (identical to the editor) with a
		// plain --border edge, so in light mode it floated with no visible boundary
		// (border-vs-bg ~1.21 on indaco-light), and the detail/type hint reused
		// --text-muted, which drops to WCAG ~2.5 on the warm light palettes. A
		// muted-blended border lifts the panel edge to ~1.87; a body-blended detail
		// colour lifts the hint to ~3.85 while staying secondary to the label.
		'--cm-pop-border': 'color-mix(in srgb, var(--border) 45%, var(--text-muted))',
		'--cm-detail': 'color-mix(in srgb, var(--text-muted) 50%, var(--text-body))',
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
	'.cm-activeLine': { backgroundColor: 'var(--cm-active-line)' },
	'.cm-activeLineGutter': { backgroundColor: 'var(--cm-active-gutter)', color: 'var(--accent)' },
	'&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
	// The fill stays moderate (legibility-safe); the inset edge gives the band the
	// crisp definition a heavier fill would cost in text contrast. ::selection (the
	// native fallback before drawSelection paints) keeps the plain fill.
	'.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
		backgroundColor: 'var(--cm-selection)',
		boxShadow: 'inset 0 0 0 1px var(--cm-selection-edge)',
	},
	'::selection': { backgroundColor: 'var(--cm-selection)' },
	'.cm-matchingBracket': { backgroundColor: 'var(--cm-match)', outline: 'none' },
	// NOTE: the autocomplete popup (.cm-tooltip-autocomplete / .cm-completionInfo)
	// is themed in a GLOBAL stylesheet (ensureTooltipTheme below), NOT here —
	// EditorView.theme is scoped to the .cm-editor element, and CodeMirror renders
	// completion tooltips in a fixed/detached layer that can fall OUTSIDE it
	// (notably on iOS Safari), where the scoped rules don't reach and the popup
	// falls back to CodeMirror's default white panel. The global rules reach it
	// wherever CM places it; the palette vars resolve anywhere under <html>. The
	// --cm-* tokens are editor-scoped, so the global block uses the base tokens.
});

// Global autocomplete-popup theme. Injected once into <head> (not via
// EditorView.theme) so it reaches the completion tooltip even when CodeMirror
// places it in a detached/fixed layer outside .cm-editor — the cause of the
// unthemed white box on iOS Safari. Backgrounds use !important to beat CM's
// dynamically-injected base theme regardless of stylesheet order.
const TOOLTIP_CSS = `
.cm-tooltip.cm-tooltip-autocomplete {
	border: 1px solid color-mix(in srgb, var(--border) 45%, var(--text-muted));
	border-radius: 8px;
	background-color: var(--bg) !important;
	color: var(--text-body);
	box-shadow: 0 12px 30px color-mix(in srgb, var(--text-heading) 30%, transparent);
	overflow: hidden;
}
.cm-tooltip-autocomplete > ul { font-family: var(--font-mono); font-size: 13px; max-height: 15em; }
.cm-tooltip-autocomplete > ul > li { padding: 3px 10px; color: var(--text-body); }
.cm-tooltip-autocomplete > ul > li[aria-selected] { background-color: var(--accent); color: var(--on-accent); }
.cm-completionMatchedText { text-decoration: none; font-weight: 700; color: var(--accent); }
.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionMatchedText { color: var(--on-accent); }
.cm-completionDetail { color: color-mix(in srgb, var(--text-muted) 50%, var(--text-body)); font-style: italic; }
.cm-tooltip-autocomplete > ul > li[aria-selected] .cm-completionDetail { color: var(--on-accent); opacity: 0.8; }
.cm-tooltip.cm-completionInfo {
	border: 1px solid color-mix(in srgb, var(--border) 45%, var(--text-muted));
	border-radius: 8px;
	background-color: var(--bg-alt) !important;
	color: var(--text-body);
	padding: 8px 10px;
	font-family: var(--font-body, inherit);
	font-size: 12.5px;
	line-height: 1.45;
	max-width: 22em;
	box-shadow: 0 10px 28px color-mix(in srgb, var(--text-heading) 22%, transparent);
}`;

function ensureTooltipTheme() {
	if (typeof document === 'undefined' || document.getElementById('lattice-cm-tooltip-theme')) return;
	const style = document.createElement('style');
	style.id = 'lattice-cm-tooltip-theme';
	style.textContent = TOOLTIP_CSS;
	document.head.appendChild(style);
}

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
//
// `vocab` (the Drawing Board's lintVocab), `catalog` (the compact component
// catalog), and `themes` (the registered theme-name list) power deck-grammar
// autocompletion — component names + modifiers inside `<!-- _class: … -->`,
// theme names in front matter, and more. All optional; without them only the
// map region completer (self-sufficient from the baked basemaps) is live, so
// the playground / Specimen editors keep working unchanged. `autocomplete`
// (default true) sets the initial state; `setAutocomplete(bool)` toggles it live
// — the Drawing Board wires both to a workspace preference.
export function createEditor({ parent, doc = '', onChange, onCursor, autoHeight = false, vocab, catalog, themes, autocomplete = true }) {
	ensureTooltipTheme(); // global popup theme (reaches CM's detached tooltip layer)
	// The autocomplete extension lives in a Compartment so the on/off preference
	// can reconfigure it live (built once with the vocab; toggled to [] when off).
	const autocompleteExt = latticeAutocomplete({ vocab, catalog, themes });
	const autocompleteComp = new Compartment();
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
				// Deck-grammar autocomplete — component names + modifiers inside
				// `_class:` directives, theme names in front matter, slot skeletons,
				// and region names inside map slides (static vocab, from the page's
				// catalog/vocab/themes or the baked basemaps). All deterministic, no
				// model call; inert outside its context. In a Compartment so the
				// workspace preference can switch it off/on live.
				autocompleteComp.of(autocomplete ? autocompleteExt : []),
				latticeTheme,
				...(autoHeight ? [autoHeightTheme] : []),
				keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
				listener,
			],
		}),
	});
	// iOS Safari can paint the native selection highlight before it applies
	// CodeMirror's injected theme — so the FIRST text selection shows the system
	// (lavender) tint instead of the themed `--cm-selection`, and only corrects
	// after a style recalc (e.g. a palette/mode toggle). Force one reflow on the
	// next frame so the theme is applied up front, not only after a manual toggle.
	if (typeof requestAnimationFrame === 'function') {
		requestAnimationFrame(() => {
			try {
				view.requestMeasure();
				void view.scrollDOM.offsetHeight; // force a style/layout flush
			} catch {}
		});
	}
	return {
		getValue: () => view.state.doc.toString(),
		setValue: (text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
		focus: () => view.focus(),
		destroy: () => view.destroy(),
		// Toggle deck-grammar autocomplete live (workspace preference). Reconfigures
		// the compartment to the built extension or nothing.
		setAutocomplete: (on) => view.dispatch({ effects: autocompleteComp.reconfigure(on ? autocompleteExt : []) }),
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
