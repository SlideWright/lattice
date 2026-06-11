/**
 * Theme Studio — the AI tier's PURE pieces (Faculty 1, Phase 2). Building the
 * model prompt and coercing the model's reply into a valid essential set are
 * deterministic and `fs`-free, so they live here (bundled into the browser core
 * and unit-tested with a fake reply / MockBackend) while the actual model call
 * stays in the controller. The model only ever PROPOSES an essential set; the
 * deterministic derivation + contrast gate still dispose (lib/theme/derive.js).
 *
 * ONE conversational surface, not two: `askMessages(current, prompt)` always
 * sends the current palette as context plus the author's words. The model
 * returns a full redesign when the words describe a new look, or an adjustment
 * when they ask for a change — the UI doesn't make the author pick "seed" vs
 * "refine". `coerceEssentials` is forgiving — snake_case / aliased keys, and
 * anything missing or malformed falls back — so a partial tweak keeps the
 * untouched colours and an off reply still yields a derivable set.
 */

const { ESSENTIAL_KEYS } = require('./derive.js');
const { normalizeHex } = require('./color.js');

const KEY_DESCRIPTIONS = {
  bg: 'light page canvas, near-white',
  bgAlt: 'slightly darker card / alternate surface (still light)',
  textHeading: 'near-black heading ink',
  textBody: 'dark grey body ink',
  textMuted: 'mid grey, decorative',
  accent: 'the brand colour, saturated and distinct',
  accentSoft: 'a very pale wash of the accent',
  pass: 'success green',
  warn: 'warning amber',
  fail: 'error red',
};

const ASK_SYSTEM =
  'You are a palette designer for the Lattice slide engine. You will be given ' +
  'the CURRENT palette (as JSON) and a request. If the request describes a new ' +
  'look, return a complete new palette; if it asks for a change (e.g. "cooler", ' +
  '"more contrast", "navy accent"), adjust the current palette accordingly. ' +
  'Either way, output ONLY a compact JSON object — no prose, no markdown — with ' +
  'EXACTLY these keys, each a 6-digit hex colour (e.g. "#1a2b3c"):\n' +
  ESSENTIAL_KEYS.map(k => `  "${k}": ${KEY_DESCRIPTIONS[k]}`).join('\n') +
  '\nRules: bg and bgAlt must be light (a slide canvas); textHeading and ' +
  'textBody must be dark enough to read on them; accent is saturated; ' +
  'accentSoft is a pale tint of the accent. Output the full JSON object with ' +
  'all keys.';

/**
 * Messages for ONE conversational request — works for both originate
 * ("warm editorial, terracotta") and adjust ("cooler"). The current palette
 * is threaded as context so a relative tweak has a baseline.
 */
function askMessages(current, prompt) {
  return [
    { role: 'system', content: ASK_SYSTEM },
    { role: 'assistant', content: JSON.stringify(current || {}) },
    { role: 'user', content: String(prompt || '').trim() || 'a clean, professional palette' },
  ];
}

// Normalize a key (snake/kebab/space → lowercase alnum) for forgiving matching.
const norm = k => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const KEY_BY_NORM = (() => {
  const m = {};
  for (const k of ESSENTIAL_KEYS) m[norm(k)] = k;
  // common aliases a model might emit
  Object.assign(m, {
    background: 'bg', canvas: 'bg', surface: 'bg',
    bgalt: 'bgAlt', backgroundalt: 'bgAlt', card: 'bgAlt', surfacealt: 'bgAlt',
    heading: 'textHeading', headingink: 'textHeading', textheading: 'textHeading', ink: 'textHeading',
    body: 'textBody', textbody: 'textBody', bodyink: 'textBody',
    muted: 'textMuted', textmuted: 'textMuted',
    accentsoft: 'accentSoft', accentsoftfill: 'accentSoft',
    success: 'pass', warning: 'warn', error: 'fail', danger: 'fail',
  });
  return m;
})();

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    const m = String(s).match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

/**
 * Coerce a model reply (object, or JSON string) into a valid essential set.
 * Unknown/malformed/missing values fall back to `fallback`. Returns
 * `{ essentials, filled, applied, ok }` — `filled` lists keys taken from the
 * fallback, `applied` lists keys the model actually set, `ok` = nothing missing
 * AND at least one key applied (so a no-model floor that echoes the fallback
 * reads as not-ok).
 */
function coerceEssentials(raw, fallback) {
  const obj = (typeof raw === 'string' ? safeParse(raw) : raw) || {};
  const remapped = {};
  for (const [k, v] of Object.entries(obj)) {
    const canonical = KEY_BY_NORM[norm(k)];
    if (canonical) remapped[canonical] = v;
  }
  const essentials = {};
  const filled = []; // keys taken from the fallback (missing/malformed)
  const applied = []; // keys the model set with a valid hex
  for (const key of ESSENTIAL_KEYS) {
    if (key in remapped) {
      try {
        essentials[key] = normalizeHex(remapped[key]);
        applied.push(key);
        continue;
      } catch {
        /* malformed — fall through to fallback */
      }
    }
    essentials[key] = fallback[key];
    filled.push(key);
  }
  return { essentials, filled, applied, ok: filled.length === 0 && applied.length > 0 };
}

module.exports = { ASK_SYSTEM, askMessages, coerceEssentials };
