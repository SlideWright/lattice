/**
 * Unit: lib/components/index.js — manifest schema, validator, loader.
 *
 * Covers:
 *   1. validate() rejects bad/missing fields with clear messages
 *   2. loadOne() reads and validates a single manifest file
 *   3. loadAll() returns every manifest in the directory, name-sorted,
 *      and rejects duplicates
 *   4. groupByFunction() partitions the catalog by family for the
 *      scaffolder --list output
 *   5. Every shipped manifest in lib/components/ passes validation
 *      (the "every committed manifest is well-formed" gate)
 */



const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  FUNCTIONS,
  FORMS,
  SUBSTANCES,
  MIXED_SUBSTANCE,
  UNIVERSAL_GROUPS,
  UNIVERSAL_VARIANTS,
  SEMI_UNIVERSAL_VARIANTS,
  CARD_STYLE_LAYOUTS,
  validate,
  effectiveVariants,
  findInlineTitleBodyLine,
  loadOne,
  loadAll,
  groupByFunction,
} = require('../../../lib/components');

const GOOD = Object.freeze({
  name: 'cards-grid',
  function: 'inventory',
  form: 'grid',
  substance: 'structure',
  description: 'Cards in a grid.',
  skeleton: '<!-- _class: cards-grid -->\n\n## Heading.\n',
});

describe('component-manifest', () => {
  describe('validate', () => {
    test('accepts a minimal well-formed manifest', () => {
      assert.deepEqual(validate(GOOD), []);
    });

    test('accepts optional fields when present and well-formed', () => {
      const m = {
        ...GOOD,
        purpose: 'Use for parallel options.',
        variants: ['mirror', 'four', 'three'],
        excludes: ['loose'],
        slots: {
          title: { selector: 'h2', required: true, description: 'Heading.' },
        },
        example: 'examples/snippets/cards-grid.md',
        anatomyBlock: 'T7-card-grid-2x2',
      };
      assert.deepEqual(validate(m), []);
    });

    test('rejects non-object input', () => {
      assert.ok(validate(null).length > 0);
      assert.ok(validate('not an object').length > 0);
      assert.ok(validate(42).length > 0);
    });

    test('rejects missing or empty name', () => {
      assert.match(validate({ ...GOOD, name: '' })[0], /name/);
      assert.match(validate({ ...GOOD, name: undefined })[0], /name/);
    });

    test('rejects non-kebab-case name', () => {
      assert.match(validate({ ...GOOD, name: 'CardsGrid' })[0], /kebab/);
      assert.match(validate({ ...GOOD, name: 'cards_grid' })[0], /kebab/);
      assert.match(validate({ ...GOOD, name: '1cards' })[0], /kebab/);
    });

    test('rejects unknown function', () => {
      const errors = validate({ ...GOOD, function: 'nonsense' });
      assert.match(errors[0], /function must be one of/);
    });

    test('rejects unknown form', () => {
      const errors = validate({ ...GOOD, form: 'spiral' });
      assert.match(errors[0], /form must be one of/);
    });

    test('rejects unknown substance', () => {
      const errors = validate({ ...GOOD, substance: 'magic' });
      assert.match(errors[0], /substance must be one of/);
    });

    test('accepts substance "mixed" on panel-form components', () => {
      const errors = validate({ ...GOOD, form: 'panel', substance: 'mixed' });
      assert.deepEqual(errors, []);
    });

    test('rejects substance "mixed" on non-panel forms', () => {
      const errors = validate({ ...GOOD, form: 'grid', substance: 'mixed' });
      assert.match(errors[0], /substance "mixed" is only allowed when form is "panel"/);
    });

    test('rejects missing description and skeleton', () => {
      const m = { ...GOOD };
      delete m.description;
      delete m.skeleton;
      const errors = validate(m);
      assert.ok(errors.some((e) => /description/.test(e)));
      assert.ok(errors.some((e) => /skeleton/.test(e)));
    });

    test('rejects non-array variants', () => {
      assert.match(validate({ ...GOOD, variants: 'mirror' })[0], /array/);
    });

    test('rejects variants with non-string entries', () => {
      assert.match(validate({ ...GOOD, variants: ['mirror', 7] })[0], /non-empty/);
    });

    test('rejects universal variants in variants array', () => {
      const errors = validate({ ...GOOD, variants: ['dark'] });
      assert.match(errors[0], /variant 'dark' is universal/);
    });

    test('rejects semi-universal variants in variants array', () => {
      const errors = validate({ ...GOOD, variants: ['compact'] });
      assert.match(errors[0], /variant 'compact' is semi-universal/);
      assert.match(errors[0], /excludes/);
    });

    test('accepts layout-specific variants', () => {
      assert.deepEqual(validate({ ...GOOD, variants: ['mirror', 'four'] }), []);
    });

    test('accepts well-formed excludes array', () => {
      assert.deepEqual(validate({ ...GOOD, excludes: ['compact', 'loose'] }), []);
    });

    test('rejects non-array excludes', () => {
      assert.match(validate({ ...GOOD, excludes: 'compact' })[0], /array/);
    });

    test('rejects excludes containing non-semi-universal values', () => {
      const errors = validate({ ...GOOD, excludes: ['dark'] });
      assert.match(errors[0], /must be one of the semi-universal variants/);
    });

    test('rejects malformed slots', () => {
      assert.match(validate({ ...GOOD, slots: [] })[0], /object/);
      const noSelector = validate({
        ...GOOD,
        slots: { title: { description: 'x' } },
      });
      assert.match(noSelector[0], /selector/);
    });

    test('prefixes error messages with source path when provided', () => {
      const errors = validate({ ...GOOD, name: '' }, 'lib/components/x.json');
      assert.match(errors[0], /^lib\/components\/x\.json:/);
    });

    test('card-style layouts reject inline `- **Title.** body` format in sample', () => {
      const m = {
        ...GOOD,
        name: 'cards-grid', // listed in CARD_STYLE_LAYOUTS
        sample: '<!-- _class: cards-grid -->\n\n## …\n\n- **Title.** body text on same line.\n',
      };
      const errors = validate(m);
      assert.ok(
        errors.some((e) => /inline.*Title.*body/.test(e)),
        'expected inline-format error, got: ' + JSON.stringify(errors),
      );
    });

    test('card-style layouts reject inline format in variantDocs[*].sample', () => {
      const m = {
        ...GOOD,
        name: 'cards-grid',
        variants: ['three'],
        variantDocs: {
          three: {
            caption: 'three-column variant',
            sample: '<!-- _class: cards-grid three -->\n\n- **Title.** body text.\n',
          },
        },
      };
      const errors = validate(m);
      assert.ok(
        errors.some((e) => /variantDocs.*three.*inline/.test(e)),
        'expected variantDocs inline-format error, got: ' + JSON.stringify(errors),
      );
    });

    test('card-style layouts accept nested-list format', () => {
      const m = {
        ...GOOD,
        name: 'cards-grid',
        sample: '<!-- _class: cards-grid -->\n\n## …\n\n- Title\n  - body text.\n',
      };
      const errors = validate(m);
      assert.deepEqual(errors, []);
    });

    test('non-card-style layouts permit inline format', () => {
      const m = {
        ...GOOD,
        name: 'actors', // NOT in CARD_STYLE_LAYOUTS — its li is one conceptual unit
        sample: '<!-- _class: actors -->\n\n- **Author.** Drafts the deck.\n',
      };
      const errors = validate(m);
      assert.deepEqual(errors, []);
    });
  });

  describe('findInlineTitleBodyLine', () => {
    test('matches inline title+body on a bullet line', () => {
      const line = findInlineTitleBodyLine('- **Title.** body');
      assert.equal(line, '- **Title.** body');
    });
    test('matches inline title+body on any bullet (`-` or `*`)', () => {
      assert.ok(findInlineTitleBodyLine('* **Title.** body'));
    });
    test('returns null on nested-list format', () => {
      assert.equal(findInlineTitleBodyLine('- Title\n  - body'), null);
    });
    test('returns null when strong is alone on the line (no inline body)', () => {
      assert.equal(findInlineTitleBodyLine('- **Title only**'), null);
    });
    test('returns null on empty input', () => {
      assert.equal(findInlineTitleBodyLine(''), null);
      assert.equal(findInlineTitleBodyLine(null), null);
    });

    test('reports multiple errors at once', () => {
      const errors = validate({ name: '', function: 'x', form: 'y', substance: 'z' });
      // 4 explicit field errors + missing description + missing skeleton = 6
      assert.ok(errors.length >= 5, `expected ≥5 errors, got ${errors.length}`);
    });
  });

  describe('loadOne', () => {
    test('loads and validates a real manifest file', () => {
      const m = loadOne(path.join(__dirname, '..', '..', '..', 'lib', 'components', 'cards-grid', 'cards-grid.manifest.json'));
      assert.equal(m.name, 'cards-grid');
      assert.equal(m.function, 'inventory');
    });

    test('throws on invalid JSON', () => {
      const tmp = path.join(os.tmpdir(), `manifest-${process.pid}.json`);
      fs.writeFileSync(tmp, '{ not valid json');
      try {
        assert.throws(() => loadOne(tmp), /invalid JSON/);
      } finally {
        fs.unlinkSync(tmp);
      }
    });

    test('throws on validation failure with file path in the message', () => {
      const tmp = path.join(os.tmpdir(), `manifest-${process.pid}.json`);
      fs.writeFileSync(tmp, JSON.stringify({ name: 'x', function: 'nope' }));
      try {
        assert.throws(() => loadOne(tmp), /function must be one of/);
      } finally {
        fs.unlinkSync(tmp);
      }
    });
  });

  describe('loadAll', () => {
    test('reads the shipped lib/components directory', () => {
      const manifests = loadAll();
      assert.ok(manifests.length > 0, 'expected at least one manifest');
      // Every entry has a name
      for (const m of manifests) assert.ok(m.name, 'manifest has no name');
    });

    test('returns manifests sorted by name', () => {
      const manifests = loadAll();
      const names = manifests.map((m) => m.name);
      const sorted = [...names].sort();
      assert.deepEqual(names, sorted);
    });

    test('throws on duplicate names', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifests-'));
      const dup1 = path.join(tmpDir, 'a.json');
      const dup2 = path.join(tmpDir, 'b.json');
      const m = JSON.stringify({ ...GOOD, name: 'same-name' });
      fs.writeFileSync(dup1, m);
      fs.writeFileSync(dup2, m);
      try {
        assert.throws(() => loadAll(tmpDir), /duplicate manifest name/);
      } finally {
        fs.unlinkSync(dup1);
        fs.unlinkSync(dup2);
        fs.rmdirSync(tmpDir);
      }
    });

    test('ignores non-JSON files and underscore-prefixed JSON', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifests-'));
      fs.writeFileSync(path.join(tmpDir, 'README.md'), 'docs');
      fs.writeFileSync(path.join(tmpDir, '_schema.json'), '{"$schema": "x"}');
      fs.writeFileSync(path.join(tmpDir, 'real.json'), JSON.stringify(GOOD));
      try {
        const ms = loadAll(tmpDir);
        assert.equal(ms.length, 1);
        assert.equal(ms[0].name, 'cards-grid');
      } finally {
        for (const f of ['README.md', '_schema.json', 'real.json']) {
          fs.unlinkSync(path.join(tmpDir, f));
        }
        fs.rmdirSync(tmpDir);
      }
    });

    test('accepts folder-shape manifests at <name>/manifest.json', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifests-'));
      const sub = path.join(tmpDir, 'demo');
      fs.mkdirSync(sub);
      const folderManifest = { ...GOOD, name: 'demo' };
      fs.writeFileSync(path.join(sub, 'manifest.json'), JSON.stringify(folderManifest));
      try {
        const ms = loadAll(tmpDir);
        assert.equal(ms.length, 1);
        assert.equal(ms[0].name, 'demo');
      } finally {
        fs.unlinkSync(path.join(sub, 'manifest.json'));
        fs.rmdirSync(sub);
        fs.rmdirSync(tmpDir);
      }
    });

    test('handles a directory with no manifest.json (incomplete folder)', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifests-'));
      const sub = path.join(tmpDir, 'partial');
      fs.mkdirSync(sub);
      fs.writeFileSync(path.join(sub, 'styles.css'), '/* placeholder */');
      try {
        const ms = loadAll(tmpDir);
        assert.equal(ms.length, 0);
      } finally {
        fs.unlinkSync(path.join(sub, 'styles.css'));
        fs.rmdirSync(sub);
        fs.rmdirSync(tmpDir);
      }
    });

    test('flat + folder shapes for the same name are caught as duplicates', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifests-'));
      const flat = path.join(tmpDir, 'same.json');
      const sub = path.join(tmpDir, 'same');
      fs.mkdirSync(sub);
      const folderManifest = path.join(sub, 'manifest.json');
      const m = { ...GOOD, name: 'same' };
      fs.writeFileSync(flat, JSON.stringify(m));
      fs.writeFileSync(folderManifest, JSON.stringify(m));
      try {
        assert.throws(() => loadAll(tmpDir), /duplicate manifest name/);
      } finally {
        fs.unlinkSync(flat);
        fs.unlinkSync(folderManifest);
        fs.rmdirSync(sub);
        fs.rmdirSync(tmpDir);
      }
    });

    test('ignores index.js sibling at the loader root', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifests-'));
      fs.writeFileSync(path.join(tmpDir, 'index.js'), '// not a manifest');
      fs.writeFileSync(path.join(tmpDir, 'real.json'), JSON.stringify(GOOD));
      try {
        const ms = loadAll(tmpDir);
        assert.equal(ms.length, 1);
      } finally {
        fs.unlinkSync(path.join(tmpDir, 'index.js'));
        fs.unlinkSync(path.join(tmpDir, 'real.json'));
        fs.rmdirSync(tmpDir);
      }
    });
  });

  describe('groupByFunction', () => {
    test('partitions manifests by function family', () => {
      const ms = [
        { ...GOOD, name: 'a', function: 'inventory' },
        { ...GOOD, name: 'b', function: 'inventory' },
        { ...GOOD, name: 'c', function: 'comparison' },
      ];
      const g = groupByFunction(ms);
      assert.equal(g.inventory.length, 2);
      assert.equal(g.comparison.length, 1);
      assert.equal(g.evidence.length, 0);
    });

    test('returns every function family even when empty', () => {
      const g = groupByFunction([]);
      for (const fn of FUNCTIONS) {
        assert.ok(Array.isArray(g[fn]), `${fn} should be an array`);
      }
    });
  });

  describe('shipped manifests are all valid', () => {
    test('every file in lib/components/ passes validation', () => {
      // This is the gate that prevents a malformed manifest from
      // being committed without the test catching it.
      assert.doesNotThrow(() => loadAll());
    });
  });

  describe('vocabulary', () => {
    test('FUNCTIONS, FORMS, SUBSTANCES are non-empty frozen arrays', () => {
      for (const arr of [FUNCTIONS, FORMS, SUBSTANCES]) {
        assert.ok(arr.length > 0);
        assert.ok(Object.isFrozen(arr));
      }
    });

    test('FUNCTIONS has exactly the 7 families documented in design-system.md §3', () => {
      assert.deepEqual([...FUNCTIONS].sort(), [
        'anchor', 'comparison', 'evidence', 'imagery', 'inventory', 'progression', 'statement',
      ]);
    });

    test('SUBSTANCES has exactly the 4 plugin contracts documented in design-system.md §5', () => {
      assert.deepEqual([...SUBSTANCES].sort(), ['graph', 'prose', 'series', 'structure']);
    });

    test('MIXED_SUBSTANCE is "mixed" and is NOT a member of SUBSTANCES (it is a composition declaration, not a 5th plugin)', () => {
      assert.equal(MIXED_SUBSTANCE, 'mixed');
      assert.ok(!SUBSTANCES.includes(MIXED_SUBSTANCE));
    });

    test('UNIVERSAL_GROUPS has the six documented categories', () => {
      assert.deepEqual(Object.keys(UNIVERSAL_GROUPS).sort(), [
        'chrome', 'decoration', 'mood', 'state', 'tone', 'typography',
      ]);
    });

    test('UNIVERSAL_VARIANTS is the flat union of the groups, deduped', () => {
      const allGroupValues = Object.values(UNIVERSAL_GROUPS).flatMap((g) => [...g]);
      const expected = [...new Set(allGroupValues)];
      assert.deepEqual([...UNIVERSAL_VARIANTS], expected);
    });

    test('UNIVERSAL_VARIANTS and SEMI_UNIVERSAL_VARIANTS are disjoint', () => {
      const uni = new Set(UNIVERSAL_VARIANTS);
      const overlap = SEMI_UNIVERSAL_VARIANTS.filter((v) => uni.has(v));
      assert.deepEqual(overlap, []);
    });

    test('the state group has all 8 documented variants', () => {
      assert.deepEqual([...UNIVERSAL_GROUPS.state].sort(), [
        'archived', 'confidential', 'draft', 'pinned', 'redacted', 'revised', 'tbd', 'wip',
      ]);
    });

    test('the tone group has the 4 state-token tones', () => {
      assert.deepEqual([...UNIVERSAL_GROUPS.tone].sort(), [
        'tone-fail', 'tone-pass', 'tone-skip', 'tone-warn',
      ]);
    });

    test('chrome group has silent + the three surgicals', () => {
      assert.deepEqual([...UNIVERSAL_GROUPS.chrome].sort(), [
        'no-footer', 'no-header', 'no-paginate', 'silent',
      ]);
    });
  });

  describe('effectiveVariants', () => {
    test('returns all universals + all semi-universals + layout-specific, sorted', () => {
      const m = { ...GOOD, variants: ['four', 'mirror'] };
      const vs = effectiveVariants(m);
      // Sorted
      assert.deepEqual(vs, [...vs].sort());
      // Includes universals
      for (const u of UNIVERSAL_VARIANTS) assert.ok(vs.includes(u), `missing universal ${u}`);
      // Includes semi-universals
      for (const s of SEMI_UNIVERSAL_VARIANTS) assert.ok(vs.includes(s), `missing semi ${s}`);
      // Includes layout-specific
      assert.ok(vs.includes('four'));
      assert.ok(vs.includes('mirror'));
    });

    test('respects excludes for semi-universals', () => {
      const m = { ...GOOD, excludes: ['compact', 'loose'] };
      const vs = effectiveVariants(m);
      assert.ok(!vs.includes('compact'));
      assert.ok(!vs.includes('loose'));
      // Universals still present
      assert.ok(vs.includes('dark'));
      // Non-excluded semi-universal still present
      assert.ok(vs.includes('accent'));
    });

    test('handles manifest with no variants and no excludes', () => {
      const vs = effectiveVariants(GOOD);
      // Just universals + all semi-universals
      const expected = [...new Set([...UNIVERSAL_VARIANTS, ...SEMI_UNIVERSAL_VARIANTS])].sort();
      assert.deepEqual(vs, expected);
    });

    test('deduplicates if a layout-specific variant happens to match a universal/semi', () => {
      // No-op test: validator should prevent this, but the function dedupes defensively.
      const m = { ...GOOD, variants: ['mirror', 'mirror'] };
      const vs = effectiveVariants(m);
      assert.equal(vs.filter((v) => v === 'mirror').length, 1);
    });
  });
});
