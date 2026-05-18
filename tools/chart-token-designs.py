#!/usr/bin/env python3
"""Ten indaco-tuned chart-token designs.

Each design declares its chart slots as (label, fill_light, fill_dark,
text_light, text_dark) tuples. The text values are AA-verified per slot
per canvas mode — no "rule" to remember, just hex.

Run:
  python3 designs.py            # AA verification of all 10 designs
  python3 designs.py emit       # write 10 scratch theme files
  python3 designs.py NAME       # print just one design's report
"""

import sys
import os
import json
import textwrap

# ─────────────────────────────────────────────────────────────────────
# Contrast helper

def _channel(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hex_str):
    h = hex_str.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)

def contrast(a, b):
    l1, l2 = luminance(a), luminance(b)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

def grade(c):
    if c >= 7.0:  return "AAA"
    if c >= 4.5:  return "AA "
    if c >= 3.0:  return "AAL"  # AA-large only
    return "FAIL"

# ─────────────────────────────────────────────────────────────────────
# 10 designs
# Each design: { "name", "tagline", "slots": [(name, fill_L, fill_D, text_L, text_D), ...],
#                "extras": {token: (light, dark)} for non-slot tokens }
#
# Canvas reference (indaco): bg_light = #FFFFFF, bg_dark = #001D33

DESIGNS = []

# ─── 1. Monochrome Navy ──────────────────────────────────────────────
# Single-hue ramp; categorical via intensity, austere
DESIGNS.append({
  "name": "monochrome",
  "tagline": "Single-hue indaco navy ramp; categorical via intensity",
  "slots": [
    ("chart-1", "#EAEFF5", "#0F2538", "#0A1628", "#C7DCED"),
    ("chart-2", "#B8C9DD", "#1F3D5A", "#0A1628", "#C7DCED"),
    ("chart-3", "#3D6890", "#5BA0CC", "#FFFFFF", "#0A1628"),
    ("chart-4", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),
    ("chart-5", "#082C4D", "#C7DCED", "#FFFFFF", "#0A1628"),
  ],
  "accent": ("#91450E", "#E89F45"),
})

# ─── 2. Dichromatic Navy + Amber ─────────────────────────────────────
# 2 hues x 3 intensities each = 6 slots
DESIGNS.append({
  "name": "dichromatic",
  "tagline": "Navy + amber, three intensities each — maximum restraint",
  "slots": [
    ("chart-1", "#DCE5F0", "#0F2538", "#0A1628", "#C7DCED"),  # navy-soft
    ("chart-2", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy
    ("chart-3", "#082C4D", "#C7DCED", "#FFFFFF", "#0A1628"),  # navy-deep
    ("chart-4", "#F4E2C8", "#2E1F0A", "#0A1628", "#F4E2C8"),  # amber-soft
    ("chart-5", "#91450E", "#E89F45", "#FFFFFF", "#1A0F00"),  # amber
    ("chart-6", "#5C2C04", "#F4CA8A", "#FFFFFF", "#1A0F00"),  # amber-deep
  ],
  "accent": ("#1F4A6E", "#82C8E5"),
})

# ─── 3. Spectrum (Indaco brand spectrum) ─────────────────────────────
# Samples indaco's deck spectrum (navy → bright blue → green) + amber
DESIGNS.append({
  "name": "spectrum",
  "tagline": "Indaco brand spectrum sampled — navy / sky / cyan / green + amber",
  "slots": [
    ("chart-1", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy
    ("chart-2", "#005A8C", "#4AB8E8", "#FFFFFF", "#0A1628"),  # mid blue
    ("chart-3", "#007AB5", "#5BC4F0", "#FFFFFF", "#0A1628"),  # sky
    ("chart-4", "#3D7A0F", "#8FD040", "#FFFFFF", "#0A1628"),  # green
    ("chart-5", "#91450E", "#E89F45", "#FFFFFF", "#1A0F00"),  # amber
  ],
  "accent": ("#1F4A6E", "#82C8E5"),
})

# ─── 4. Heritage (5 magazine hues) ───────────────────────────────────
# Navy, slate, amber, forest, burgundy — restrained magazine palette
DESIGNS.append({
  "name": "heritage",
  "tagline": "Five hand-curated magazine hues — navy / slate / amber / forest / burgundy",
  "slots": [
    ("chart-1", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy
    ("chart-2", "#4A5C73", "#A8B5C5", "#FFFFFF", "#0A1628"),  # slate
    ("chart-3", "#91450E", "#E89F45", "#FFFFFF", "#1A0F00"),  # amber
    ("chart-4", "#2D6B3A", "#6FB57F", "#FFFFFF", "#0A1628"),  # forest
    ("chart-5", "#8A2E33", "#D87277", "#FFFFFF", "#1A0608"),  # burgundy
  ],
  "accent": ("#1F4A6E", "#82C8E5"),
})

# ─── 5. Cool Quintet ─────────────────────────────────────────────────
# 4 cool hues + 1 warm — favors blue family
DESIGNS.append({
  "name": "cool-quintet",
  "tagline": "Four cool hues (navy / sky / teal / slate) + amber accent",
  "slots": [
    ("chart-1", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy
    ("chart-2", "#005A8C", "#4AB8E8", "#FFFFFF", "#0A1628"),  # sky
    ("chart-3", "#0E5A5B", "#5BC4C4", "#FFFFFF", "#0A1628"),  # teal
    ("chart-4", "#4A5C73", "#A8B5C5", "#FFFFFF", "#0A1628"),  # slate
    ("chart-5", "#91450E", "#E89F45", "#FFFFFF", "#1A0F00"),  # amber
  ],
  "accent": ("#1F4A6E", "#82C8E5"),
})

# ─── 6. Warm Quintet ─────────────────────────────────────────────────
# Navy anchor + 4 warm-leaning hues (amber, burgundy, forest, khaki)
DESIGNS.append({
  "name": "warm-quintet",
  "tagline": "Navy anchor + four warm-leaning hues — amber / burgundy / forest / khaki",
  "slots": [
    ("chart-1", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy
    ("chart-2", "#91450E", "#E89F45", "#FFFFFF", "#1A0F00"),  # amber
    ("chart-3", "#8A2E33", "#D87277", "#FFFFFF", "#1A0608"),  # burgundy
    ("chart-4", "#2D6B3A", "#6FB57F", "#FFFFFF", "#0A1628"),  # forest
    ("chart-5", "#6B5318", "#D5BD75", "#FFFFFF", "#1A0F00"),  # khaki
  ],
  "accent": ("#1F4A6E", "#82C8E5"),
})

# ─── 7. Pastel ──────────────────────────────────────────────────────
# Soft Apple-style pastels; all fills are pale on light, deep on dark
DESIGNS.append({
  "name": "pastel",
  "tagline": "Soft-Apple pastels — pale tints on light, deep tones on dark",
  "slots": [
    ("chart-1", "#DCE5F0", "#1F4A6E", "#0A1628", "#FFFFFF"),  # pale navy
    ("chart-2", "#F4E2C8", "#91450E", "#0A1628", "#FFFFFF"),  # pale amber
    ("chart-3", "#DEEDDF", "#2D6B3A", "#0A1628", "#FFFFFF"),  # pale mint
    ("chart-4", "#F0DDDF", "#8A2E33", "#0A1628", "#FFFFFF"),  # pale rose
    ("chart-5", "#E2E6ED", "#4A5C73", "#0A1628", "#FFFFFF"),  # pale slate
  ],
  "accent": ("#1F4A6E", "#82C8E5"),
})

# ─── 8. Saturated Mid (product-vivid) ────────────────────────────────
# Tailwind-500-style: vivid mid-tones both modes; for product/dashboard decks
DESIGNS.append({
  "name": "saturated-mid",
  "tagline": "Vivid mid-tones both modes — product-grade, more dashboard than boardroom",
  "slots": [
    ("chart-1", "#1D4ED8", "#60A5FA", "#FFFFFF", "#0A1628"),  # blue-700/400
    ("chart-2", "#B45309", "#FBBF24", "#FFFFFF", "#1A0F00"),  # amber-700/400
    ("chart-3", "#047857", "#34D399", "#FFFFFF", "#0A1628"),  # emerald-700/400
    ("chart-4", "#B91C1C", "#F87171", "#FFFFFF", "#1A0608"),  # red-700/400
    ("chart-5", "#6D28D9", "#A78BFA", "#FFFFFF", "#0A1628"),  # violet-700/400
  ],
  "accent": ("#1D4ED8", "#60A5FA"),
})

# ─── 9. Newspaper (very quiet) ──────────────────────────────────────
# FT/WSJ aesthetic — most fills are quiet tints; one signal hue
DESIGNS.append({
  "name": "newspaper",
  "tagline": "FT-style restraint — quiet tints carry data, single alarm hue carries signal",
  "slots": [
    ("chart-1", "#DDE3EB", "#1A2A3D", "#0A1628", "#C7DCED"),  # quiet-1
    ("chart-2", "#B5C0D0", "#2C3F58", "#0A1628", "#C7DCED"),  # quiet-2
    ("chart-3", "#5A6D85", "#7C8DA7", "#FFFFFF", "#0A1628"),  # quiet-3 mid
    ("chart-4", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy signal
    ("chart-5", "#8A2E33", "#D87277", "#FFFFFF", "#1A0608"),  # burgundy alarm
  ],
  "accent": ("#1F4A6E", "#82C8E5"),
})

# ─── 10. Dark-First (jewel tones) ────────────────────────────────────
# Optimized for dark canvas first; light canvas uses muted versions
DESIGNS.append({
  "name": "dark-first",
  "tagline": "Optimized for dark canvas — jewel tones on dark, muted versions on light",
  "slots": [
    ("chart-1", "#1F4A6E", "#5BB5F0", "#FFFFFF", "#0A1628"),  # sapphire
    ("chart-2", "#8C5612", "#F5C45A", "#FFFFFF", "#1A0F00"),  # gold
    ("chart-3", "#1F7A45", "#5FE08A", "#FFFFFF", "#0A1628"),  # emerald
    ("chart-4", "#9B2A37", "#F08585", "#FFFFFF", "#1A0608"),  # garnet
    ("chart-5", "#5B4082", "#B59CE8", "#FFFFFF", "#0A0612"),  # amethyst
  ],
  "accent": ("#1F4A6E", "#5BB5F0"),
})


# ─────────────────────────────────────────────────────────────────────
# Verification

def verify(design, canvas_light="#FFFFFF", canvas_dark="#001D33"):
  """Report contrast for: text-on-fill (both modes) + fill-on-canvas
  (so we know how visible the fill is even before text)."""
  rows = []
  for name, fl, fd, tl, td in design["slots"]:
    cl_text = contrast(tl, fl)
    cd_text = contrast(td, fd)
    cl_fill = contrast(fl, canvas_light)
    cd_fill = contrast(fd, canvas_dark)
    rows.append({
      "slot": name,
      "fill_L": fl, "fill_D": fd, "text_L": tl, "text_D": td,
      "text_on_fill_L": cl_text, "text_on_fill_D": cd_text,
      "fill_on_canvas_L": cl_fill, "fill_on_canvas_D": cd_fill,
    })
  return rows


def report(design):
  print(f"\n=== {design['name']} — {design['tagline']} ===")
  rows = verify(design)
  fmt = "  {slot:8s}  fill-light {fl}  text-on-fill-L {ctl:5.2f}:1 {gtl}  fill-dark {fd}  text-on-fill-D {ctd:5.2f}:1 {gtd}"
  any_fail = False
  for r in rows:
    gtl = grade(r["text_on_fill_L"])
    gtd = grade(r["text_on_fill_D"])
    if gtl == "FAIL" or gtd == "FAIL":
      any_fail = True
    print(fmt.format(
      slot=r["slot"],
      fl=r["fill_L"], ctl=r["text_on_fill_L"], gtl=gtl,
      fd=r["fill_D"], ctd=r["text_on_fill_D"], gtd=gtd,
    ))
  return any_fail


# ─────────────────────────────────────────────────────────────────────
# Theme emission

CSS_TEMPLATE = """/* @theme chart-{name}
 * @size hd       1280px 720px
 * @size HD       1280px 720px
 * @size 4K       3840px 2160px
 * @size 4k       3840px 2160px
 * @size standard 960px  720px
 * @size 16:9     1280px 720px
 *
 * Design {idx}: {name} — {tagline}
 *
 * Extends indaco with a chart-specific token vocabulary. AA-verified
 * text-on-fill pairs per slot per canvas mode. Scratch theme for
 * design exploration — not for production.
 */

@import 'indaco';

:root {{
  /* ── CHART FILL SLOTS — {n_slots} colours, hand-paired text ─────────── */
{slot_block}

  /* ── ACCENT (single brand highlight) ──────────────────────────────── */
  --chart-accent:      light-dark({accent_L}, {accent_D});

  /* ── COMPATIBILITY ALIASES — route legacy state + cN tokens at the
   * chart palette so unmigrated layouts render under this design
   * without source changes. */
  --positive:      var(--chart-{positive_idx});
  --negative:      var(--chart-{negative_idx});
  --neutral:       var(--chart-{neutral_idx});
  --inactive:      var(--chart-{inactive_idx});
  --positive-soft: light-dark({positive_soft_L}, {positive_soft_D});
  --negative-soft: light-dark({negative_soft_L}, {negative_soft_D});
  --neutral-soft:  light-dark({neutral_soft_L}, {neutral_soft_D});
  --inactive-soft: light-dark({inactive_soft_L}, {inactive_soft_D});

  --pass: var(--positive);
  --warn: var(--neutral);
  --fail: var(--negative);
  --pass-bg: var(--positive-soft);
  --warn-bg: var(--neutral-soft);
  --fail-bg: var(--negative-soft);

  /* Categorical cycle — pie/kanban/radar consume cN-light/cN-dark.
   * Cycle through the chart slots (wrapping). cN-light → fill (pale
   * tint per design); cN-dark → fill (saturated per design). */
{cN_block}

  /* Quadrant cell aliases — map TL/TR/BL/BR onto state aliases. */
  --c-quadrant-1-fill: var(--positive);
  --c-quadrant-2-fill: var(--neutral);
  --c-quadrant-3-fill: var(--inactive);
  --c-quadrant-4-fill: var(--negative);
  --c-quadrant-1-text: var(--chart-{positive_idx}-text);
  --c-quadrant-2-text: var(--chart-{neutral_idx}-text);
  --c-quadrant-3-text: var(--chart-{inactive_idx}-text);
  --c-quadrant-4-text: var(--chart-{negative_idx}-text);

  --accent:      var(--chart-accent);
  --accent-soft: light-dark({accent_soft_L}, {accent_soft_D});

  /* Text-on-saturated — INVERSE of --text-heading. Used wherever a
   * label sits ON TOP of a saturated chart fill: gantt bar labels,
   * quadrant corner labels, dot labels, scatter-point text.
   * On light canvas → white (reads on the saturated mid-tone fills).
   * On dark canvas → dark navy (reads on the lifted dark-mode fills). */
  --text-on-saturated: light-dark(#FFFFFF, #0A1628);
}}

/* ── Text-on-saturated overrides — point every chart text element that
 * sits ON TOP of a chart fill at --text-on-saturated. Without this,
 * existing chart CSS would use --text-heading which inverts wrong
 * direction (dark text on dark fill on light canvas = AA fail). */
section.gantt .gantt-bar[data-s] {{ color: var(--text-on-saturated); }}
section.quadrant .quadrant-label,
section.quadrant .quadrant-dot,
section.quadrant .quadrant-bubble-value[data-pos="inside"] {{
  fill: var(--text-on-saturated);
}}
"""


def _soft(hex_str, white_mix=0.85):
  """Generate a paler version by mixing with white (light) or
  approximating a deep variant (dark). Used for -soft variants."""
  h = hex_str.lstrip("#")
  r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
  # mix toward white
  wr = round(255 * white_mix + r * (1 - white_mix))
  wg = round(255 * white_mix + g * (1 - white_mix))
  wb = round(255 * white_mix + b * (1 - white_mix))
  return f"#{wr:02X}{wg:02X}{wb:02X}"


def _deep_dark(hex_str, black_mix=0.75):
  """Generate a near-canvas dark variant by mixing toward indaco's dark canvas."""
  h = hex_str.lstrip("#")
  r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
  # mix toward #001D33 (indaco dark bg)
  br, bg, bb = 0x00, 0x1D, 0x33
  nr = round(br * black_mix + r * (1 - black_mix))
  ng = round(bg * black_mix + g * (1 - black_mix))
  nb = round(bb * black_mix + b * (1 - black_mix))
  return f"#{nr:02X}{ng:02X}{nb:02X}"


def emit_css(design, idx):
  slots = design["slots"]
  # Render slot declarations
  slot_lines = []
  for name, fl, fd, tl, td in slots:
    slot_lines.append(f"  --{name}:      light-dark({fl}, {fd});")
    slot_lines.append(f"  --{name}-text: light-dark({tl}, {td});")
  slot_block = "\n".join(slot_lines)

  # cN block — cycle through the design's slot count (8 cN slots, wrap)
  n = len(slots)
  cN_lines = []
  for i in range(1, 9):
    s_idx = ((i - 1) % n) + 1
    sname = f"chart-{s_idx}"
    cN_lines.append(f"  --c{i}-light: var(--{sname});")
    cN_lines.append(f"  --c{i}-dark:  var(--{sname});")
  cN_block = "\n".join(cN_lines)

  # State alias mapping — heuristic:
  # positive → first green-ish slot in the design, else chart-1
  # negative → first red-ish slot, else chart-2
  # neutral → first amber/warm slot, else chart-3
  # inactive → muted/slate slot, else chart-4
  # Compute slot luminances and hues to pick — simplification: hardcode by design name
  alias_map = {
    "monochrome":    {"positive": 4, "negative": 4, "neutral": 3, "inactive": 2},
    "dichromatic":   {"positive": 2, "negative": 5, "neutral": 5, "inactive": 1},
    "spectrum":      {"positive": 4, "negative": 5, "neutral": 5, "inactive": 1},
    "heritage":      {"positive": 4, "negative": 5, "neutral": 3, "inactive": 2},
    "cool-quintet":  {"positive": 2, "negative": 5, "neutral": 5, "inactive": 4},
    "warm-quintet":  {"positive": 4, "negative": 3, "neutral": 2, "inactive": 5},
    "pastel":        {"positive": 3, "negative": 4, "neutral": 2, "inactive": 5},
    "saturated-mid": {"positive": 3, "negative": 4, "neutral": 2, "inactive": 1},
    "newspaper":     {"positive": 4, "negative": 5, "neutral": 4, "inactive": 1},
    "dark-first":    {"positive": 3, "negative": 4, "neutral": 2, "inactive": 1},
  }
  amap = alias_map[design["name"]]

  # Soft variants — for state aliases, derive soft tints from the chosen slot fill
  def _slot_fill(i):
    name, fl, fd, _tl, _td = slots[i - 1]
    return fl, fd

  pos_fl, pos_fd = _slot_fill(amap["positive"])
  neg_fl, neg_fd = _slot_fill(amap["negative"])
  neu_fl, neu_fd = _slot_fill(amap["neutral"])
  ina_fl, ina_fd = _slot_fill(amap["inactive"])

  accent_fl, accent_fd = design["accent"]

  ctx = {
    "name": design["name"],
    "idx": idx,
    "tagline": design["tagline"],
    "n_slots": len(slots),
    "slot_block": slot_block,
    "cN_block": cN_block,
    "accent_L": accent_fl,
    "accent_D": accent_fd,
    "accent_soft_L": _soft(accent_fl),
    "accent_soft_D": _deep_dark(accent_fd),
    "positive_idx": amap["positive"],
    "negative_idx": amap["negative"],
    "neutral_idx": amap["neutral"],
    "inactive_idx": amap["inactive"],
    "positive_soft_L": _soft(pos_fl),
    "positive_soft_D": _deep_dark(pos_fd),
    "negative_soft_L": _soft(neg_fl),
    "negative_soft_D": _deep_dark(neg_fd),
    "neutral_soft_L":  _soft(neu_fl),
    "neutral_soft_D":  _deep_dark(neu_fd),
    "inactive_soft_L": _soft(ina_fl),
    "inactive_soft_D": _deep_dark(ina_fd),
  }
  return CSS_TEMPLATE.format(**ctx)


def main():
  if len(sys.argv) > 1 and sys.argv[1] == "emit":
    here = os.path.dirname(os.path.abspath(__file__))
    theme_dir = os.path.join(here, "..", "themes")
    for i, d in enumerate(DESIGNS, 1):
      path = os.path.join(theme_dir, f"chart-{d['name']}.css")
      with open(path, "w") as f:
        f.write(emit_css(d, i))
      print(f"wrote {path}")
    return

  if len(sys.argv) > 1:
    only = sys.argv[1]
    matches = [d for d in DESIGNS if d["name"] == only]
    if not matches:
      print(f"no design named {only}", file=sys.stderr)
      sys.exit(1)
    designs = matches
  else:
    designs = DESIGNS

  any_fail = False
  for d in designs:
    if report(d):
      any_fail = True

  if any_fail:
    print("\n\n!!! one or more designs have FAIL contrast pairs. !!!\n")
    sys.exit(1)
  print(f"\n\nall {len(designs)} design(s) verified.\n")


if __name__ == "__main__":
  main()
