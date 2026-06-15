// Gate: every Drafting archetype maps to a worked exemplar deck that actually
// exists on disk. The archetype→exemplar mapping is hand-authored in
// drawing-board-architect.js (the display name is the join key, so it has to live
// with the names); this test is the freshness check that keeps it honest — a typo
// in a slug, a renamed deck, or a new archetype without an exemplar fails here
// instead of 404'ing the picker's worked-example path in production.

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ARCHETYPE_LIST } from './drawing-board-architect.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..'); // docs/src/playground → repo root

describe('Drafting archetype → exemplar mapping', () => {
	it('covers all 45 archetypes', () => {
		expect(ARCHETYPE_LIST.length).toBe(45);
	});

	it('every archetype names an exemplar deck that exists', () => {
		const missing: string[] = [];
		for (const it of ARCHETYPE_LIST) {
			if (!it.exemplar || typeof it.exemplar !== 'string') {
				missing.push(`${it.name} (no exemplar path)`);
				continue;
			}
			const file = join(repoRoot, 'exemplars', `${it.exemplar}.md`);
			if (!existsSync(file)) missing.push(`${it.name} → exemplars/${it.exemplar}.md`);
		}
		expect(missing, `unresolved exemplar paths:\n${missing.join('\n')}`).toEqual([]);
	});

	it('exemplar paths are unique (no two archetypes share a deck)', () => {
		const paths = ARCHETYPE_LIST.map((it) => it.exemplar);
		expect(new Set(paths).size).toBe(paths.length);
	});
});
