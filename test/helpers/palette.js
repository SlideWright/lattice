/**
 * Palette CSS parser shared by tests.
 *
 * Reads a `themes/<name>.css` file and returns:
 *   - vars: { tokenName: resolvedValue } for every `--token` declaration
 *           in `:root` blocks. Single-level `var(--other)` references
 *           are resolved.
 *   - mermaidSentinelIndex: byte offset of the
 *       `/* ===== MERMAID THEME CSS ===== *\/` marker, or -1.
 *   - raw: the file contents (for further checks).
 */

const fs   = require('fs');
const path = require('path');

const SENTINEL = '/* ===== MERMAID THEME CSS ===== */';

function parsePaletteVars(content) {
  // Strip CSS comments first so doc blocks containing example strings
  // like `":root{color-scheme:dark}"` don't terminate the :root block
  // matcher's brace-balanced sweep prematurely. Real declarations never
  // have CSS comments mid-value, so this is safe.
  const stripped = content.replace(/\/\*[\s\S]*?\*\//g, '');
  const vars = {};
  const rootBlocks = stripped.match(/:root\s*\{[^}]*\}/g) || [];
  for (const block of rootBlocks) {
    const decls = block.match(/--[a-z0-9-]+\s*:\s*[^;]+/gi) || [];
    for (const d of decls) {
      const m = d.match(/--([a-z0-9-]+)\s*:\s*(.+)$/i);
      if (m) vars[m[1]] = m[2].trim();
    }
  }
  for (const k of Object.keys(vars)) {
    const ref = vars[k].match(/^var\(--([a-z0-9-]+)\)$/i);
    if (ref && vars[ref[1]]) vars[k] = vars[ref[1]];
  }
  return vars;
}

function loadPalette(name) {
  const file = path.join(__dirname, '..', '..', 'themes', `${name}.css`);
  const raw  = fs.readFileSync(file, 'utf8');
  return {
    name,
    raw,
    vars: parsePaletteVars(raw),
    mermaidSentinelIndex: raw.indexOf(SENTINEL),
  };
}

module.exports = { loadPalette, parsePaletteVars, SENTINEL };
