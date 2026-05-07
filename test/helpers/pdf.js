/**
 * Tiny pdfinfo wrapper. Returns page count, or throws if pdfinfo is
 * missing or the file is unreadable. Tests that need page counts
 * depend on this; CI must have poppler-utils installed.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');

function pageCount(pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }
  const out = execFileSync('pdfinfo', [pdfPath], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  const m = out.match(/Pages:\s*(\d+)/);
  if (!m) throw new Error(`Could not parse page count from pdfinfo:\n${out}`);
  return parseInt(m[1], 10);
}

module.exports = { pageCount };
