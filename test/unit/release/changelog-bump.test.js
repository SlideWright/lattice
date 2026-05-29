/**
 * Unit: the deterministic changelog → semver-bump engine.
 *
 * The bump level for a release is derived purely from the `## Unreleased`
 * section's Keep-a-Changelog categories (see tools/changelog.js). These
 * tests pin that mapping so the automated release can never silently pick
 * the wrong level.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  extractUnreleased,
  computeBump,
  nextVersion,
  releaseNotes,
  rollUnreleased,
} = require('../../../tools/changelog.js');

function changelog(unreleasedBody) {
  return [
    '# Changelog',
    '',
    '## Unreleased',
    '',
    unreleasedBody,
    '',
    '## 1.0.0 - 2026-01-01',
    '',
    '- initial release',
    '',
  ].join('\n');
}

describe('changelog bump engine', () => {
  describe('computeBump', () => {
    test('Removed → major', () => {
      assert.equal(computeBump('### Removed\n\n- dropped the `/legacy` export'), 'major');
    });

    test('Breaking-marked bullet under Changed → major', () => {
      assert.equal(
        computeBump('### Changed\n\n- **Breaking:** renamed `cards-grid` slot'),
        'major',
      );
    });

    test('BREAKING CHANGE token → major', () => {
      assert.equal(
        computeBump('### Changed\n\n- raised Node floor to 24\n\nBREAKING CHANGE: drops Node 22'),
        'major',
      );
    });

    test('Added → minor', () => {
      assert.equal(computeBump('### Added\n\n- new `timeline` component'), 'minor');
    });

    test('Changed (non-breaking) → minor', () => {
      assert.equal(computeBump('### Changed\n\n- retuned the type scale'), 'minor');
    });

    test('Deprecated → minor', () => {
      assert.equal(computeBump('### Deprecated\n\n- `fs-md` token names'), 'minor');
    });

    test('Fixed only → patch', () => {
      assert.equal(computeBump('### Fixed\n\n- mermaid scrim leak'), 'patch');
    });

    test('Security only → patch', () => {
      assert.equal(computeBump('### Security\n\n- bumped a transitive dep'), 'patch');
    });

    test('highest precedence wins across mixed categories', () => {
      const body = [
        '### Added',
        '- a new chart',
        '### Fixed',
        '- a bug',
        '### Removed',
        '- an old export',
      ].join('\n');
      assert.equal(computeBump(body), 'major');
    });

    test('Added + Fixed (no breaking) → minor', () => {
      assert.equal(computeBump('### Added\n- x\n### Fixed\n- y'), 'minor');
    });

    test('empty headings with no bullets → throws', () => {
      assert.throws(() => computeBump('### Added\n\n### Fixed\n'), /nothing to release/);
    });

    test('completely empty → throws', () => {
      assert.throws(() => computeBump('\n\n'), /nothing to release/);
    });

    test('repeated category headings are tolerated', () => {
      const body = '### Added\n- one\n### Added\n- two\n### Fixed\n- fix';
      assert.equal(computeBump(body), 'minor');
    });
  });

  describe('extractUnreleased', () => {
    test('captures body up to the next ## heading', () => {
      const md = changelog('### Added\n\n- thing');
      const sec = extractUnreleased(md);
      assert.ok(sec.body.includes('- thing'));
      assert.ok(!sec.body.includes('initial release'));
    });

    test('returns null when there is no Unreleased section', () => {
      assert.equal(extractUnreleased('# Changelog\n\n## 1.0.0\n\n- x'), null);
    });
  });

  describe('nextVersion', () => {
    test('major resets minor + patch', () => {
      assert.equal(nextVersion('1.4.2', 'major'), '2.0.0');
    });
    test('minor resets patch', () => {
      assert.equal(nextVersion('1.4.2', 'minor'), '1.5.0');
    });
    test('patch increments patch', () => {
      assert.equal(nextVersion('1.4.2', 'patch'), '1.4.3');
    });
    test('tolerates a v prefix', () => {
      assert.equal(nextVersion('v0.9.9', 'minor'), '0.10.0');
    });
    test('rejects an unparseable version', () => {
      assert.throws(() => nextVersion('not-a-version', 'patch'), /unparseable/);
    });
  });

  describe('rollUnreleased', () => {
    test('dates the section and seeds a fresh empty Unreleased', () => {
      const md = changelog('### Added\n\n- thing');
      const rolled = rollUnreleased(md, '1.1.0', '2026-05-29');
      assert.match(rolled, /## Unreleased\n\n## 1\.1\.0 - 2026-05-29/);
      // The old body now lives under the dated heading.
      assert.match(rolled, /## 1\.1\.0 - 2026-05-29\n\n### Added\n\n- thing/);
      // The fresh Unreleased is empty (no carried-over content).
      const fresh = extractUnreleased(rolled);
      assert.throws(() => computeBump(fresh.body), /nothing to release/);
    });
  });

  describe('releaseNotes', () => {
    test('returns the trimmed Unreleased body', () => {
      const notes = releaseNotes('\n\n### Added\n\n- thing\n\n\n');
      assert.equal(notes, '### Added\n\n- thing\n');
    });
  });
});
