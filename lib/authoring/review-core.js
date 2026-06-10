/**
 * Presentation review heuristics — pure, browser-safe, fs-free (sibling to
 * lint-core). lint-core catches authoring *footguns* (things that render wrong);
 * this catches presentation *traps* (things that render fine but communicate
 * poorly), seeded from the canon — Minto, Knaflic, Duarte, Presentation Pitfalls,
 * Presentation Zen — AND the project's own `design/editorial.md` (cadence
 * variation, speak-first / possessive stacking). Output is advisory
 * **suggestions** (severity 'suggestion'), never errors; the Architect surfaces
 * them and the scorecard aggregates them.
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
// Layouts where a heading with no body is legitimate (anchors / section breaks),
// so the stub-slide check doesn't fire on them.
const HEADING_ONLY_OK = new Set(['title', 'closing', 'divider', 'agenda', 'quote', 'section']);
// Words/marks that give a hero number a referent — a baseline, a direction, a
// comparison. A number without one of these is a boast, not a claim (Duarte).
const REFERENT_RE = /\b(vs\.?|versus|from|up|down|grew|fell|rose|dropped|increased?|decreased?|than|prior|baseline|target|yoy|qoq|mom|compared|over|under|above|below|year[-\s]?over[-\s]?year)\b|[%×]|\bpp\b|\b\d+x\b/i;

function splitSlides(source) {
  return source.split(/^---$/m);
}
// Chunk index of the first real slide. `split(/^---$/m)` on a deck that opens
// with a `---` front-matter fence yields ["" , <yaml>, slide1, …], so the first
// two chunks are front matter; without a fence the first chunk IS slide one.
// (Keeping finding.slide as the raw chunk index keeps the editor "Reveal"
// line-mapping — which counts every `---` — in sync.)
function firstSlideIndex(source) {
  return /^\s*---\s*\r?\n/.test(source) ? 2 : 0;
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
function wordCount(s) {
  return String(s || '').trim().split(/\s+/).filter(Boolean).length;
}
// Does the slide carry any renderable body beyond the heading + class directive?
function hasBody(slide) {
  if (proseWordCount(slide) > 0) return true;
  if (topBulletCount(slide) > 0) return true;
  return /(^|\n)\s*(>|```|~~~|\$\$|!\[)/.test(slide); // quote / fence / math / image
}
// First two words of a heading, normalized — the cadence signature.
function headingOpening(h) {
  return String(h || '').replace(/[*`_]/g, '').trim().toLowerCase().split(/\s+/).slice(0, 2).join(' ');
}

/**
 * Review deck source. `opts.bucketOf(name)` → bucket string|null; `opts.talkMinutes`
 * (optional). Returns findings: { slide, rule, severity:'suggestion', message, fix }.
 */
function reviewText(source, opts = {}) {
  const bucketOf = opts.bucketOf || (() => null);
  const findings = [];
  const slides = splitSlides(source);
  const start = firstSlideIndex(source);
  let contentSlides = 0;
  let hasAsk = false;
  let hasAgenda = false;
  const headings = []; // { idx, norm, text }
  const openings = []; // { idx, open }

  slides.forEach((slide, idx) => {
    if (idx < start) return; // front matter (or the pre-fence empty chunk)
    if (!slide.trim()) return;
    contentSlides++;
    const tokens = classTokens(slide);
    const comp = tokens[0];
    const bucket = comp ? bucketOf(comp) : null;
    const h = headingOf(slide);
    if (ASK_RE.test(slide) || tokens.includes('decision')) hasAsk = true;
    if (comp === 'agenda' || (h && /^(agenda|contents|table of contents)$/i.test(h.trim()))) hasAgenda = true;

    // Label title (not a takeaway) — skip anchors/agenda/quote where it's fine.
    if (h && isLabelHeading(h) && !ANCHORS_NO_TITLE_CHECK.has(comp)) {
      findings.push({
        slide: idx, rule: 'label-title', severity: 'suggestion', classToken: comp, line: h,
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

    // Over-long heading — a takeaway should land in one tight line.
    if (h && !ANCHORS_NO_TITLE_CHECK.has(comp) && wordCount(h) > 14) {
      findings.push({
        slide: idx, rule: 'long-heading', severity: 'suggestion', classToken: comp, line: h,
        message: `a ${wordCount(h)}-word heading — a takeaway should fit one tight line`,
        fix: 'Trim to a single assertion; push qualifiers and caveats to the body.',
      });
    }

    // Stub slide — a heading with no body on a layout that needs content.
    if (h && comp && !HEADING_ONLY_OK.has(comp) && !hasBody(slide)) {
      findings.push({
        slide: idx, rule: 'stub-slide', severity: 'suggestion', classToken: comp,
        message: 'a heading with no body — the slide is a stub',
        fix: 'Add the supporting content, or use a divider/section break if a bare heading is the intent.',
      });
    }

    // Hero number with no referent — a number needs a comparison to mean anything.
    if (comp === 'big-number' && !REFERENT_RE.test(slide)) {
      findings.push({
        slide: idx, rule: 'metric-no-referent', severity: 'suggestion', classToken: comp,
        message: 'a hero number with no referent — a number alone is a boast, not a claim',
        fix: 'Add the baseline, direction, or target (e.g. "up from 61%", "vs the 3-week goal").',
      });
    }

    // Image with empty alt text — invisible to screen readers and search.
    if (/!\[\s*\]\(/.test(slide)) {
      findings.push({
        slide: idx, rule: 'image-no-alt', severity: 'suggestion', classToken: comp,
        message: 'an image with no alt text — invisible to screen readers',
        fix: 'Describe the image in the brackets: `![what it shows](path)`.',
      });
    }

    // Possessive stacking (editorial.md speak-first) — unreadable aloud.
    const possLine = slide.split('\n').find(
      (l) => !/^\s*(##?\s|<!--)/.test(l) && /\b\w+['’]s\s+\w+['’]s\b/.test(l),
    );
    if (possLine) {
      findings.push({
        slide: idx, rule: 'possessive-stacking', severity: 'suggestion', classToken: comp, line: possLine.trim(),
        message: 'stacked possessives ("the system’s policy’s …") — it stumbles read aloud',
        fix: 'One possessive at a time; restructure (e.g. "the system enforces policy through …").',
      });
    }

    if (h) {
      headings.push({ idx, norm: h.replace(/[*`_]/g, '').trim().toLowerCase(), text: h });
      openings.push({ idx, open: headingOpening(h) });
    }
  });

  // Duplicate headings across slides — usually a stray paste or a split to merge.
  const seenHeading = new Map();
  for (const e of headings) {
    if (!e.norm) continue;
    if (seenHeading.has(e.norm)) {
      findings.push({
        slide: e.idx, rule: 'duplicate-heading', severity: 'suggestion', line: e.text,
        message: `"${e.text}" repeats an earlier slide's heading`,
        fix: 'Give each slide a distinct takeaway, or merge the duplicate slides.',
      });
    } else {
      seenHeading.set(e.norm, e.idx);
    }
  }

  // Monotone cadence (editorial.md) — many headings opening the same way drone.
  const byOpen = new Map();
  for (const e of openings) {
    if (!e.open) continue;
    if (!byOpen.has(e.open)) byOpen.set(e.open, []);
    byOpen.get(e.open).push(e.idx);
  }
  for (const [open, idxs] of byOpen) {
    if (idxs.length >= 3) {
      findings.push({
        slide: idxs[0], rule: 'monotone-openings', severity: 'suggestion',
        message: `${idxs.length} headings open "${open}…" — vary the cadence`,
        fix: 'Vary the opening and verb across slides; identical H2 openings read as a drone.',
      });
    }
  }

  // No clear ask (non-trivial decks only).
  if (contentSlides >= 4 && !hasAsk) {
    findings.push({
      slide: 0, rule: 'no-ask', severity: 'suggestion',
      message: 'no clear ask or recommendation — what should the audience do?',
      fix: 'Add a `decision` slide or a plain "we recommend…" line near the close.',
    });
  }

  // No agenda on a long deck — the audience loses the thread.
  if (contentSlides >= 10 && !hasAgenda) {
    findings.push({
      slide: 0, rule: 'agenda-missing', severity: 'suggestion',
      message: `${contentSlides} slides with no agenda — a long deck needs a roadmap`,
      fix: 'Add an `agenda` slide near the top so the audience can track where they are.',
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
