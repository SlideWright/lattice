/**
 * Palette CSS parser shared by tests.
 *
 * Reads a `themes/<name>.css` file and returns:
 *   - vars: { tokenName: resolvedValue } for every `--token` declaration
 *           in `:root` blocks. Chained `var(--other)` references are
 *           resolved iteratively to a fixed point.
 *   - raw: the file contents (for further checks).
 */

const fs   = require('fs');
const path = require('path');

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
  // Iteratively resolve chained var() references (e.g. --diagram-band-text-1
  // → var(--text-heading) → var(--brand-leather-deep) → hex in cuoio).
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const k of Object.keys(vars)) {
      const ref = vars[k].match(/^var\(--([a-z0-9-]+)\)$/i);
      if (ref && vars[ref[1]] && vars[ref[1]] !== vars[k]) {
        vars[k] = vars[ref[1]];
        changed = true;
      }
    }
    if (!changed) break;
  }
  return vars;
}

function loadPalette(name) {
  const file = path.join(__dirname, '..', '..', 'themes', `${name}.css`);
  const raw  = fs.readFileSync(file, 'utf8');
  return { name, raw, vars: parsePaletteVars(raw) };
}

module.exports = { loadPalette, parsePaletteVars };
