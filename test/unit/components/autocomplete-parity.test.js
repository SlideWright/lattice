/**
 * Unit: autocomplete ⇄ engine parity (the self-maintenance gate).
 *
 * The Drawing Board editor offers completion from the same manifests the linter
 * validates against, so the two must agree by construction. This test PINS that
 * agreement so a future layout/variant/modifier can't be added to the engine
 * without flowing into completion (or be offered by completion without the
 * linter accepting it). See engineering/decisions/2026-06-11-autocomplete-self-maintenance.md.
 *
 * Three invariants:
 *   1. completion-offered ⊆ lint-accepted  — never suggest what the engine rejects
 *   2. no orphan family tokens             — every family token is offered somewhere
 *   3. data-source parity                  — manifest flags == editor registry
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { loadAll, familyModifiersFor, FAMILY_MODIFIER_TOKENS, OPT_IN_FAMILY_NAMES, SUPPORTED_AXES, validate } = require('../../../lib/components');
const { buildVocab } = require('../../../lib/authoring/lint');
const { FOCUS_AXES } = require('../../../lib/authoring/lint-core');

// A minimal valid manifest to probe field-level validation against.
const baseManifest = {
	name: 'probe',
	function: 'statement',
	form: 'canvas',
	substance: 'prose',
	description: 'A probe.',
	skeleton: '<!-- _class: probe -->',
	tags: ['pull-quote', 'pitch', 'board-deck'],
};
const famErrors = (m) => validate(m, 't').filter((e) => /families|dataCompletion|focusAxes/i.test(e));

const split = (s) => String(s).split(/\s+/).filter(Boolean);

describe('autocomplete ⇄ engine parity', () => {
	const manifests = loadAll();
	const vocab = buildVocab();

	// Every token the editor would OFFER as a modifier: a component's own
	// `variants` + its scoped `familyModifiers` + the universal set — exactly the
	// inputs to modifierOptions() in the editor.
	const offered = new Set([...vocab.universalModifiers]);
	for (const m of manifests) {
		for (const v of m.variants || []) for (const t of split(v)) offered.add(t);
		for (const f of familyModifiersFor(m)) for (const t of split(f)) offered.add(t);
	}

	test('1. completion never offers a modifier the linter rejects (offered ⊆ accepted)', () => {
		const rejected = [...offered].filter((t) => !vocab.modifiers.has(t)).sort();
		assert.deepEqual(rejected, [], `completion offers tokens the linter would flag: ${rejected.join(', ')}`);
	});

	test('2. no orphan family tokens (every family token is offered on ≥1 component)', () => {
		const offeredFamily = new Set();
		for (const m of manifests) for (const f of familyModifiersFor(m)) offeredFamily.add(f);
		const orphans = FAMILY_MODIFIER_TOKENS.filter((t) => !offeredFamily.has(t)).sort();
		assert.deepEqual(orphans, [], `family tokens accepted by lint but offered on no component: ${orphans.join(', ')}`);
	});

	test('3. data-source parity: manifest dataCompletion flags == editor registry', async () => {
		const declared = manifests
			.filter((m) => m.dataCompletion === true)
			.map((m) => m.name)
			.sort();
		const { DATA_SOURCE_COMPONENTS } = await import('../../../docs/src/playground/data-source-components.js');
		assert.deepEqual(declared, [...DATA_SOURCE_COMPONENTS].sort(), 'manifests declaring dataCompletion must match the editor DATA_SOURCE_COMPONENTS registry');
	});

	test('4. focusAxes parity: the engine axis sets agree, and every declared axis is supported', () => {
		// The three constants that must never drift: the manifest validator's
		// SUPPORTED_AXES, the linter's FOCUS_AXES, and (gated separately in
		// slide-context.test.js) the completion vocab.
		assert.deepEqual([...SUPPORTED_AXES].sort(), [...FOCUS_AXES].sort(),
			'lib/components SUPPORTED_AXES must equal lib/authoring/lint-core FOCUS_AXES');
		// No manifest may advertise an axis the engine doesn't support.
		const bad = [];
		for (const m of manifests) {
			if (!Array.isArray(m.focusAxes)) continue;
			for (const a of m.focusAxes) if (!SUPPORTED_AXES.includes(a)) bad.push(`${m.name}: ${a}`);
		}
		assert.deepEqual(bad, [], `manifest focusAxes outside SUPPORTED_AXES: ${bad.join(', ')}`);
		// And the catalog of focusable layouts is non-empty (the feature is wired).
		assert.ok(manifests.some((m) => Array.isArray(m.focusAxes) && m.focusAxes.length),
			'at least one layout should declare focusAxes');
	});
});

describe('manifest validation of the self-maintenance fields', () => {
	test('families accepts an opt-in family, rejects a bucket-scoped or unknown one', () => {
		assert.deepEqual(famErrors({ ...baseManifest, families: ['state-markers'] }), []);
		assert.ok(OPT_IN_FAMILY_NAMES.includes('state-markers'));
		// `chart` is a real family but bucket-scoped — opting in by name is meaningless
		assert.equal(famErrors({ ...baseManifest, families: ['chart'] }).length, 1);
		assert.equal(famErrors({ ...baseManifest, families: ['nope'] }).length, 1);
		assert.equal(famErrors({ ...baseManifest, families: 'state-markers' }).length, 1); // not an array
	});

	test('dataCompletion must be a boolean', () => {
		assert.deepEqual(famErrors({ ...baseManifest, dataCompletion: true }), []);
		assert.deepEqual(famErrors({ ...baseManifest, dataCompletion: false }), []);
		assert.equal(famErrors({ ...baseManifest, dataCompletion: 'yes' }).length, 1);
	});

	test('focusAxes accepts a valid axis subset, rejects unknown axes / non-arrays', () => {
		assert.deepEqual(famErrors({ ...baseManifest, focusAxes: ['row', 'col', 'cell'] }), []);
		assert.deepEqual(famErrors({ ...baseManifest, focusAxes: ['item'] }), []);
		assert.equal(famErrors({ ...baseManifest, focusAxes: ['rows'] }).length, 1); // typo'd axis
		assert.equal(famErrors({ ...baseManifest, focusAxes: 'row' }).length, 1); // not an array
		assert.equal(famErrors({ ...baseManifest, focusAxes: [''] }).length, 1); // empty entry
	});
});
