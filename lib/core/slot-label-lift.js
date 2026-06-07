/**
 * Slot-label lift — for named-slot layouts (decision, before-after,
 * compare-prose), each top-level card's leading text is *structurally*
 * the slot label, not editorial emphasis. Wrap it in <strong> so the
 * corner-tag CSS triggers without authors having to type `**Label**`.
 *
 * Input: the inner HTML of a single <li>, as produced by the markdown
 * pipeline. The expected shape after markdown-it parsing is:
 *
 *   <p>Lead text</p><ul>...</ul>           // explicit <p> wrapper
 *   Lead text<ul>...</ul>                  // no <p> when inline-only
 *
 * Behavior:
 *   - If there's no nested ul/ol body, return input unchanged.
 *   - If the lead is empty/whitespace, return input unchanged.
 *   - If the lead is ALREADY a single <strong>…</strong> span, return
 *     input with the lead unwrapped from any <p> but otherwise intact
 *     (idempotent — running twice yields the same result).
 *   - Otherwise, wrap the trimmed lead in <strong>…</strong>.
 *
 * Inline markup inside the lead (em/code/etc.) stays nested inside the
 * lifted <strong> by default; that matches the visual intent (the whole
 * label carries the heading style).
 *
 * `opts.chipTail` (used by `actors`): a TRAILING run of inline <code>
 * chips is metadata (the actor-name pill), not heading text — it is kept
 * as a sibling AFTER the lifted <strong> so layout CSS targeting
 * `li > code` (grid placement, pill chrome) still matches.
 */
function liftSlotLabel(liInner, opts = {}) {
  // Match `<ul>` or `<ol>` with optional attributes (e.g. <ol start="2">).
  const m = liInner.match(/^([\s\S]*?)(<(?:ul|ol)(?:\s[^>]*)?>[\s\S]*)$/);
  if (!m) return liInner;
  let lead = m[1].trim();
  const body = m[2];
  if (!lead) return liInner;
  const pMatch = lead.match(/^<p>([\s\S]*)<\/p>$/);
  if (pMatch) lead = pMatch[1].trim();
  // For chip-tail layouts, split off a trailing run of <code> chips (with
  // surrounding whitespace) so they remain siblings of the <strong> label.
  let tail = '';
  if (opts.chipTail) {
    const codeTail = lead.match(/(\s*(?:<code\b[^>]*>[\s\S]*?<\/code>\s*)+)$/);
    if (codeTail && codeTail.index > 0) {
      tail = codeTail[1];
      lead = lead.slice(0, codeTail.index).trim();
    }
  }
  if (!lead) return liInner;
  if (/^<strong>[\s\S]*<\/strong>$/.test(lead)) return `${lead}${tail}${body}`;
  return `<strong>${lead}</strong>${tail}${body}`;
}

module.exports = { liftSlotLabel };
