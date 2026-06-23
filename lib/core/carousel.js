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
  const ulAt = li.indexOf('<ul');
  if (ulAt < 0) return null;
  const ulEnd = li.indexOf('>', ulAt) + 1;
  const [span] = directChildren(li.slice(ulAt), 'ul');
  if (!span) return null;
  const ulBody = li.slice(ulEnd, ulAt + span.end - '</ul>'.length);
  const bullets = directChildren(ulBody, 'li').map((s) => ulBody.slice(s.start, s.end).replace(/^<li[^>]*>/, '').replace(/<\/li>$/, '').trim());
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
// Swap the section's layout class to the editorial split role, keeping `form` (and
// any theme/orientation data the openTag carries). Continuation copies drop `id`.
function roleOpenTag(openTag, role, first) {
  const tag = first ? openTag : openTag.replace(/\s+id="[^"]*"/, '');
  return tag.replace(/(\sclass=")[^"]*(")/, `$1content compare-split compare-split-${role} form$2`);
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
  const wrap = (role, first, body) => `${roleOpenTag(openTag, role, first)}${header}${body}${footer}</section>`;

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

// ── public entry ──────────────────────────────────────────────────────────────
// Re-author one rendered read-across section as a carousel per its `recipe`
// ({ strategy: 'editorial' }). Returns an ARRAY of section strings (the caller joins
// + renumbers data-lattice-slide), or null when the section doesn't parse as the
// expected shape (→ the caller leaves it for the ring).
function carouselize(openTag, inner, recipe) {
  if (!recipe || recipe.strategy !== 'editorial') return null;
  const subjects = readSubjects(inner);
  if (!subjects) return null;
  const title = grab(inner, /<h2[^>]*>([\s\S]*?)<\/h2>/) || '';
  const synthesis = grab(inner, /class="below-note">\s*<p[^>]*>([\s\S]*?)<\/p>/);
  const header = (inner.match(/<header\b[^>]*>[\s\S]*?<\/header>/) || [''])[0];
  const footer = (inner.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/) || [''])[0];
  const parts = editorialSections(openTag, title, subjects, synthesis, { header, footer });
  return parts.length >= 3 ? parts : null;
}

module.exports = { carouselize, readSubjects };
