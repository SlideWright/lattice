/**
 * carousel.js — the Fit Ladder's SPLIT move for READ-ACROSS layouts
 * (engineering/decisions/2026-06-22-the-fit-spine.md §3; the "two families" split
 * of the carousel design, 2026-06-23-read-across-carousel.md).
 *
 * A read-across layout (compare-prose's two facing columns, split-panel's two panes)
 * can't be partitioned between members the way a list can — its meaning lives in the
 * cross-reading, so `partitionAxis` returns null and the slide would otherwise clip
 * (the ring). This module is the other answer: re-author the one overflowing slide as
 * a short, deliberate SEQUENCE — a carousel — that the layout OWNS. The narrative
 * family's recipe is `editorial` (the C4 treatment the maintainer picked from a
 * 5-candidate render-off): a cover that promises "two readings", one article page per
 * subject (running kicker + ordinal + drop-cap prose + folio), and an optional
 * pull-quote verdict from the slide's synthesis line.
 *
 * Operates POST-render on the already-assembled section (like auto-split's resplitDoc):
 * it parses the rendered compare-prose DOM — Form chrome + masthead h2 + the two-subject
 * <ul> + the .below-note synthesis — and re-emits N editorial sections that carry the
 * stable chrome (<header>/<footer>) and drop the two-up body for the role-specific one.
 * Returns null when the section doesn't parse as the expected shape, so the caller
 * leaves it for the ring rather than emitting a broken sequence. Pure & fs-free.
 */

const { directChildren } = require('./collections');

// ── extraction from the rendered section inner ────────────────────────────────
const grab = (html, re) => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
};

// A subject's prose body: the nested <ul>'s direct <li> children, joined. Using
// directChildren (not a span-to-last-</li> regex) keeps a multi-bullet body from
// leaking literal `</li><li>` into the article prose. Returns the joined text or null.
function subjectBody(li) {
  const m = li.match(/<(ul|ol)\b/); // <ul> OR <ol> — a nested ordered body must not vanish
  if (!m) return null;
  const tag = m[1];
  const at = li.indexOf(`<${tag}`);
  const open = li.indexOf('>', at) + 1;
  const [span] = directChildren(li.slice(at), tag);
  if (!span) return null;
  const body = li.slice(open, at + span.end - `</${tag}>`.length);
  const bullets = directChildren(body, 'li').map((s) => body.slice(s.start, s.end).replace(/^<li[^>]*>/, '').replace(/<\/li>$/, '').trim());
  return bullets.length ? bullets.join(' ') : null;
}

// The subject body <ul> is the first top-level list AFTER the masthead cell. Each
// direct <li> is one subject (label in <strong>, prose in a nested <ul>). Returns
// [{ label, body }, …] (≥ 2 — compare-prose's two-up, or a 3-option banner-tag) or null.
function readSubjects(inner) {
  const afterMast = inner.replace(/<div class="cell-masthead">[\s\S]*?<\/div>\s*<\/div>/, '');
  const ulAt = afterMast.indexOf('<ul');
  if (ulAt < 0) return null;
  const ulEnd = afterMast.indexOf('>', ulAt) + 1;
  const [span] = directChildren(afterMast.slice(ulAt), 'ul');
  if (!span) return null;
  const body = afterMast.slice(ulEnd, ulAt + span.end - '</ul>'.length);
  const subjects = directChildren(body, 'li')
    .map((s) => {
      const li = body.slice(s.start, s.end);
      return { label: grab(li, /<strong>([\s\S]*?)<\/strong>/), body: subjectBody(li) };
    })
    .filter((s) => s.label && s.body);
  return subjects.length >= 2 ? subjects : null;
}

// ── role-section assembly ─────────────────────────────────────────────────────
// Swap the section's layout class to `klass` (the split role's class string),
// keeping the openTag's theme/orientation data. Continuation copies (not first) drop
// the engine `id` so a split never duplicates ids.
function roleOpenTag(openTag, klass, first) {
  const tag = first ? openTag : openTag.replace(/\s+id="[^"]*"/, '');
  return tag.replace(/(\sclass=")[^"]*(")/, `$1${klass}$2`);
}

// Header/footer Form chrome, carried verbatim onto every emitted frame.
function chromeOf(inner) {
  return {
    header: (inner.match(/<header\b[^>]*>[\s\S]*?<\/header>/) || [''])[0],
    footer: (inner.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/) || [''])[0],
  };
}

// Number words for the ordinal eyebrow and the cover's "N readings" promise.
const WORD = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'];

// Build the carousel sections for the editorial recipe. `chrome` = { header, footer }
// carried verbatim onto every frame. No bespoke folio — the page mark is the deck's
// own pagination badge (re-paginated by resplitDoc after the split), so the carousel
// numbers consistently with the rest of the deck instead of carrying a private scheme.
function editorialSections(openTag, title, subjects, synthesis, chrome) {
  const { header, footer } = chrome;
  const kicker = (text) => `<div class="split-kicker">${text}</div>`;
  const wrap = (role, first, body) => `${roleOpenTag(openTag, `content compare-split compare-split-${role} form`, first)}${header}${body}${footer}</section>`;

  const out = [];
  // Lead — the cover: a promise of N readings.
  const promise = `${WORD[subjects.length] || subjects.length} readings`;
  out.push(wrap('lead', true, `${kicker('A comparison')}<div class="split-cover-q">${title}</div><div class="split-cover-more">${promise} &rarr;</div>`));
  // Middles — one article page per subject.
  subjects.forEach((s, i) => {
    const ord = `Reading ${(WORD[i + 1] || i + 1).toLowerCase()}`;
    out.push(wrap('read', false, `${kicker(title)}<div class="split-art-label"><span class="split-ord">${ord}</span>${s.label}</div><div class="split-art">${s.body}</div>`));
  });
  // Last — the verdict pull-quote, only when the slide carried a synthesis line.
  if (synthesis) out.push(wrap('verdict', false, `${kicker('The shift')}<div class="split-pullq">${synthesis}</div>`));
  return out;
}

// ── feature-cover strategy (split-panel) ──────────────────────────────────────
// split-panel is ASYMMETRIC — a featured left panel (watermark / eyebrow / heading +
// lede) beside a right-side list of supporting POINTS. In a tall box the feature panel
// is too heavy to sit beside its points, so the `feature-cover` recipe gives the
// feature its own cover, then flows the points onto clean pages under a running header
// (the SP3 treatment the maintainer picked). The points paginate `perPage` at a time.

// The supporting points: the first list in the right panel, each <li> a title (strong)
// + a nested body. Reuses subjectBody so a multi-bullet point can't leak markup.
function readPoints(html) {
  const m = html.match(/<(ul|ol)\b/);
  if (!m) return null;
  const tag = m[1];
  const at = html.indexOf(`<${tag}`);
  const open = html.indexOf('>', at) + 1;
  const [span] = directChildren(html.slice(at), tag);
  if (!span) return null;
  const body = html.slice(open, at + span.end - `</${tag}>`.length);
  const points = directChildren(body, 'li')
    .map((s) => {
      const li = body.slice(s.start, s.end);
      return { title: grab(li, /<strong>([\s\S]*?)<\/strong>/), body: subjectBody(li) };
    })
    .filter((p) => p.title && p.body);
  return points.length ? points : null;
}

// The lede is a framing <p> that is NOT the eyebrow's <code> wrapper. Variants put it
// in different panels: default/metric/steps in panel-left (after the heading), watermark
// in panel-right (after the subhead). Prefer left, fall back to right; skip any <p> that
// wraps a <code> (the watermark variant's eyebrow). Returns inner HTML (keeps inline em).
function readLede(left, right) {
  for (const block of [left, right]) {
    for (const m of block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
      if (!/<code\b/.test(m[0]) && m[1].trim()) return m[1].trim();
    }
  }
  return null;
}

// Parse split-panel's rendered DOM into { watermark, eyebrow, heading, lede, points }.
// The eyebrow renders as <span class="panel-eyebrow"> (default/metric/steps) or <code>
// (watermark); both live in panel-left.
function readFeature(inner) {
  const rightAt = inner.indexOf('<div class="panel-right"');
  if (rightAt < 0) return null;
  const left = inner.slice(0, rightAt);
  const right = inner.slice(rightAt);
  const heading = grab(left, /<h2[^>]*>([\s\S]*?)<\/h2>/);
  const points = readPoints(right);
  if (!heading || !points) return null;
  return {
    heading,
    watermark: grab(left, /<div class="watermark">([\s\S]*?)<\/div>/),
    eyebrow: grab(left, /<span class="panel-eyebrow">([\s\S]*?)<\/span>/) || grab(left, /<code>([\s\S]*?)<\/code>/),
    lede: readLede(left, right),
    points,
  };
}

// Shared cover → windowed-items builder for the cover strategies. Emits a COVER (an
// accent field: optional watermark/eyebrow + heading + optional lede), then the items
// flow `perPage` at a time under a running header. `cls(role)` maps a role to the
// section class string, so each layout keeps its own scoping while sharing the finish
// — the continuity the maintainer approved on split-panel, reused verbatim.
function coverWindow(openTag, cover, items, chrome, perPage, cls) {
  const { header, footer } = chrome;
  const wrap = (klass, first, body) => `${roleOpenTag(openTag, klass, first)}${header}${body}${footer}</section>`;
  const out = [];
  const wm = cover.watermark ? `<div class="split-feat-bleed" aria-hidden="true"><div class="split-feat-wm">${cover.watermark}</div></div>` : '';
  const eye = cover.eyebrow ? `<div class="split-feat-eye">${cover.eyebrow}</div>` : '';
  const lede = cover.lede ? `<div class="split-feat-lede">${cover.lede}</div>` : '';
  out.push(wrap(cls('cover'), true, `${wm}${eye}<div class="split-feat-h">${cover.heading}</div>${lede}`));
  const per = Number.isInteger(perPage) && perPage > 0 ? perPage : 3;
  const runhead = `<div class="split-runhead">${cover.heading}</div>`;
  for (let i = 0; i < items.length; i += per) {
    const rows = items
      .slice(i, i + per)
      .map((p) => `<li><span class="split-pt-t">${p.title}</span><span class="split-pt-b">${p.body}</span></li>`)
      .join('');
    out.push(wrap(cls('points'), false, `${runhead}<ul class="split-pts">${rows}</ul>`));
  }
  return out;
}

function featureCoverSections(openTag, feat, chrome, recipe) {
  return coverWindow(openTag, feat, feat.points, chrome, recipe.perPage, (role) => `content split-panel-split split-panel-${role} form`);
}

// ── cover-rows strategy (list-tabular) ────────────────────────────────────────
// list-tabular is an <ol> of row-<li>s — read-across lives WITHIN a row (label · what
// it measures · how it scores), intact when split BETWEEN rows. The maintainer picked
// the same cover→content finish as split-panel: the title gets an accent cover, then the
// rows flow on clean pages. Each row's label is the leading text before its nested list;
// the body is the nested items joined (reusing subjectBody, so inline <em> survives).
function readRows(inner) {
  const afterMast = inner.replace(/<div class="cell-masthead">[\s\S]*?<\/div>\s*<\/div>/, '');
  const m = afterMast.match(/<(ul|ol)\b/);
  if (!m) return null;
  const tag = m[1];
  const at = afterMast.indexOf(`<${tag}`);
  const open = afterMast.indexOf('>', at) + 1;
  const [span] = directChildren(afterMast.slice(at), tag);
  if (!span) return null;
  const body = afterMast.slice(open, at + span.end - `</${tag}>`.length);
  const rows = directChildren(body, 'li')
    .map((s) => {
      const li = body.slice(s.start, s.end);
      const liInner = li.slice(li.indexOf('>') + 1, li.lastIndexOf('</li>'));
      const sub = liInner.search(/<(ul|ol)\b/);
      const title = (sub >= 0 ? liInner.slice(0, sub) : liInner).replace(/<[^>]+>/g, '').trim();
      return { title, body: sub >= 0 ? subjectBody(li) : null };
    })
    .filter((r) => r.title && r.body);
  return rows.length ? rows : null;
}

// ── public entry ──────────────────────────────────────────────────────────────
// Re-author one rendered read-across section as a carousel per its `recipe.strategy`:
//   · 'editorial'      — compare-prose: cover → one article page per subject → verdict.
//   · 'feature-cover'  — split-panel: feature cover → supporting points paginated.
//   · 'cover-rows'     — list-tabular: title cover → row-list paginated (shares the
//                        feature-cover finish via coverWindow).
// Returns an ARRAY of section strings (the caller joins + renumbers data-lattice-slide),
// or null when the section doesn't parse as the expected shape (→ left for the ring).
function carouselize(openTag, inner, recipe) {
  if (!recipe) return null;
  const chrome = chromeOf(inner);
  if (recipe.strategy === 'editorial') {
    const subjects = readSubjects(inner);
    if (!subjects) return null;
    const title = grab(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/) || '';
    const synthesis = grab(inner, /class="below-note">\s*<p[^>]*>([\s\S]*?)<\/p>/);
    const parts = editorialSections(openTag, title, subjects, synthesis, chrome);
    return parts.length >= 3 ? parts : null;
  }
  if (recipe.strategy === 'feature-cover') {
    const feat = readFeature(inner);
    if (!feat) return null;
    const parts = featureCoverSections(openTag, feat, chrome, recipe);
    return parts.length >= 2 ? parts : null;
  }
  if (recipe.strategy === 'cover-rows') {
    const heading = grab(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/);
    const rows = readRows(inner);
    if (!heading || !rows) return null;
    const cover = { heading, lede: grab(inner, /class="below-note">\s*<p[^>]*>([\s\S]*?)<\/p>/) };
    const parts = coverWindow(openTag, cover, rows, chrome, recipe.perPage, (role) => `content list-tabular-split list-tabular-${role} form`);
    return parts.length >= 2 ? parts : null;
  }
  return null;
}

module.exports = { carouselize, readSubjects, readFeature, readRows };
