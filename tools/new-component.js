#!/usr/bin/env node
/**
 * Scaffold a new Lattice component (layout).
 *
 * Usage:
 *   npm run new:component <name> --bucket <bucket> --function <fn> \
 *                                --form <form> --substance <substance>
 *   node tools/new-component.js  <name> --bucket <bucket> ...   # equivalent
 *
 * Creates lib/components/<bucket>/<name>/ with:
 *   <name>.manifest.json  — the contract, pre-filled with every field the
 *                           generated docs, the linter, AND the editor
 *                           autocomplete read. The autocomplete-relevant fields
 *                           (`variants`, `families`, `dataCompletion`, `slots`)
 *                           are present so they're CONSIDERED at creation, not
 *                           discovered later — the manifest is the one
 *                           co-located, IDE-agnostic source of completion data.
 *   <name>.styles.css     — a palette-blind stub (every colour via var(--token)).
 *
 * The scaffold writes valid JSON but DELIBERATELY leaves `description`,
 * `tags`, and the `skeleton` as TODOs — fill them before committing; the
 * build/lint gate rejects the placeholders. See the printed checklist.
 *
 * See design/design-system.md (Function · Form · Substance · Finish) and
 * engineering/decisions/2026-06-11-autocomplete-self-maintenance.md.
 */

const fs = require('fs');
const path = require('path');
const { FUNCTIONS, FORMS, SUBSTANCES, BUCKETS, MIXED_SUBSTANCE, OPT_IN_FAMILY_NAMES } = require('../lib/components');

const ROOT = path.join(__dirname, '..');
const NAME_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function bail(msg, code = 1) {
	process.stderr.write(`new-component: ${msg}\n`);
	process.exit(code);
}

// --- parse args: <name> then --key value pairs ------------------------------
function parseArgs(argv) {
	const out = { _: [] };
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
		else out._.push(a);
	}
	return out;
}

const args = parseArgs(process.argv.slice(2));
const name = args._[0];
const { bucket, function: fn, form, substance } = args;

if (!name) bail('usage: npm run new:component <name> --bucket <b> --function <f> --form <f> --substance <s>');
if (!NAME_RE.test(name)) bail(`name "${name}" must be kebab-case (a-z, digits, single hyphens)`);

const requireOneOf = (label, value, allowed) => {
	if (!value) bail(`--${label} is required (one of: ${allowed.join(', ')})`);
	if (!allowed.includes(value)) bail(`--${label} "${value}" must be one of: ${allowed.join(', ')}`);
};
requireOneOf('bucket', bucket, BUCKETS);
requireOneOf('function', fn, FUNCTIONS);
requireOneOf('form', form, FORMS);
requireOneOf('substance', substance, [...SUBSTANCES, MIXED_SUBSTANCE]);

const dir = path.join(ROOT, 'lib', 'components', bucket, name);
if (fs.existsSync(dir)) bail(`${path.relative(ROOT, dir)} already exists — pick another name`);

// --- manifest template ------------------------------------------------------
// Field order mirrors the catalog: identity → classification → prose →
// modifiers → completion → structure. The autocomplete fields are present (even
// at their empty defaults) so they're assessed now, not forgotten.
const manifest = {
	name,
	function: fn,
	form,
	substance,
	bucket,
	description: 'TODO: one sentence — what this layout is and when to reach for it.',
	tags: [],
	skeleton: `<!-- _class: ${name} -->\n\n## TODO heading\n\n- TODO first item\n- TODO second item\n`,
	variants: [],
	families: [],
	dataCompletion: false,
	slots: {},
};

const css = `/* ${name} — ${fn} · ${form} · ${substance}
 *
 * Palette-blind: every colour goes through var(--token). No hex literals.
 * See lib/base/ for the cascade and design/design-system.md for the model.
 */
section.${name} {
\t/* TODO: layout rules */
}
`;

fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `${name}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(dir, `${name}.styles.css`), css);

const rel = path.relative(ROOT, dir);
const optInFamilies = OPT_IN_FAMILY_NAMES.map((f) => `"${f}"`).join(', ') || '(none)';
process.stdout.write(
	`new-component: scaffolded ${rel}/\n` +
		`  ${name}.manifest.json   ${name}.styles.css\n\n` +
		`The empty tags[] block the build until filled — finish these before committing:\n` +
		`  1. description — replace the TODO with one real sentence.\n` +
		`  2. tags — 3–5 from the controlled vocabulary (idiom / occasion / material /\n` +
		`     task); must NOT restate name/function/form/substance/bucket. (This is the\n` +
		`     field the gate hard-rejects while empty; the others want real content too.)\n` +
		`  3. skeleton — the real authoring shape (slots filled with Markdown).\n` +
		`  4. variants — layout-specific modifier names (NOT universals/semis).\n` +
		`  5. families — opt into family modifiers if applicable: ${optInFamilies}\n` +
		`     (e.g. ["state-markers"] for checkbox/heat layouts). This is what makes\n` +
		`     those modifiers discoverable in autocomplete — declare it here.\n` +
		`  6. dataCompletion — set true only if this layout has a static body-data\n` +
		`     vocabulary the editor should complete (then register a completer in\n` +
		`     docs/src/playground/data-sources.js — the parity test enforces the pair).\n` +
		`  7. slots — name the structural slots: { "title": { "selector": "h2",\n` +
		`     "required": true, "description": "…" } }.\n\n` +
		`Then: npm run build (regenerates docs + galleries) and npm test.\n`,
);
