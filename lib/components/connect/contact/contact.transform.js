/**
 * contact transform — a business/identity card that encodes a vCard.
 *
 * Authoring (postfix-key list):
 *   <!-- _class: contact -->
 *   ## Add me.
 *   - Sharmarke Aden `name`
 *   - Founder & CEO `title`
 *   - SlideWright `org`
 *   - sharmarke@slidewright.dev `email`
 *   - +1-555-0142 `phone`
 *   - slidewright.dev `url`
 *
 * Fields (key + aliases): name (req) · title|role · org|company · email ·
 * phone|tel|mobile · url|web|site. `name` is the hero; title/org form the
 * lockup; email/phone/url are the ledger. All non-empty fields encode into the
 * vCard; the card shows the human-facing subset.
 *
 * Idempotent: guarded on the `.qr-card` marker.
 */

const { parseFields, pick, encode, walkSections, esc } = require('../_qr-card/qr-card');

function vcardPayload(f) {
  const L = ['BEGIN:VCARD', 'VERSION:3.0'];
  const name = pick(f, 'name');
  L.push(`FN:${name}`);
  const title = pick(f, 'title', 'role'), org = pick(f, 'org', 'company');
  const email = pick(f, 'email'), tel = pick(f, 'phone', 'tel', 'mobile'), url = pick(f, 'url', 'web', 'site');
  if (title) L.push(`TITLE:${title}`);
  if (org) L.push(`ORG:${org}`);
  if (email) L.push(`EMAIL:${email}`);
  if (tel) L.push(`TEL:${tel}`);
  if (url) L.push(`URL:${url}`);
  L.push('END:VCARD');
  return L.join('\n');
}

// Break a name before its last word so a two-part name stacks (Sharmarke / Aden).
function stackName(name) {
  const safe = esc(name);
  return safe.replace(/\s+(?=\S+$)/, '<br>');
}

function renderCard(inner) {
  if (inner.indexOf('class="qr-card"') !== -1) return inner; // idempotent
  const header = (inner.match(/^\s*<header[\s\S]*?<\/header>/) || [''])[0];
  const footer = (inner.match(/<footer[\s\S]*?<\/footer>\s*$/) || [''])[0];
  let body = inner;
  if (header) body = body.slice(header.length);
  if (footer) body = body.slice(0, body.length - footer.length);

  const fields = parseFields(body);
  if (fields.length === 0) return inner;

  const name = pick(fields, 'name');
  const title = pick(fields, 'title', 'role'), org = pick(fields, 'org', 'company');
  const lockup = [title, org].filter(Boolean).map(esc).join(' · ');
  const ledger = [pick(fields, 'email'), pick(fields, 'phone', 'tel', 'mobile'), pick(fields, 'url', 'web', 'site')]
    .filter(Boolean).map((v) => `<span>${esc(v)}</span>`).join('');

  const lockupHtml = lockup
    ? `<div class="qr-lockup"><span class="qr-tick"></span><span>${lockup}</span></div>` : '';
  const svg = encode(vcardPayload(fields));

  return `${header}<div class="qr-card contact-card"><div class="qr-identity"><p class="qr-name">${stackName(name)}</p>${lockupHtml}${ledger ? `<div class="qr-ledger">${ledger}</div>` : ''}</div><div class="qr-side"><div class="qr-tile">${svg}</div><p class="qr-cta">Scan to add me</p></div></div>${footer}`;
}

function applyToRenderedHtml(html) {
  return walkSections(html, 'contact', (inner) => renderCard(inner));
}

module.exports = { vcardPayload, renderCard, applyToRenderedHtml };
