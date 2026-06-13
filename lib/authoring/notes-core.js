'use strict';

/**
 * notes-core — the pure, browser-safe presenter-notes extractor.
 *
 * LFM treats a non-directive HTML comment on a slide as that slide's speaker
 * note (Marp-faithful). This module is the SINGLE SOURCE for that semantic,
 * shared across the three render paths (HARD RULE #1):
 *
 *   - lattice-emulator.js   — embeds notes as per-page PDF text annotations and
 *                             a hidden HTML presenter-notes channel.
 *   - marp.config.js        — marp-core collects the same comments natively and
 *                             embeds them (PDF `--pdf-notes`, PPTX speaker notes);
 *                             this module's exclusion set is mirrored from Marpit
 *                             so both paths agree on what counts as a note.
 *   - dist/lattice-runtime.js — the VS Code preview surfaces the same channel.
 *
 * Like lint-core, this is pure and fs-free so it runs identically in Node, a CI
 * gate, and the browser.
 *
 * It operates on engine-RENDERED slide HTML, where Marpit/lib-engine has already
 * consumed directive comments (`_class`, `paginate`, …). What survives is either
 * a genuine note or a tooling pragma (markdownlint / prettier / remark-lint).
 * The pragma set below is copied verbatim from Marpit's own comment plugin
 * (node_modules/@marp-team/marpit/lib/markdown/comment.js → magicCommentMatchers)
 * so the emulator excludes exactly what marp-core excludes — keeping the three
 * paths in lockstep.
 */

// Verbatim from Marpit's comment plugin (magicCommentMatchers). Tested against
// the trimmed comment body. Kept in sync by the parity test in
// test/unit/authoring/notes-core.test.js.
const MAGIC_COMMENT_MATCHERS = [
  // Prettier
  /^prettier-ignore(-(start|end))?$/,
  // markdownlint
  /^markdownlint-((disable|enable).*|capture|restore)$/,
  // remark-lint (remark-message-control)
  /^lint (disable|enable|ignore).*$/,
];

// Matches one HTML comment, capturing its body. Mirrors Marpit's commentMatcher
// (tolerant of extra dashes). Constructed fresh per call site to avoid shared
// lastIndex state.
const COMMENT_SOURCE = '<!--+\\s*([\\s\\S]*?)\\s*--+>';

/**
 * Is this (trimmed) comment body a tooling pragma rather than a speaker note?
 * @param {string} body comment body, leading/trailing space already irrelevant
 * @returns {boolean}
 */
function isToolingComment(body) {
  const t = String(body == null ? '' : body).trim();
  return MAGIC_COMMENT_MATCHERS.some((re) => re.test(t));
}

/**
 * Extract the speaker note for one slide from its rendered HTML.
 * Collects every surviving HTML comment, drops tooling pragmas, trims, and
 * joins multiple comments with a blank line — matching Marpit, which records
 * one entry per comment per slide.
 * @param {string} sectionHtml rendered `<section>…</section>` HTML for a slide
 * @returns {string|null} the slide's note, or null when it has none
 */
function notesFromHtml(sectionHtml) {
  const re = new RegExp(COMMENT_SOURCE, 'g');
  const bodies = [];
  for (const m of String(sectionHtml == null ? '' : sectionHtml).matchAll(re)) {
    const body = m[1].trim();
    if (!body || isToolingComment(body)) continue;
    bodies.push(body);
  }
  return bodies.length ? bodies.join('\n\n') : null;
}

/**
 * Extract per-slide notes from an array of rendered slide-HTML strings.
 * The result is index-aligned with the input, so `notes[i]` is the note for
 * `slides[i]` (or null). Pass the same array the renderer paginates from so the
 * indices never drift.
 * @param {string[]|string} slidesHtml
 * @returns {(string|null)[]}
 */
function extractSlideNotes(slidesHtml) {
  const arr = Array.isArray(slidesHtml) ? slidesHtml : [slidesHtml];
  return arr.map(notesFromHtml);
}

/**
 * Remove every HTML comment node from a slide's HTML. The note/pragma comments
 * are invisible authoring artifacts in the rendered output; once their text has
 * been lifted into the structured channel, stripping them keeps the note text
 * from appearing twice in the HTML sidecar.
 * @param {string} sectionHtml
 * @returns {string}
 */
function stripCommentNodes(sectionHtml) {
  return String(sectionHtml == null ? '' : sectionHtml).replace(
    new RegExp(COMMENT_SOURCE, 'g'),
    ''
  );
}

module.exports = {
  MAGIC_COMMENT_MATCHERS,
  isToolingComment,
  notesFromHtml,
  extractSlideNotes,
  stripCommentNodes,
};
