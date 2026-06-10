// Static, editor-intrinsic vocabularies for deck-grammar autocomplete.
//
// Pure and import-free. These are the closed token sets the editor itself
// defines (Marp slide directives, the fence languages it highlights, the
// Mermaid keyword grammar) — distinct from the build-time catalog/theme
// handoff. complete.js consumes them; editor.js consumes MERMAID_KEYWORDS to
// build its highlighter regexes, so the keyword list has ONE source of truth.

// Slide-scoped Marp directives authored as `<!-- _name: value -->`. `_class` is
// completed with its full grammar elsewhere (component names + modifiers); it's
// listed here too so the NAME completes before the colon is typed.
export const DIRECTIVE_NAMES = ['_class', '_paginate', '_header', '_footer', '_backgroundColor', '_color'];

// Value vocabulary for `_paginate:` (Marp accepts the booleans; `skip`/`hold`
// are Marp's pagination extensions). The other directives take free strings or
// colours — not completable.
export const PAGINATE_VALUES = ['true', 'false', 'skip', 'hold'];

// Fence info-strings worth completing: the Lattice-special focusable fences
// (`mermaid`, `chart`) plus the languages editor.js highlights eagerly. Common
// short aliases are included so `js`/`ts`/`py` resolve too. Mirrors
// editor.js's EAGER_LANGUAGES (kept in sync by hand — both are stable).
export const FENCE_LANGS = [
	'mermaid',
	'chart',
	'javascript',
	'js',
	'typescript',
	'ts',
	'tsx',
	'python',
	'py',
	'sql',
	'json',
	'yaml',
	'css',
	'html',
	'bash',
];

// Mermaid keyword grammar, the single source of truth shared by the highlighter
// (editor.js builds its KW_DECLARE / KW_FLOW regexes from these) and the
// in-fence keyword completion (complete.js). `declare` = diagram/declaration
// openers (case-sensitive); `flow` = block/control keywords (case-insensitive).
export const MERMAID_KEYWORDS = {
	declare: [
		'action',
		'callback',
		'class',
		'classDef',
		'classDiagram',
		'click',
		'direction',
		'erDiagram',
		'flowchart',
		'gantt',
		'gitGraph',
		'graph',
		'journey',
		'link',
		'linkStyle',
		'pie',
		'requirementDiagram',
		'sequenceDiagram',
		'stateDiagram-v2',
		'stateDiagram',
		'style',
		'subgraph',
	],
	flow: [
		'activate',
		'alt',
		'and',
		'as',
		'autonumber',
		'deactivate',
		'else',
		'end',
		'loop',
		'opt',
		'par',
		'participant',
		'rect',
		'state',
		'note',
	],
};
