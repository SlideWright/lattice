/**
 * Starter essential-sets — the Theme Studio's "seed on the floor". These let
 * the deterministic core demonstrate the originate → derive → audit loop with
 * NO model: pick a starter, derive, preview, tweak. Each is an ESSENTIAL SET
 * (see lib/theme/derive.js ESSENTIAL_KEYS), deliberately small; the derivation
 * turns each into a full, contrast-clean theme.
 *
 * They are hand-picked spans of mood (cool / warm / dark-first / high-key), not
 * clones of the shipped themes — a starting point an author moves away from.
 */

const STARTERS = Object.freeze([
  {
    name: 'dusk',
    label: 'Dusk',
    description: 'Cool indigo on near-white — calm, corporate, analytic.',
    essentials: {
      bg: '#FBFBFD', bgAlt: '#EEF1F7',
      textHeading: '#161A22', textBody: '#3C4350', textMuted: '#9AA3B2',
      accent: '#2D4ED8', accentSoft: '#E7ECFB',
      pass: '#1F7A4D', warn: '#B26A00', fail: '#C0392B',
    },
  },
  {
    name: 'ember',
    label: 'Ember',
    description: 'Warm terracotta on cream — editorial, human, energetic.',
    essentials: {
      bg: '#FBF7F1', bgAlt: '#F2E9DD',
      textHeading: '#241A12', textBody: '#5A4A3A', textMuted: '#A8977F',
      accent: '#B24A1E', accentSoft: '#F6E6D8',
      pass: '#2F6B3A', warn: '#B07400', fail: '#A52A2A',
    },
  },
  {
    name: 'pine',
    label: 'Pine',
    description: 'Deep forest green on bone — grounded, durable, natural.',
    essentials: {
      bg: '#F8FAF7', bgAlt: '#E8EFE6',
      textHeading: '#13201A', textBody: '#3A4A40', textMuted: '#94A299',
      accent: '#1E6B4F', accentSoft: '#DFEEE6',
      pass: '#1F7A4D', warn: '#9A6A00', fail: '#B23A2E',
    },
  },
  {
    name: 'slate',
    label: 'Slate',
    description: 'Neutral graphite with a violet accent — restrained, modern.',
    essentials: {
      bg: '#FAFAFB', bgAlt: '#ECEDF0',
      textHeading: '#17181C', textBody: '#3E4047', textMuted: '#9A9DA6',
      accent: '#6A3DD0', accentSoft: '#ECE6FA',
      pass: '#1F7A4D', warn: '#A86A00', fail: '#BD3A33',
    },
  },
]);

/** Look up a starter by name. */
function getStarter(name) {
  return STARTERS.find(s => s.name === name) || null;
}

module.exports = { STARTERS, getStarter };
