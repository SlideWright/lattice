/**
 * Deck scorecard — pure aggregation of the deterministic signals (lint-core
 * footguns + review-core suggestions + structural facts) into five category
 * scores and an overall grade. No model: the numbers are grounded in the
 * findings; Phase 2 layers a qualitative summary on top. Browser-safe, fs-free.
 *
 * Categories: Structure · Clarity · Data · Pacing · Contract.
 *
 * NOTE on what the grade means: it measures the ABSENCE of detected problems,
 * not the presence of brilliance — a clean deck can still be dull. Categories
 * with nothing to score (Data on a deck with no data slides) are marked `na`
 * and excluded from the overall, so a text-only deck isn't handed a free A.
 */

const CLASS_DIRECTIVE = /<!--\s*_class:\s*([^>]+?)\s*-->/;

// Layouts whose substance is data (chart + evidence buckets, plus the solo
// hero metric). Used only to decide whether Data is a scorable category — if a
// deck has none of these, Data is N/A rather than a free 100.
const DATA_LAYOUTS = new Set([
  'funnel', 'gantt', 'kanban', 'kpi', 'map', 'piechart', 'progress', 'quadrant',
  'radar', 'state-chart', 'stats', 'timeline-list', 'word-cloud', 'big-number',
]);

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const band = (n) =>
  n >= 93 ? 'A' : n >= 85 ? 'A−' : n >= 78 ? 'B+' : n >= 70 ? 'B' : n >= 62 ? 'C+' : n >= 55 ? 'C' : n >= 45 ? 'D' : 'F';
const plural = (n) => (n > 1 ? 's' : '');

/**
 * @param {object} o
 * @param {string} o.source            deck markdown
 * @param {Array}  o.lintFindings      from lint-core (errors/warnings)
 * @param {Array}  o.reviewFindings    from review-core (suggestions)
 * Returns { overall, band, categories:[{ key, label, score, na?, notes:[] }] }.
 */
function scoreDeck(o = {}) {
  const source = o.source || '';
  const lint = o.lintFindings || [];
  const review = o.reviewFindings || [];
  const slides = source.split(/^---$/m);
  const tokensPer = slides.map((s) => {
    const m = s.match(CLASS_DIRECTIVE);
    return m ? m[1].trim().split(/\s+/).filter(Boolean) : [];
  });
  const has = (name) => tokensPer.some((t) => t.includes(name));
  // Skip the front-matter chunks ("" + the YAML) when counting content slides,
  // so the count drives the structural thresholds honestly.
  const start = /^\s*---\s*\r?\n/.test(source) ? 2 : 0;
  const contentSlides = slides.filter((s, i) => i >= start && s.trim()).length;
  const hasDataSlide = tokensPer.some((t) => DATA_LAYOUTS.has(t[0]));
  const countRule = (arr, rule) => arr.filter((f) => f.rule === rule).length;

  // ── Structure ──
  let structure = 100;
  const sNotes = [];
  if (!has('title')) { structure -= 25; sNotes.push('no opening / title slide'); }
  if (contentSlides >= 3 && !has('closing')) { structure -= 15; sNotes.push('no closing slide'); }
  if (contentSlides >= 4 && countRule(review, 'no-ask')) { structure -= 22; sNotes.push('no clear ask'); }
  const stubs = countRule(review, 'stub-slide');
  const dups = countRule(review, 'duplicate-heading');
  const agendaMiss = countRule(review, 'agenda-missing');
  structure -= stubs * 8 + dups * 8 + agendaMiss * 10;
  if (stubs) sNotes.push(`${stubs} stub slide${plural(stubs)}`);
  if (dups) sNotes.push(`${dups} duplicate heading${plural(dups)}`);
  if (agendaMiss) sNotes.push('no agenda on a long deck');

  // ── Clarity ──
  let clarity = 100;
  const cNotes = [];
  const labels = countRule(review, 'label-title');
  const walls = countRule(review, 'wall-of-text');
  const longH = countRule(review, 'long-heading');
  const monotone = countRule(review, 'monotone-openings');
  const poss = countRule(review, 'possessive-stacking');
  const noAlt = countRule(review, 'image-no-alt');
  clarity -= labels * 12 + walls * 12 + longH * 6 + monotone * 12 + poss * 5 + noAlt * 5;
  if (labels) cNotes.push(`${labels} label title${plural(labels)}`);
  if (walls) cNotes.push(`${walls} dense slide${plural(walls)}`);
  if (longH) cNotes.push(`${longH} over-long heading${plural(longH)}`);
  if (monotone) cNotes.push('monotone heading cadence');
  if (poss) cNotes.push(`${poss} hard-to-read line${plural(poss)}`);
  if (noAlt) cNotes.push(`${noAlt} image${plural(noAlt)} missing alt text`);

  // ── Data ── (N/A when the deck has no data slides — don't gift a free A)
  let data = 100;
  const dNotes = [];
  const charts = countRule(review, 'chart-no-takeaway');
  const metricRef = countRule(review, 'metric-no-referent');
  data -= charts * 20 + metricRef * 15;
  if (charts) dNotes.push(`${charts} data slide${plural(charts)} without a takeaway`);
  if (metricRef) dNotes.push(`${metricRef} hero number${plural(metricRef)} without a referent`);

  // ── Pacing ── (soft default once a deck is very long, even with no talk length)
  let pacing = 100;
  const pNotes = [];
  if (countRule(review, 'length-vs-time')) {
    pacing -= 28;
    pNotes.push('too many slides for the time');
  } else if (contentSlides > 40) {
    pacing -= 20;
    pNotes.push(`${contentSlides} slides — very long for one sitting`);
  }

  // ── Contract (lint footguns) ──
  let contract = 100;
  const conNotes = [];
  const errs = lint.filter((f) => f.severity === 'error').length;
  const warns = lint.filter((f) => f.severity === 'warning').length;
  contract -= errs * 22 + warns * 8;
  if (errs) conNotes.push(`${errs} authoring error${plural(errs)}`);
  if (warns) conNotes.push(`${warns} warning${plural(warns)}`);

  const categories = [
    { key: 'structure', label: 'Structure', score: clamp(structure), notes: sNotes },
    { key: 'clarity', label: 'Clarity', score: clamp(clarity), notes: cNotes },
    hasDataSlide
      ? { key: 'data', label: 'Data', score: clamp(data), notes: dNotes }
      : { key: 'data', label: 'Data', score: null, na: true, notes: ['no data slides — not scored'] },
    { key: 'pacing', label: 'Pacing', score: clamp(pacing), notes: pNotes },
    { key: 'contract', label: 'Contract', score: clamp(contract), notes: conNotes },
  ];

  // Weighted overall — clarity + contract matter most; N/A categories drop out.
  const weights = { structure: 1, clarity: 1.2, data: 0.8, pacing: 0.8, contract: 1.2 };
  let tot = 0;
  let wsum = 0;
  for (const c of categories) {
    if (c.na) continue;
    tot += c.score * weights[c.key];
    wsum += weights[c.key];
  }
  const overall = clamp(wsum ? tot / wsum : 100);

  return { overall, band: band(overall), categories };
}

module.exports = { scoreDeck };
