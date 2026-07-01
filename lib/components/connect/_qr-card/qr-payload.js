/**
 * Shared, dependency-free payload helpers — imported by BOTH the qr-general
 * transform and the browser-safe authoring linter (lib/authoring/lint-core.js),
 * so their payload detection can never drift (maker-checker finding). No `fs`,
 * no engine deps — safe in the browser bundle (HARD RULE #7).
 *
 * A "payload-URL" bullet is one whose value begins with a scheme the QR should
 * encode verbatim (a plain http link, or a self-identifying WIFI:/vCard string).
 */

const PAYLOAD_URL_RE = /^(https?:\/\/|mailto:|tel:|WIFI:|BEGIN:VCARD)/i;

module.exports = { PAYLOAD_URL_RE };
