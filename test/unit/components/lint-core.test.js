/**
 * Unit: lib/authoring/lint-core.js — the pure, browser-safe lint engine.
 *
 * lint-core is the SINGLE SOURCE shared by the Node CLI (via lib/authoring/
 * lint.js), lib/components/index.js's validate(), and the Drawing Board's
 * in-browser Architect panel. lint-deck.test.js covers it indirectly through
 * the Node binding; this exercises the pure API directly (lintTextWith with a
 * hand-built vocab, the detector helpers, isKnownModifier) so the contract the
 * browser depends on is locked independently of the manifests.
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../../lib/authoring/lint-core');

const FM = '---\nmarp: true\ntheme: indaco\n---\n\n';
// A fixed, manifest-independent vocab — every component name used below so the
// unknown-class rule (rule 1) doesn't add noise to the targeted assertions.
const vocab = {
  names: new Set(['cards-grid', 'principles', 'split-panel', 'split-compare', 'kpi']),
  modifiers: new Set(['dark', 'compact', 'pullquote', 'metric']),
};
const ruleFor = (src, rule) => core.lintTextWith(src, vocab).find((f) => f.rule === rule);

describe('lint-core: detector helpers', () => {
  test('findInlineTitleBodyLine catches "- **Title.** body", null when clean', () => {
    assert.equal(core.findInlineTitleBodyLine('- **First.** body here'), '- **First.** body here');
    assert.equal(core.findInlineTitleBodyLine('- First\n  - body here'), null);
  });
  test('findBoldOrderedStatement catches bold in an ordered item', () => {
    assert.equal(core.findBoldOrderedStatement('1. a **bold** span'), '1. a **bold** span');
    assert.equal(core.findBoldOrderedStatement('1. a plain statement'), null);
  });
  test('findSplitBodylessItem catches a top-level item with no nested body', () => {
    assert.equal(core.findSplitBodylessItem('- Title. body'), '- Title. body');
    assert.equal(core.findSplitBodylessItem('- Title\n  - body'), null);
  });
  test('findOrderedInlineTitleBodyLine catches "1. **Title.** body", null when clean', () => {
    assert.equal(core.findOrderedInlineTitleBodyLine('1. **Claim.** body here'), '1. **Claim.** body here');
    assert.equal(core.findOrderedInlineTitleBodyLine('1. Claim\n   - body here'), null);
    assert.equal(core.findOrderedInlineTitleBodyLine('1. 94%'), null); // bare number, no trailing body
  });
});

describe('lint-core: isKnownModifier', () => {
  test('set membership and prefix families are known; gibberish is not', () => {
    assert.equal(core.isKnownModifier('dark', vocab), true);
    assert.equal(core.isKnownModifier('tint-corner', vocab), true); // prefix family
    assert.equal(core.isKnownModifier('mark-orbit', vocab), true);
    assert.equal(core.isKnownModifier('wobble', vocab), false);
  });
});

describe('lint-core: lintTextWith rules', () => {
  test('returns an array and skips front matter (slide 0)', () => {
    const out = core.lintTextWith(`${FM}<!-- _class: cards-grid -->\n\n## H\n\n- A\n  - b\n`, vocab);
    assert.ok(Array.isArray(out));
    assert.equal(out.length, 0);
  });

  test('rule 1 — unknown class token is flagged (warning)', () => {
    const f = ruleFor(`${FM}<!-- _class: cards-gridd -->\n\n## H\n\n- A\n  - b\n`, 'unknown-class');
    assert.ok(f);
    assert.equal(f.severity, 'warning');
    assert.equal(f.classToken, 'cards-gridd');
  });

  test('rule 1 — known name + known modifier produce no unknown-class', () => {
    assert.equal(ruleFor(`${FM}<!-- _class: cards-grid dark compact -->\n\n## H\n\n- A\n  - b\n`, 'unknown-class'), undefined);
  });

  test('rule 2 — card-style inline title+body is an error', () => {
    const f = ruleFor(`${FM}<!-- _class: cards-grid -->\n\n## H\n\n- **First.** inline body\n`, 'card-style-inline-title');
    assert.ok(f);
    assert.equal(f.severity, 'error');
    assert.equal(f.classToken, 'cards-grid');
  });

  test('rule 2 — card-style ORDERED inline title+body is also an error', () => {
    const f = ruleFor(`${FM}<!-- _class: cards-grid -->\n\n## H\n\n1. **Claim.** inline body\n`, 'card-style-inline-title');
    assert.ok(f, 'ordered `1. **Title.** body` on a card-style layout must be flagged');
    assert.equal(f.severity, 'error');
  });

  test('rule 2b — unordered inline title+body on a ledger/numbered layout is an error', () => {
    const f = ruleFor(`${FM}<!-- _class: kpi -->\n\n## H\n\n- **Platform licensing.** $1.2M — 3-year commitment.\n`, 'ledger-inline-title');
    assert.ok(f, 'ledger layouts want a numbered list, not an unordered bold lead-in');
    assert.equal(f.severity, 'error');
    assert.equal(f.classToken, 'kpi');
  });

  test('rule 2b — a correctly authored numbered ledger slide is clean', () => {
    assert.equal(ruleFor(`${FM}<!-- _class: kpi -->\n\n## H\n\n1. 94%\n   - label\n`, 'ledger-inline-title'), undefined);
  });

  test('rule 3 — bold in an ordered statement (principles) is an error', () => {
    const f = ruleFor(`${FM}<!-- _class: principles -->\n\n1. a **bold** span\n`, 'statement-ol-bold');
    assert.ok(f);
    assert.equal(f.severity, 'error');
  });

  test('rule 4 — split right-panel item with no nested body is an error', () => {
    const f = ruleFor(`${FM}<!-- _class: split-panel -->\n\n## Head\n\n- Title. body\n`, 'split-bodyless-item');
    assert.ok(f);
    assert.equal(f.severity, 'error');
  });

  test('rule 5 — h2-anchored split slide with no "## " headline is a warning', () => {
    const f = ruleFor(`${FM}<!-- _class: split-panel -->\n\n- Title\n  - body\n`, 'split-missing-headline');
    assert.ok(f);
    assert.equal(f.severity, 'warning');
  });

  test('rule 6 — split-statement with no blockquote is a warning', () => {
    const f = ruleFor(`${FM}<!-- _class: split-panel pullquote -->\n\n## Head\n\n- Title\n  - body\n`, 'split-statement-missing-quote');
    assert.ok(f);
    assert.equal(f.severity, 'warning');
  });

  test('rule 7 — split-compare without exactly two options is a warning', () => {
    const f = ruleFor(`${FM}<!-- _class: split-compare -->\n\n## Head\n\n- A\n  - x\n- B\n  - y\n- C\n  - z\n`, 'split-compare-option-count');
    assert.ok(f);
    assert.equal(f.severity, 'warning');
  });

  test('rule 8 — kpi number item with no nested label is a warning', () => {
    const f = ruleFor(`${FM}<!-- _class: kpi -->\n\n1. 73%\n`, 'number-slot-bodyless-item');
    assert.ok(f);
    assert.equal(f.severity, 'warning');
  });

  test('a clean card-style deck yields no findings', () => {
    assert.equal(core.lintTextWith(`${FM}<!-- _class: cards-grid -->\n\n## H\n\n- First\n  - body\n- Second\n  - body\n`, vocab).length, 0);
  });
});

describe('lint-core: auto-fix', () => {
  test('autofixNestedTitle converts the bold inline shape; null otherwise', () => {
    assert.equal(core.autofixNestedTitle('- **Title.** body here'), '- Title\n  - body here');
    assert.equal(core.autofixNestedTitle('* **A** b'), '* A\n  * b');
    assert.equal(core.autofixNestedTitle('- bare title'), null); // nothing to split
    assert.equal(core.autofixNestedTitle('- Title. body'), null); // non-bold = ambiguous, not auto-fixed
  });

  test('card-style inline-title findings are flagged autofixable', () => {
    const f = ruleFor(`${FM}<!-- _class: cards-grid -->\n\n## H\n\n- **First.** inline body\n`, 'card-style-inline-title');
    assert.equal(f.autofixable, true);
  });

  test('applyFix rewrites the offending line in place, and the result re-lints clean', () => {
    const src = `${FM}<!-- _class: cards-grid -->\n\n## H\n\n- **First.** inline body\n`;
    const f = ruleFor(src, 'card-style-inline-title');
    const fixed = core.applyFix(src, f);
    assert.ok(fixed.includes('- First\n  - inline body'));
    assert.equal(core.lintTextWith(fixed, vocab).some((x) => x.rule === 'card-style-inline-title'), false);
  });

  test('applyFix targets the finding\'s own slide, not an identical line elsewhere', () => {
    const bad = '<!-- _class: cards-grid -->\n\n- **Dup.** body\n';
    const src = `${FM}${bad}---\n${bad}`;
    const findings = core.lintTextWith(src, vocab).filter((x) => x.rule === 'card-style-inline-title');
    assert.equal(findings.length, 2);
    const fixed = core.applyFix(src, findings[1]); // fix the SECOND slide only
    assert.equal(core.lintTextWith(fixed, vocab).filter((x) => x.rule === 'card-style-inline-title').length, 1);
  });

  test('applyFix returns null for a non-autofixable finding', () => {
    const f = ruleFor(`${FM}<!-- _class: split-panel pullquote -->\n\n## Head\n\n- Title\n  - body\n`, 'split-statement-missing-quote');
    assert.equal(core.applyFix('x', f), null);
  });
});

describe('lint-core: focus directive grammar (rule 11)', () => {
  const slide = (dirs) => `${FM}<!-- _class: cards-grid -->\n${dirs}\n\n## Head\n\n- A\n  - a\n- B\n  - b\n`;
  test('valid _focus specs pass clean', () => {
    for (const spec of ['row 4', 'item 3', 'col 5', 'cell 4,5', 'line 3-4', 'row 2, row 5', 'item 2-4']) {
      assert.equal(ruleFor(slide(`<!-- _focus: ${spec} -->`), 'focus-spec'), undefined, spec);
    }
  });
  test('unknown axis is flagged', () => {
    assert.match(ruleFor(slide('<!-- _focus: rows 4 -->'), 'focus-spec').message, /not a focus axis/);
  });
  test('malformed cell is flagged', () => {
    assert.match(ruleFor(slide('<!-- _focus: cell 4 -->'), 'focus-spec').message, /R,C/);
  });
  test('non-numeric ordinal is flagged', () => {
    assert.match(ruleFor(slide('<!-- _focus: row abc -->'), 'focus-spec').message, /ordinal/);
  });
  test('unknown _focusStyle is flagged, valid ones pass', () => {
    assert.match(ruleFor(slide('<!-- _focusStyle: glow -->'), 'focus-style').message, /spotlight \| ring \| list-fill/);
    for (const s of ['spotlight', 'ring', 'list-fill', 'blur', 'pop']) {
      assert.equal(ruleFor(slide(`<!-- _focusStyle: ${s} -->`), 'focus-style'), undefined, s);
    }
  });
  test('malformed _focusSteps step is flagged', () => {
    assert.match(ruleFor(slide('<!-- _focusSteps: item 1 | rows 2 -->'), 'focus-steps').message, /not a focus axis/);
    assert.equal(ruleFor(slide('<!-- _focusSteps: item 1 | item 2 -->'), 'focus-steps'), undefined);
  });
});
