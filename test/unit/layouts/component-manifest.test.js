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
  validate,
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
        variants: ['compact', 'dark'],
        slots: {
          title: { selector: 'h2', required: true, description: 'Heading.' },
        },
        example: 'examples/snippets/cards-grid.md',
        docs: 'docs/references/templates.md#cards-grid',
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

    test('rejects missing description and skeleton', () => {
      const m = { ...GOOD };
      delete m.description;
      delete m.skeleton;
      const errors = validate(m);
      assert.ok(errors.some((e) => /description/.test(e)));
      assert.ok(errors.some((e) => /skeleton/.test(e)));
    });

    test('rejects non-array variants', () => {
      assert.match(validate({ ...GOOD, variants: 'compact dark' })[0], /array/);
    });

    test('rejects variants with non-string entries', () => {
      assert.match(validate({ ...GOOD, variants: ['compact', 7] })[0], /non-empty/);
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

    test('reports multiple errors at once', () => {
      const errors = validate({ name: '', function: 'x', form: 'y', substance: 'z' });
      // 4 explicit field errors + missing description + missing skeleton = 6
      assert.ok(errors.length >= 5, `expected ≥5 errors, got ${errors.length}`);
    });
  });

  describe('loadOne', () => {
    test('loads and validates a real manifest file', () => {
      const m = loadOne(path.join(__dirname, '..', '..', '..', 'lib', 'components', 'cards-grid.json'));
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
  });
});
