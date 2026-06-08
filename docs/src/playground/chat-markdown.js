// The Drawing Board — a tiny, safe Markdown renderer for the chat thread.
//
// The Architect (especially the cloud tier) replies in Markdown — **bold**, lists,
// `code`, fenced blocks — but the bubble used to render plain text, so authors saw
// the raw syntax. This turns a reply into safe HTML: it HTML-escapes EVERYTHING
// first (so no tag from the model can execute), then layers our own formatting on
// the escaped text. Links are scheme-checked (no javascript:/data:). Deliberately
// basic — bold/italic/inline-code/links/headings/lists + fenced code — and pure,
// so it's fully unit-tested. Used only for Architect messages; user text stays raw.

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

// Allow http(s)/mailto and relative (#, /) links; reject everything else
// (javascript:, data:, …). Input is already HTML-escaped.
function safeUrl(u) {
  const t = u.trim();
  if (/^(https?:|mailto:)/i.test(t)) return t;
  if (/^[#/]/.test(t)) return t;
  return null;
}

// Inline spans on an already-escaped line. Inline code is protected first so its
// contents aren't re-formatted, then restored.
function inline(text) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\uE000${codes.length - 1}\uE000`; });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    const safe = safeUrl(url);
    return safe ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>` : m;
  });
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  s = s.replace(/\uE000(\d+)\uE000/g, (_, i) => `<code>${codes[Number(i)]}</code>`);
  return s;
}

const isFence = (l) => /^\s*```+/.test(l);
const isHeading = (l) => /^#{1,6}\s+/.test(l);
const isItem = (l) => /^\s*[-*]\s+/.test(l) || /^\s*\d+\.\s+/.test(l);

export function renderMarkdown(md) {
  const lines = escapeHtml(md || '').split('\n');
  const out = [];
  let i = 0;
  let listTag = null;
  let items = [];
  const flush = () => {
    if (listTag) { out.push(`<${listTag} class="db-md-list">${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${listTag}>`); listTag = null; items = []; }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (isFence(line)) {
      flush();
      const buf = [];
      i++;
      while (i < lines.length && !/^\s*```+\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
      i++; // consume the closing fence (if present)
      out.push(`<pre class="db-md-pre"><code>${buf.join('\n')}</code></pre>`);
      continue;
    }
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) { flush(); out.push(`<div class="db-md-h">${inline(h[1])}</div>`); i++; continue; }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const tag = ul ? 'ul' : 'ol';
      if (listTag && listTag !== tag) flush();
      listTag = tag;
      items.push(ul ? ul[1] : ol[1]);
      i++;
      continue;
    }
    if (line.trim() === '') { flush(); i++; continue; }

    // A paragraph: gather consecutive plain lines, joined with <br>.
    flush();
    const para = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !isFence(lines[i]) && !isHeading(lines[i]) && !isItem(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${para.map(inline).join('<br>')}</p>`);
  }
  flush();
  return out.join('');
}

// The pure visibility logic for the scroll-to-top/bottom control — separated from
// the DOM so it's testable (jsdom doesn't compute scroll metrics). Returns which
// jump affordances should show given the scroller's metrics.
export function scrollJumpState({ scrollTop = 0, scrollHeight = 0, clientHeight = 0 }, threshold = 120) {
  const overflowing = scrollHeight - clientHeight > threshold;
  if (!overflowing) return { top: false, bottom: false };
  return {
    top: scrollTop > threshold,
    bottom: scrollHeight - scrollTop - clientHeight > threshold,
  };
}
