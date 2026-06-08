/**
 * Presentation review heuristics — pure, browser-safe, fs-free (sibling to
 * lint-core). lint-core catches authoring *footguns* (things that render wrong);
 * this catches presentation *traps* (things that render fine but communicate
 * poorly), seeded from the canon — Minto, Knaflic, Duarte, Presentation Pitfalls,
 * Presentation Zen. Output is advisory **suggestions** (severity 'suggestion'),
 * never errors; the Architect surfaces them and the scorecard aggregates them.
 *
 * Deliberately CONSERVATIVE — a false "your title is weak" is worse than a miss,
 * so heuristics only fire on clear cases. `bucketOf(componentName)` classifies a
 * slide's component (chart/evidence/…); injected so this stays catalog-free.
 */

const CLASS_DIRECTIVE = /<!--\s*_class:\s*([^>]+?)\s*-->/;

// Bare label words/phrases that are a category, not a takeaway. Conservative.
const LABEL_WORDS = new Set([
  'overview', 'results', 'agenda', 'summary', 'background', 'introduction', 'intro',
  'conclusion', 'metrics', 'numbers', 'status', 'update', 'timeline', 'roadmap',
  'context', 'findings', 'data', 'analysis', 'recap', 'recommendations', 'next steps',
  'objectives', 'goals', 'the problem', 'the solution', 'approach', 'methodology',
  'methods', 'outcomes', 'impact', 'financials', 'discussion', 'our team', 'the ask',
]);
const ASK_RE = /\b(we\s+recommend|we\s+propose|we\s+ask|requesting|the\s+ask|approval|approve|sign[-\s]?off|green[-\s]?light)\b/i;

const ANCHORS_NO_TITLE_CHECK = new Set(['title', 'closing', 'divider', 'agenda', 'quote']);

function splitSlides(source) {
  return source.split(/^---$/m);
}
function classTokens(slide) {
  const m = slide.match(CLASS_DIRECTIVE);
  return m ? m[1].trim().split(/\s+/).filter(Boolean) : [];
}
function headingOf(slide) {
  const m = slide.match(/^##\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

/** Conservative: a heading is a "label" (not a takeaway) only on clear cases. */
function isLabelHeading(h) {
  if (!h) return false;
  const text = h.replace(/[*`_.:]/g, '').trim().toLowerCase();
  if (!text) return false;
  if (/\d/.test(text)) return false; // a number/% reads as a takeaway/metric
  if (LABEL_WORDS.has(text)) return true; // a known label word/phrase
  return text.split(/\s+/).length === 1; // a single bare word
}

function proseWordCount(slide) {
  return slide
    .replace(CLASS_DIRECTIVE, '')
    .replace(/^##?\s.*$/gm, '') // drop headings
    .replace(/[#>*`_[\]()|-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}
function topBulletCount(slide) {
  return slide.split('\n').filter((l) => /^([-*]|\d+\.)\s+\S/.test(l)).length;
}

/**
 * Review deck source. `opts.bucketOf(name)` → bucket string|null; `opts.talkMinutes`
 * (optional). Returns findings: { slide, rule, severity:'suggestion', message, fix }.
 */
function reviewText(source, opts = {}) {
  const bucketOf = opts.bucketOf || (() => null);
  const findings = [];
  const slides = splitSlides(source);
  let contentSlides = 0;
  let hasAsk = false;

  slides.forEach((slide, idx) => {
    if (idx === 0) return; // front matter
    if (!slide.trim()) return;
    contentSlides++;
    const tokens = classTokens(slide);
    const comp = tokens[0];
    const bucket = comp ? bucketOf(comp) : null;
    const h = headingOf(slide);
    if (ASK_RE.test(slide) || tokens.includes('decision')) hasAsk = true;

    // Label title (not a takeaway) — skip anchors/agenda/quote where it's fine.
    if (h && isLabelHeading(h) && !ANCHORS_NO_TITLE_CHECK.has(comp)) {
      findings.push({
        slide: idx, rule: 'label-title', severity: 'suggestion', classToken: comp,
        line: h,
        message: `"${h}" is a label, not a takeaway — say what the slide proves`,
        fix: 'Rewrite the heading as the message itself, e.g. "Revenue grew 18%, led by APAC".',
      });
    }

    // Data slide with no "so what" headline.
    if (bucket === 'chart' || bucket === 'evidence') {
      if (!h || isLabelHeading(h)) {
        findings.push({
          slide: idx, rule: 'chart-no-takeaway', severity: 'suggestion', classToken: comp,
          message: 'a data slide with no takeaway headline — state the "so what"',
          fix: 'Add an h2 that states the conclusion the data supports, not just its topic.',
        });
      }
    }

    // Wall of text / more than one idea per slide.
    if (proseWordCount(slide) > 70 || topBulletCount(slide) > 6) {
      findings.push({
        slide: idx, rule: 'wall-of-text', severity: 'suggestion', classToken: comp,
        message: 'a dense slide — one idea per slide reads better',
        fix: 'Split it or cut to the essential point; push the detail to speaker notes.',
      });
    }
  });

  // No clear ask (non-trivial decks only).
  if (contentSlides >= 4 && !hasAsk) {
    findings.push({
      slide: 0, rule: 'no-ask', severity: 'suggestion',
      message: 'no clear ask or recommendation — what should the audience do?',
      fix: 'Add a `decision` slide or a plain "we recommend…" line near the close.',
    });
  }

  // Length vs. time (only when a talk length is known).
  if (opts.talkMinutes && contentSlides > opts.talkMinutes) {
    findings.push({
      slide: 0, rule: 'length-vs-time', severity: 'suggestion',
      message: `${contentSlides} slides for ~${opts.talkMinutes} min — under a minute each; consider cutting`,
      fix: 'Aim for ~1–2 minutes per slide (Kawasaki 10/20/30).',
    });
  }

  return findings;
}

module.exports = { reviewText, isLabelHeading };
