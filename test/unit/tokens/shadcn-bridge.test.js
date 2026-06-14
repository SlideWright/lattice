/**
 * Unit: invariants of the shadcn ↔ Lattice token bridge (docs/src/styles/
 * tailwind.css). The website's whole "switch palette → every shadcn component
 * re-themes" guarantee rests on these, and the Preflight-off invariant is what
 * keeps Tailwind from silently resetting the ~7k lines of hand-written site CSS
 * (an accidental full `@import "tailwindcss"` would pull Preflight back in).
 * See engineering/decisions/2026-06-09-shadcn-migration.md §0/§4.2.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..');
const TAILWIND = path.join(ROOT, 'docs/src/styles/tailwind.css');
const css = fs.readFileSync(TAILWIND, 'utf8');

describe('shadcn bridge: Tailwind Preflight is OFF', () => {
	test('imports the theme + utilities layers only, never preflight', () => {
		assert.match(css, /@import\s+['"]tailwindcss\/theme\.css['"]/, 'must import the theme layer');
		assert.match(css, /@import\s+['"]tailwindcss\/utilities\.css['"]/, 'must import the utilities layer');
		assert.doesNotMatch(css, /@import\s+['"]tailwindcss\/preflight/, 'must NOT import preflight (global reset)');
		// The bare `@import "tailwindcss"` pulls in preflight transitively — banned.
		assert.doesNotMatch(css, /@import\s+['"]tailwindcss['"]\s*;/, 'must NOT use the bare tailwindcss import (it includes preflight)');
	});

	test('the baseline reset is scoped to .lx-ui island roots, not global', () => {
		// Every reset selector in the @layer base block must be namespaced to .lx-ui.
		const base = /@layer\s+base\s*\{([\s\S]*?)\n\}/.exec(css);
		assert.ok(base, 'expected an @layer base block');
		// Extract EVERY selector list (the text before each `{`), including bare
		// element selectors like `button {…}` — those are exactly the global-leak
		// case this guard exists to catch, so the matcher must not pre-filter to
		// selectors that start with .#:[ (the original bug: it skipped `button`).
		const body = base[1].replace(/\/\*[\s\S]*?\*\//g, '');
		const selectors = (body.match(/[^{}]+(?=\{)/g) || [])
			.flatMap((group) => group.split(','))
			.map((s) => s.trim())
			.filter(Boolean);
		assert.ok(selectors.length > 0, 'expected scoped reset selectors');
		for (const sel of selectors) {
			assert.match(sel, /\.lx-ui/, `reset selector must be scoped to .lx-ui (global leak): ${sel}`);
		}
	});
});

describe('shadcn bridge: required semantic tokens are mapped', () => {
	const required = [
		'--color-background',
		'--color-foreground',
		'--color-card',
		'--color-popover',
		'--color-primary',
		'--color-primary-foreground',
		'--color-secondary',
		'--color-muted',
		'--color-muted-foreground',
		'--color-accent',
		'--color-accent-foreground',
		'--color-destructive',
		'--color-border',
		'--color-input',
		'--color-ring',
		'--color-chart-1',
		'--color-chart-5',
	];
	for (const token of required) {
		test(`maps ${token}`, () => {
			assert.match(css, new RegExp(`${token.replace(/[-]/g, '\\-')}\\s*:`), `bridge must define ${token}`);
		});
	}

	test('never redefines the Lattice brand --accent (collision guard)', () => {
		// shadcn's accent is a hover surface; the brand must stay --primary, and the
		// bridge must not declare a raw `--accent:` (which would clobber 900+ rules).
		assert.doesNotMatch(css, /(^|[^-])--accent\s*:/m, 'bridge must not redefine the Lattice --accent token');
		assert.match(css, /--color-primary:\s*var\(--accent\)/, 'brand accent must flow through --color-primary');
	});
});

describe('shadcn bridge: contrast gate passes for all 14 palettes', () => {
	test('every bridge-derived/critical pair meets its WCAG floor', () => {
		// Runs the standalone gate; throws (failing the test) on any FAIL.
		const out = execFileSync('node', [path.join(ROOT, 'tools/check-shadcn-bridge-contrast.js')], {
			cwd: ROOT,
			encoding: 'utf8',
		});
		assert.match(out, /every bridge-derived\/critical pair meets its WCAG floor/);
	});
});
