/**
 * Unit: lib/authoring/fact-check-core.js — the pure, deterministic floor of deck
 * fact-checking (engineering/decisions/2026-06-16-deck-fact-checking.md).
 *
 * This layer LOCATES claims, triages their VERIFIABILITY, derives a provisional
 * freshness, and encodes the `needs_deeper` escalation rule — it never reaches a
 * verdict (that's the model layer). The tests lock the deterministic contract:
 * conservative extraction (signal-gated), the four verifiability classes with the
 * insider fail-safe, and the escalation derivation (including the two classes
 * deep research deliberately can't help — opinion and insider).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../../lib/authoring/fact-check-core');

const NOW = 2026; // pin the year so freshness/forward tests are deterministic

describe('fact-check-core: triageClaim', () => {
  const ext = (t) => core.triageClaim(t, { now: NOW });

  test('a public-company figure is external', () => {
    assert.equal(ext('Microsoft FY24 revenue was $245B').class, 'external');
  });

  test('puffery with no figure is opinion', () => {
    const r = ext('A best-in-class, world-class, seamless platform');
    assert.equal(r.class, 'opinion');
    assert.equal(r.basis, 'puffery');
  });

  test('puffery riding alongside a hard figure is NOT opinion', () => {
    // The boast is editorial, but "99.9% uptime" is a checkable number.
    assert.notEqual(ext('Best-in-class platform with 99.9% uptime').class, 'opinion');
  });

  test("first-person metric is insider (the deck's own number)", () => {
    const r = ext('Our NPS reached 72 this quarter');
    assert.equal(r.class, 'insider');
    assert.equal(r.basis, 'first-person subject');
  });

  test('a first-person line citing a NAMED external source stays external', () => {
    assert.equal(ext('We grew with the market, up 18% per Gartner').class, 'external');
  });

  test('a first-person line citing its OWN source stays insider (no laundering)', () => {
    // "study" is a generic word, not a named external source — the deck's own
    // number must not be flipped to externally-verifiable. ADR §1/§8 fail-safe.
    assert.equal(ext('Our NPS is 72%, per our internal study').class, 'insider');
  });

  test('forward-looking language is forward', () => {
    assert.equal(ext('The platform will reach 1M users').class, 'forward');
  });

  test('a future-dated claim is forward even without forward verbs', () => {
    const r = ext('Revenue of $50M in 2030');
    assert.equal(r.class, 'forward');
    assert.equal(r.basis, 'future-dated');
  });

  test('forward guidance about ourselves is insider, not forward (insider wins)', () => {
    // The author's own forecast is doubly unverifiable; insider is the safe call.
    assert.equal(ext('We will hit $10M ARR by 2028').class, 'insider');
  });

  test('a past-dated third-party fact is external', () => {
    assert.equal(ext('The EU AI Act entered into force in 2024').class, 'external');
  });
});

describe('fact-check-core: highStakesFigure', () => {
  test('currency amount is high-stakes', () => {
    assert.equal(core.highStakesFigure('$245B in revenue'), true);
  });
  test('ASCII growth multiplier is high-stakes', () => {
    assert.equal(core.highStakesFigure('4.2x growth'), true);
  });
  test('Unicode × multiplier is high-stakes (the \\b footgun)', () => {
    // "3× growth": × is non-word, so a trailing \b would never match it.
    assert.equal(core.highStakesFigure('Revenue grew 3× this year'), true);
  });
  test('a plain percentage is not, by itself, high-stakes', () => {
    assert.equal(core.highStakesFigure('engagement up 12%'), false);
  });
});

describe('fact-check-core: signal detection edge cases (the \\b / < footguns)', () => {
  test('a decimal multiplier 4.2x is a stat', () => {
    assert.equal(core.detectSignals('Revenue grew 4.2x').stat, true);
  });
  test('a digit-abutting unit 120bps is a stat', () => {
    assert.equal(core.detectSignals('spreads widened 120bps').stat, true);
  });
  test('#1 ranking is detected even after a space', () => {
    assert.equal(core.detectSignals('We are #1 in the category').ranking, true);
  });
});

describe('fact-check-core: extractAsOf / provisionalStaleness', () => {
  test('picks the latest year mentioned', () => {
    assert.equal(core.extractAsOf('grew from 2019 to 2023'), 2023);
  });
  test('undated claim has no as_of and null staleness', () => {
    assert.equal(core.extractAsOf('the market is large'), null);
    assert.equal(core.provisionalStaleness(null, NOW), null);
  });
  test('current/last year → low, mid-age → med, old → high', () => {
    assert.equal(core.provisionalStaleness(2025, NOW), 'low');
    assert.equal(core.provisionalStaleness(2023, NOW), 'med');
    assert.equal(core.provisionalStaleness(2018, NOW), 'high');
  });
});

describe('fact-check-core: needsDeeper (the escalation rule)', () => {
  test('opinion is never escalated — nothing factual to check', () => {
    assert.equal(core.needsDeeper({ class: 'opinion' }).flag, false);
  });

  test('insider is never escalated — no external record exists', () => {
    // The honesty point: deep web research can't confirm the author's own number.
    const r = core.needsDeeper({ class: 'insider' });
    assert.equal(r.flag, false);
    assert.match(r.reason, /confirm your own source/);
  });

  test('forward is always escalated (only the source is checkable)', () => {
    assert.equal(core.needsDeeper({ class: 'forward' }).flag, true);
  });

  test('an unverified external claim needs deeper by default', () => {
    assert.equal(core.needsDeeper({ class: 'external', verdict_conf: null }).flag, true);
  });

  test('low verdict-confidence escalates', () => {
    assert.equal(core.needsDeeper({ class: 'external', verdict_conf: 0.4 }, { tau: 0.7 }).flag, true);
  });

  test('high confidence + fresh + low-stakes does NOT escalate', () => {
    const r = core.needsDeeper({
      class: 'external', verdict_conf: 0.95, staleness_risk: 'low', high_stakes: false,
    });
    assert.equal(r.flag, false);
  });

  test('high confidence but high staleness still escalates', () => {
    assert.equal(core.needsDeeper({
      class: 'external', verdict_conf: 0.95, staleness_risk: 'high',
    }).flag, true);
  });

  test('high confidence but a high-stakes figure still escalates', () => {
    assert.equal(core.needsDeeper({
      class: 'external', verdict_conf: 0.95, staleness_risk: 'low', high_stakes: true,
    }).flag, true);
  });
});

describe('fact-check-core: extractClaims (conservative, signal-gated)', () => {
  const deck = [
    '---',
    'marp: true',
    '---',
    '',
    '<!-- _class: stats -->',
    '## Revenue grew 18% in 2024, led by APAC',
    '',
    '1. 73%',
    '   - faster close',
    '- Our internal pilot hit 92 NPS',
    '',
    '---',
    '',
    '<!-- _class: statement -->',
    '## Our journey so far',
    '',
    '> We are the first to ship this in 2019',
    '',
    'A seamless, world-class experience.',
    '',
    '```',
    '// 42 should be ignored inside a fence',
    '```',
  ].join('\n');

  const claims = core.extractClaims(deck);

  test('skips front matter; slide numbers are human 1-based', () => {
    assert.ok(claims.every((c) => c.slide >= 1));
    assert.ok(claims.some((c) => c.slide === 1));
    assert.ok(claims.some((c) => c.slide === 2));
  });

  test('extracts the stat heading and tags its signals', () => {
    const h = claims.find((c) => c.kind === 'heading' && /Revenue grew/.test(c.text));
    assert.ok(h, 'stat heading extracted');
    assert.equal(h.signals.stat, true);
    assert.equal(h.signals.year, true);
    assert.equal(h.component, 'stats');
  });

  test('extracts a blockquote even with no number (a quote is checkable)', () => {
    assert.ok(claims.some((c) => c.kind === 'quote' && /first to ship/.test(c.text)));
  });

  test('skips signal-free prose and headings', () => {
    assert.ok(!claims.some((c) => /journey so far/.test(c.text)));
    assert.ok(!claims.some((c) => /seamless, world-class experience/.test(c.text)));
  });

  test('ignores numbers inside a code fence', () => {
    assert.ok(!claims.some((c) => /should be ignored/.test(c.text)));
  });

  test('strips list markers and a trailing inline-code pill', () => {
    // "1. 73%" → text "73%" (marker stripped); the pill case is covered by cleanInline.
    assert.ok(claims.some((c) => c.text === '73%'));
  });
});

describe('fact-check-core: cleanInline', () => {
  test('keeps link text and unwraps inline code (keeps the value)', () => {
    assert.equal(core.cleanInline('**Revenue** up [18%](src) `FY24`'), 'Revenue up 18% FY24');
  });
  test('a figure that lives in a code pill survives', () => {
    // The H1 regression: dropping a trailing pill erased the only signal.
    assert.equal(core.cleanInline('Revenue `$5M`'), 'Revenue $5M');
  });
});

describe('fact-check-core: a figure inside a code pill is still a claim', () => {
  const claims = core.extractClaims('<!-- _class: stats -->\n- Revenue `$5M` last year');
  test('the pill-value line is extracted (not dropped)', () => {
    assert.ok(claims.some((c) => c.signals.money && /\$5M/.test(c.text)));
  });
});

describe('fact-check-core: a bare < before a digit is a claim, not markup', () => {
  const claims = core.extractClaims('<!-- _class: stats -->\n- <5% of users churned');
  test('"<5% …" is extracted', () => {
    assert.ok(claims.some((c) => /5% of users churned/.test(c.text)));
  });
});

describe('fact-check-core: factCheckSource (end-to-end floor)', () => {
  const deck = [
    '<!-- _class: stats -->',
    '## Microsoft FY24 revenue was $245B',
    '- Our churn fell to 4.2% in 2024',
    '- We will reach $10M ARR by 2028',
  ].join('\n');
  const records = core.factCheckSource(deck, { now: NOW });

  test('produces one record per extracted claim, with no verdict', () => {
    assert.ok(records.length >= 3);
    assert.ok(records.every((r) => r.verdict === null && r.verdict_conf === null));
    assert.ok(records.every((r) => Array.isArray(r.sources) && r.sources.length === 0));
  });

  test('records carry class, basis, high_stakes, and a derived needs_deeper', () => {
    const msft = records.find((r) => /Microsoft/.test(r.claim));
    assert.equal(msft.class, 'external');
    assert.equal(msft.high_stakes, true);
    assert.equal(msft.needs_deeper.flag, true); // unverified external

    const churn = records.find((r) => /churn/.test(r.claim));
    assert.equal(churn.class, 'insider'); // "Our churn …" — the deck's own metric
    assert.equal(churn.needs_deeper.flag, false); // insider — not escalated

    const arr = records.find((r) => /ARR/.test(r.claim));
    assert.equal(arr.class, 'insider'); // our own forward guidance → insider
  });

  test('overrides let the model layer supply a verdict', () => {
    const [r] = core.factCheckSource('## Apple shipped the iPhone in 2007', {
      now: NOW,
      overrides: { verdict: 'supported', verdict_conf: 0.98, staleness_risk: 'low' },
    });
    assert.equal(r.verdict, 'supported');
    assert.equal(r.needs_deeper.flag, false); // high conf, fresh, low-stakes
  });
});
