/**
 * Palette CSS parser shared by tests.
 *
 * Reads a `themes/<name>.css` file plus `lattice.css` (which the theme
 * imports for the universal semantic palette defaults) and returns:
 *   - vars: { tokenName: resolvedValue } for every `--token` declaration
 *           across both files' `:root` blocks. Theme declarations
 *           override lattice.css defaults (themes loaded last).
 *           Chained `var(--other)` references are resolved iteratively
 *           to a fixed point.
 *   - raw: the theme file contents (for further checks).
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
  const root = path.join(__dirname, '..', '..');
  const themeFile = path.join(root, 'themes', `${name}.css`);
  const raw = fs.readFileSync(themeFile, 'utf8');
  // Universal palette defaults live in lattice.css :root. Parse it
  // first so theme declarations override (themes are loaded last in
  // the cascade — @import 'lattice' is at the top of each theme file).
  const latticeCSS = fs.readFileSync(path.join(root, 'lattice.css'), 'utf8');
  const combined = latticeCSS + '\n' + raw;
  return { name, raw, vars: parsePaletteVars(combined) };
}

module.exports = { loadPalette, parsePaletteVars };
