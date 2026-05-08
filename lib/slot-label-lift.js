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
 * lifted <strong>; that matches the visual intent (the whole label
 * carries the heading style).
 */
function liftSlotLabel(liInner) {
  // Match `<ul>` or `<ol>` with optional attributes (e.g. <ol start="2">).
  const m = liInner.match(/^([\s\S]*?)(<(?:ul|ol)(?:\s[^>]*)?>[\s\S]*)$/);
  if (!m) return liInner;
  let lead = m[1].trim();
  const body = m[2];
  if (!lead) return liInner;
  const pMatch = lead.match(/^<p>([\s\S]*)<\/p>$/);
  if (pMatch) lead = pMatch[1].trim();
  if (/^<strong>[\s\S]*<\/strong>$/.test(lead)) return `${lead}${body}`;
  return `<strong>${lead}</strong>${body}`;
}

module.exports = { liftSlotLabel };
