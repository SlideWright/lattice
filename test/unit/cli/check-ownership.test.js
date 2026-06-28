/**
 * Unit: tools/check-ownership.js — build collision / ownership guard.
 *
 * Covers:
 *   1. The pure selector parser is paren-aware (commas inside :is()/[attr]
 *      don't split; @keyframes bodies are not treated as selectors).
 *   2. classTokens / isScopedTo recognize a component's own class and its
 *      `<name>-*` BEM namespace, token-exact (image != imagery).
 *   3. The live tree passes the guard (the CI-gate invariant).
 *   4. Each check fires on a synthetic collision — proving the guard
 *      would actually catch a regression, not just pass vacuously.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  topLevelSelectors,
  splitTopLevel,
  splitCompounds,
  classTokens,
  isScopedTo,
  cssRootModifierTokens,
  transformModifierTokens,
  parseThemeTokens,
  listBasePalettes,
  REQUIRED_THEME_TOKENS,
  checkTagClustering,
  checkRetiredTokenNames,
  RETIRED_TOKEN_NAMES,
  checkTypographyTokens,
  checkThemeHasSelectors,
  nonCanonicalFsTokens,
  hasNotHasSelector,
  offendingMargins,
  checkMarginDiscipline,
  LAYOUT_MARGIN_BUDGET,
  SANCTIONED_MARGINS,
  checkUsEnglish,
  UK_ENGLISH_FORMS,
  CANONICAL_FS_TOKENS,
  SINGLETON_TAGS,
  run,
} = require('../../../tools/check-ownership');

describe('check-ownership', () => {
  describe('selector parser', () => {
    test('splitTopLevel ignores commas inside :is() and [attr]', () => {
      assert.deepEqual(
        splitTopLevel('section.x:is(ul, ol) > li, section.x[data-a="b,c"]'),
        ['section.x:is(ul, ol) > li', 'section.x[data-a="b,c"]'],
      );
    });

    test('topLevelSelectors collects rule preludes, skips @keyframes bodies', () => {
      const css = `
        section.demo { color: red; }
        @media (min-width: 10px) { section.demo .x { color: blue; } }
        @keyframes spin { 0% { opacity: 0; } 100% { opacity: 1; } }
      `;
      const sels = topLevelSelectors(css);
      assert.ok(sels.includes('section.demo'));
      assert.ok(sels.includes('section.demo .x'));
      // The 0%/100% keyframe steps must NOT appear as selectors.
      assert.ok(!sels.some((s) => s.includes('%')));
    });

    test('comments do not leak into selectors', () => {
      const sels = topLevelSelectors('/* a, b { x } */ section.demo { y: 1; }');
      assert.deepEqual(sels, ['section.demo']);
    });
  });

  describe('scoping helpers', () => {
    test('classTokens extracts every .class token', () => {
      assert.deepEqual(classTokens('section.gantt .gantt-lane:last-child'), ['gantt', 'gantt-lane']);
    });

    test('isScopedTo matches own class and BEM namespace, token-exact', () => {
      assert.equal(isScopedTo('section.gantt .gantt-chart', 'gantt'), true);
      assert.equal(isScopedTo('.gantt-lane', 'gantt'), true);
      assert.equal(isScopedTo('section.imagery', 'image'), false); // not a prefix match
      assert.equal(isScopedTo('section.image-text', 'image'), true); // BEM namespace
      assert.equal(isScopedTo('.below-note', 'compare-prose'), false);
    });
  });

  describe('theme token parsing', () => {
    test('parseThemeTokens picks up custom property declarations only', () => {
      const t = parseThemeTokens(':root { --bg: #fff; color: var(--x); --accent: red; }');
      assert.ok(t.has('--bg'));
      assert.ok(t.has('--accent'));
      assert.ok(!t.has('--x')); // a var() reference is not a declaration
    });

    test('every base palette defines the required core tokens', () => {
      for (const p of listBasePalettes()) {
        for (const tok of REQUIRED_THEME_TOKENS) {
          assert.ok(p.tokens.has(tok), `theme ${p.name} missing ${tok}`);
        }
      }
    });
  });

  describe('post-flip token-tier lint (canonical flip, ADR §11.5)', () => {
    test('RETIRED_TOKEN_NAMES covers the legacy vocabulary (57 names, --prefixed)', () => {
      assert.equal(RETIRED_TOKEN_NAMES.size, 57);
      for (const n of ['--c1-light', '--c12-dark', '--c-stroke', '--c-ink-light',
        '--c-warm-light', '--bg-dark', '--dark-bg', '--scale-500']) {
        assert.ok(RETIRED_TOKEN_NAMES.has(n), `expected ${n} to be retired`);
      }
      // the deliberately-kept names must NOT be retired
      for (const keep of ['--bg', '--bg-alt', '--border', '--pass', '--accent']) {
        assert.ok(!RETIRED_TOKEN_NAMES.has(keep), `${keep} must stay`);
      }
    });

    test('the live engine + themes carry NO retired or tier-suffix token names', () => {
      const errors = [];
      checkRetiredTokenNames(errors);
      assert.deepEqual(errors, [], `the purge regressed:\n${errors.join('\n')}`);
    });
  });

  describe('typography token gate (HARD RULE #4)', () => {
    test('CANONICAL_FS_TOKENS is the closed 12-role set + the scale base', () => {
      assert.equal(CANONICAL_FS_TOKENS.size, 13);
      for (const n of ['--fs-meta', '--fs-body', '--fs-message', '--fs-emphasis',
        '--fs-h1', '--fs-h6', '--fs-hero', '--fs-scale']) {
        assert.ok(CANONICAL_FS_TOKENS.has(n), `expected ${n} canonical`);
      }
      // t-shirt sizes and ad-hoc names are NOT canonical
      for (const bad of ['--fs-md', '--fs-lg', '--fs-sm', '--fs-xl', '--fs-base']) {
        assert.ok(!CANONICAL_FS_TOKENS.has(bad), `${bad} must not be canonical`);
      }
    });

    test('nonCanonicalFsTokens flags a t-shirt-size DECLARATION, ignores usages/canonical', () => {
      assert.deepEqual(
        nonCanonicalFsTokens(':root { --fs-md: 1rem; --fs-body: 16px; }'),
        ['--fs-md'],
      );
      // a `var(--fs-h<n>)` usage is not a declaration → not flagged
      assert.deepEqual(nonCanonicalFsTokens('h2 { font-size: var(--fs-h2); }'), []);
    });

    test('the live engine + themes declare ONLY canonical --fs-* tokens', () => {
      const errors = [];
      checkTypographyTokens(errors);
      assert.deepEqual(errors, [], `non-canonical --fs-* leaked:\n${errors.join('\n')}`);
    });
  });

  describe('margin discipline gate (HARD RULE #20)', () => {
    test('offendingMargins flags nonzero margins, exempts all-zero resets', () => {
      // nonzero lengths, auto, and negatives are all offending
      assert.deepEqual(offendingMargins('.a { margin: 8px; }'), ['8px']);
      assert.deepEqual(offendingMargins('.a { margin-top: var(--sp-sm); }'), ['var(--sp-sm)']);
      assert.deepEqual(offendingMargins('.a { margin: 0 auto; }'), ['0 auto']);
      assert.deepEqual(offendingMargins('.a { margin-bottom: -4px; }'), ['-4px']);
      // all-zero resets add no space → exempt
      assert.deepEqual(offendingMargins('.a { margin: 0; }'), []);
      assert.deepEqual(offendingMargins('.a { margin: 0 0 0 0; }'), []);
      // logical + !important still caught; the value is normalized
      assert.deepEqual(offendingMargins('.a { margin-inline: 1rem !important; }'), ['1rem']);
      // scroll-margin / margin-trim must NOT match (lookbehind guard)
      assert.deepEqual(offendingMargins('.a { scroll-margin-top: 8px; }'), []);
    });

    test('the live engine CSS has zero unsanctioned margins (HARD RULE #20)', () => {
      const errors = [];
      checkMarginDiscipline(errors);
      assert.deepEqual(errors, [], `unsanctioned margin(s) or a stale sanction:\n${errors.join('\n')}`);
    });

    test('the margin gate is layout-budget-0 + a small enumerated allowlist', () => {
      assert.equal(LAYOUT_MARGIN_BUDGET, 0);
      // The allowlist is intentionally tiny; each entry carries a justification.
      assert.ok(SANCTIONED_MARGINS.length <= 3, 'sanctioned margins should stay a short, justified list');
      for (const s of SANCTIONED_MARGINS) {
        assert.ok(s.file && s.value && s.why, 'every sanction names a file, value, and reason');
      }
    });
  });

  describe('US-English gate (HARD RULE #21)', () => {
    const re = new RegExp(`\\b(${UK_ENGLISH_FORMS.join('|')})\\b`, 'gi');

    test('flags unambiguous British forms', () => {
      for (const w of ['colour', 'Behaviour', 'centred', 'normalise', 'grey', 'catalogue', 'defence', 'whilst', 'labelled']) {
        assert.ok(re.test(w), `expected "${w}" to be flagged`);
        re.lastIndex = 0;
      }
    });

    test('does NOT flag US spellings or words US keeps in the -ise/-re/-ue form', () => {
      // word boundaries + curated list: these must stay clean (false positives are the risk)
      for (const w of ['color', 'center', 'organize', 'gray', 'license', 'analysis', 'exercise', 'comprise', 'advise', 'surprise', 'dialogue', 'epicentre', 'rise', 'premise']) {
        assert.ok(!re.test(w), `did NOT expect "${w}" to be flagged`);
        re.lastIndex = 0;
      }
    });

    test('the live repo stays within the US-English budget', () => {
      const errors = [];
      checkUsEnglish(errors);
      assert.deepEqual(errors, [], `British spellings exceeded US_ENGLISH_BUDGET:\n${errors.join('\n')}`);
    });
  });

  describe('theme :has() gate (HARD RULE #12)', () => {
    test('hasNotHasSelector matches the :not/:is-wrapped forms, not a bare :has()', () => {
      assert.ok(hasNotHasSelector('section:not(:has(.x)) {}'));
      assert.ok(hasNotHasSelector('a:is(:has(.x)) {}'));
      assert.ok(hasNotHasSelector('section:not(.foo:has(.x)) {}'));
      assert.ok(!hasNotHasSelector('a:has(.x) {}'));
      assert.ok(!hasNotHasSelector('section:not(.plain) {}'));
    });

    test('the live themes/ carry NO :not(:has())/:is(:has()) selectors', () => {
      const errors = [];
      checkThemeHasSelectors(errors);
      assert.deepEqual(errors, [], `a theme regressed #12:\n${errors.join('\n')}`);
    });
  });

  describe('variant-declaration detection', () => {
    test('splitCompounds splits on combinators, paren-aware', () => {
      assert.deepEqual(
        splitCompounds('section.x.mod > ul:not(:has(.y)) li'),
        ['section.x.mod', 'ul:not(:has(.y))', 'li'],
      );
    });

    test('cssRootModifierTokens finds root modifiers, skips BEM/universal/nested', () => {
      const css = `
        section.radar.target { color: red; }
        section.radar.dark { color: blue; }           /* universal — skip */
        section.radar .radar-poly { fill: none; }      /* BEM descendant — skip */
        section.radar:not(:has(.radar-figure)) { x: 1; } /* presence check — skip */
        section.radar.minimal .radar-grid { opacity: .3; }
      `;
      assert.deepEqual(
        [...cssRootModifierTokens(css, 'radar')].sort(),
        ['minimal', 'target'],
      );
    });

    test('transformModifierTokens reads the dispatch array, drops universals', () => {
      const src = `
        const RADAR_MODIFIERS = ['target', 'delta', 'dark'];
        function buildRadar() {}
      `;
      assert.deepEqual(
        [...transformModifierTokens(src)].sort(),
        ['delta', 'target'], // 'dark' is universal, filtered out
      );
    });
  });

  describe('tag clustering', () => {
    test('flags an un-allow-listed singleton tag', () => {
      const errors = [];
      // 'overview' appears once here and is not in SINGLETON_TAGS.
      checkTagClustering([{ name: 'a', tags: ['overview', 'metric'] }, { name: 'b', tags: ['metric'] }], errors);
      assert.ok(errors.some((e) => /exactly one component/.test(e) && /overview/.test(e)), errors.join('\n'));
    });

    test('does not flag a singleton that is allow-listed', () => {
      const sole = [...SINGLETON_TAGS][0];
      const errors = [];
      // Pair every other used tag so only the allow-listed sole-use remains.
      checkTagClustering([{ name: 'a', tags: [sole, 'metric'] }, { name: 'b', tags: ['metric'] }], errors);
      assert.ok(!errors.some((e) => new RegExp(`exactly one[^]*\\b${sole}\\b`).test(e)), errors.join('\n'));
    });

    test('flags dead vocabulary (a term no component uses)', () => {
      const errors = [];
      checkTagClustering([{ name: 'a', tags: ['metric', 'percentage'] }, { name: 'b', tags: ['metric', 'percentage'] }], errors);
      assert.ok(errors.some((e) => /used by no component/.test(e)), errors.join('\n'));
    });

    test('the live tree clusters cleanly', () => {
      const { errors } = run();
      assert.ok(!errors.some((e) => /tag/.test(e)), errors.filter((e) => /tag/.test(e)).join('\n'));
    });
  });

  describe('guard runner', () => {
    test('the live tree has no accidental collisions', () => {
      const { errors } = run();
      assert.deepEqual(errors, [], errors.join('\n'));
    });

    test('reports sane counts', () => {
      const { counts } = run();
      assert.ok(counts.transformers > 0);
      assert.ok(counts.components > 0);
      assert.ok(counts.palettes > 0);
    });
  });
});
