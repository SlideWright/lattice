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

// Value vocabulary for the deck-level `islands:` front-matter toggle — the
// islands composition model. 'on' = masthead band + bay + progress rail;
// 'minimal' = band + bay, no rail; 'off' = disabled. Mirrors ISLANDS_MODES in
// lib/integrations/marp/plugins.js.
export const ISLANDS_VALUES = ['off', 'on', 'minimal'];

// Value vocabulary for the Lattice-specific `tokens:` front-matter directive,
// which picks the deck's token vocabulary in the Drawing Board: `universal` (the
// new --cat-*/--diagram-*/--seq-* names, the default when omitted) or `current`
// (the legacy --c1-*/--bg-* names). Both render identically — a migration-safety
// A/B. The default leads.
export const TOKENS_VALUES = ['universal', 'current'];

// Value vocabulary for the Lattice `split:` front-matter directive, which picks
// how the body divides into slides: `rule` (split on `---`, the default) or
// `headings` (split on each h1/h2). Mirrors lib/core/resolve-split.js SPLIT_NAMES.
export const SPLIT_VALUES = ['rule', 'headings'];

// Fence info-strings worth completing: the Lattice-special focusable fences
// (`mermaid`, `chart`) plus the languages editor.js highlights, with the common
// short aliases (`js`/`ts`/`py`) so they resolve too. A practical completion
// set, not a strict mirror of editor.js's EAGER_LANGUAGES — a language missing
// here just isn't suggested, never broken.
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
