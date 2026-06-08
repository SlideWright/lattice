/**
 * Deck scorecard — pure aggregation of the deterministic signals (lint-core
 * footguns + review-core suggestions + structural facts) into five category
 * scores and an overall grade. No model: the numbers are grounded in the
 * findings; Phase 2 layers a qualitative summary on top. Browser-safe, fs-free.
 *
 * Categories: Structure · Clarity · Data · Pacing · Contract.
 */

const CLASS_DIRECTIVE = /<!--\s*_class:\s*([^>]+?)\s*-->/;

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const band = (n) =>
  n >= 93 ? 'A' : n >= 85 ? 'A−' : n >= 78 ? 'B+' : n >= 70 ? 'B' : n >= 62 ? 'C+' : n >= 55 ? 'C' : n >= 45 ? 'D' : 'F';

/**
 * @param {object} o
 * @param {string} o.source            deck markdown
 * @param {Array}  o.lintFindings      from lint-core (errors/warnings)
 * @param {Array}  o.reviewFindings    from review-core (suggestions)
 * Returns { overall, band, categories:[{ key, label, score, notes:[] }] }.
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
  const contentSlides = slides.filter((s, i) => i > 0 && s.trim()).length;
  const countRule = (arr, rule) => arr.filter((f) => f.rule === rule).length;

  // ── Structure ──
  let structure = 100;
  const sNotes = [];
  if (!has('title')) { structure -= 25; sNotes.push('no opening / title slide'); }
  if (contentSlides >= 3 && !has('closing')) { structure -= 15; sNotes.push('no closing slide'); }
  if (contentSlides >= 4 && countRule(review, 'no-ask')) { structure -= 22; sNotes.push('no clear ask'); }

  // ── Clarity ──
  let clarity = 100;
  const cNotes = [];
  const labels = countRule(review, 'label-title');
  const walls = countRule(review, 'wall-of-text');
  clarity -= labels * 12 + walls * 12;
  if (labels) cNotes.push(`${labels} label title${labels > 1 ? 's' : ''}`);
  if (walls) cNotes.push(`${walls} dense slide${walls > 1 ? 's' : ''}`);

  // ── Data ──
  let data = 100;
  const dNotes = [];
  const charts = countRule(review, 'chart-no-takeaway');
  data -= charts * 20;
  if (charts) dNotes.push(`${charts} data slide${charts > 1 ? 's' : ''} without a takeaway`);

  // ── Pacing ──
  let pacing = 100;
  const pNotes = [];
  if (countRule(review, 'length-vs-time')) { pacing -= 28; pNotes.push('too many slides for the time'); }

  // ── Contract (lint footguns) ──
  let contract = 100;
  const conNotes = [];
  const errs = lint.filter((f) => f.severity === 'error').length;
  const warns = lint.filter((f) => f.severity === 'warning').length;
  contract -= errs * 22 + warns * 8;
  if (errs) conNotes.push(`${errs} authoring error${errs > 1 ? 's' : ''}`);
  if (warns) conNotes.push(`${warns} warning${warns > 1 ? 's' : ''}`);

  const categories = [
    { key: 'structure', label: 'Structure', score: clamp(structure), notes: sNotes },
    { key: 'clarity', label: 'Clarity', score: clamp(clarity), notes: cNotes },
    { key: 'data', label: 'Data', score: clamp(data), notes: dNotes },
    { key: 'pacing', label: 'Pacing', score: clamp(pacing), notes: pNotes },
    { key: 'contract', label: 'Contract', score: clamp(contract), notes: conNotes },
  ];

  // Weighted overall — clarity + contract matter most.
  const weights = { structure: 1, clarity: 1.2, data: 0.8, pacing: 0.8, contract: 1.2 };
  let tot = 0;
  let wsum = 0;
  for (const c of categories) { tot += c.score * weights[c.key]; wsum += weights[c.key]; }
  const overall = clamp(tot / wsum);

  return { overall, band: band(overall), categories };
}

module.exports = { scoreDeck };
