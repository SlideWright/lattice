#!/usr/bin/env python3
"""Chart palette iteration tool.

Each palette: 5 slots (chart-1..5) as (light_fill, dark_fill, light_text,
dark_text) tuples. AA-verified per pair. Emits scratch themes; renders
all-charts deck against each.

Usage:
  python3 tools/chart-palette-iter.py            # list + verify
  python3 tools/chart-palette-iter.py emit       # write 5 scratch themes
  python3 tools/chart-palette-iter.py render     # full render sweep
"""

import os
import sys
import subprocess


def _channel(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

def lum(hex_str):
    h = hex_str.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)

def contrast(a, b):
    l1, l2 = lum(a), lum(b)
    if l1 < l2: l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

def grade(c):
    if c >= 7.0: return "AAA"
    if c >= 4.5: return "AA "
    if c >= 3.0: return "AAL"
    return "FAIL"


PALETTES = []

# ─── A. Heritage v2 ─────────────────────────────────────────────────
# Current heritage with chroma slightly tightened for cohesion.
# Slate moved warmer (warm-grey instead of cool slate) so all 5 read
# as a unified family rather than 3 warm + 2 cool.
PALETTES.append({
  "name": "heritage-v2",
  "tagline": "Heritage refined — slate warmed to taupe, chroma tightened",
  "slots": [
    ("chart-1", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy
    ("chart-2", "#5E5547", "#B5AC9F", "#FFFFFF", "#1A1308"),  # warm taupe
    ("chart-3", "#8C4A14", "#E89A45", "#FFFFFF", "#1A0F00"),  # warm amber
    ("chart-4", "#3D6B3A", "#7AB57F", "#FFFFFF", "#0A1810"),  # sage forest
    ("chart-5", "#8A2E33", "#D87277", "#FFFFFF", "#1A0608"),  # burgundy
  ],
})

# ─── B. Mid-century ──────────────────────────────────────────────────
# 1960s annual-report palette — petrol blue, mustard, sage, brick, taupe.
# Pulled chroma; warm-leaning; magazine-grade.
PALETTES.append({
  "name": "midcentury",
  "tagline": "1960s annual report — petrol blue, mustard, sage, brick, taupe",
  "slots": [
    ("chart-1", "#1F4A6E", "#7BBED9", "#FFFFFF", "#0A1628"),  # petrol blue
    ("chart-2", "#6B5C4F", "#BFB3A5", "#FFFFFF", "#1A1308"),  # warm taupe
    ("chart-3", "#946718", "#E3B65A", "#FFFFFF", "#1A0F00"),  # mustard
    ("chart-4", "#5C7B5A", "#A5C3A2", "#FFFFFF", "#0A1810"),  # sage
    ("chart-5", "#963338", "#D27277", "#FFFFFF", "#1A0608"),  # brick
  ],
})

# ─── C. Restrained Magazine ─────────────────────────────────────────
# Monocle / Apartamento aesthetic — pulled-back chroma, mid-luminance,
# every color is "dusty" or "muted". Most uniformly understated.
PALETTES.append({
  "name": "restrained",
  "tagline": "Dusty magazine palette — every hue muted to the same finish",
  "slots": [
    ("chart-1", "#2A4566", "#8FB6D4", "#FFFFFF", "#0A1628"),  # dusty navy
    ("chart-2", "#6B6258", "#BFB4A8", "#FFFFFF", "#1A1308"),  # warm grey
    ("chart-3", "#9C6620", "#E0A858", "#FFFFFF", "#1A0F00"),  # dusty amber
    ("chart-4", "#5F7140", "#A8BC85", "#FFFFFF", "#0A1810"),  # khaki olive
    ("chart-5", "#8E3F44", "#D08488", "#FFFFFF", "#1A0608"),  # dusty wine
  ],
})

# ─── D. Apple iWork ──────────────────────────────────────────────────
# Higher chroma, brighter, harmonized like Apple Numbers/Keynote's
# default chart colours. Closer to "product" but still tasteful.
PALETTES.append({
  "name": "iwork",
  "tagline": "Apple iWork-style — vivid harmonized accents",
  "slots": [
    ("chart-1", "#1C5489", "#5FA8DD", "#FFFFFF", "#0A1628"),  # ocean blue
    ("chart-2", "#6E6E73", "#B8B8BD", "#FFFFFF", "#1A1A1F"),  # apple stone
    ("chart-3", "#A55812", "#F0A050", "#FFFFFF", "#1A0F00"),  # warm orange
    ("chart-4", "#2D8050", "#62C788", "#FFFFFF", "#0A1810"),  # vivid green
    ("chart-5", "#A8333D", "#E07178", "#FFFFFF", "#1A0608"),  # red
  ],
})

# ─── E. Pentagram Classics ──────────────────────────────────────────
# Bold, limited, edition-design palette. Pentagram's Penguin Classics
# vibe — strong colour identities, slight cream undertone in warm hues.
PALETTES.append({
  "name": "pentagram",
  "tagline": "Pentagram Classics — bold edition-design colour identities",
  "slots": [
    ("chart-1", "#16385C", "#6FB0D4", "#FFFFFF", "#0A1628"),  # deep navy
    ("chart-2", "#3F4244", "#9FA6AB", "#FFFFFF", "#1A1A1F"),  # charcoal
    ("chart-3", "#AD560E", "#F0A04A", "#FFFFFF", "#1A0F00"),  # bright orange
    ("chart-4", "#1F6D2F", "#5BB276", "#FFFFFF", "#0A1810"),  # bookplate green
    ("chart-5", "#9A2027", "#D86A70", "#FFFFFF", "#1A0608"),  # penguin red
  ],
})

# ─── F. Tonal Cool ──────────────────────────────────────────────────
# All five hues live in the cool half of the wheel + one warm anchor.
# Most indaco-coherent — feels like a deck-wide brand wash.
PALETTES.append({
  "name": "tonal-cool",
  "tagline": "Tonal cool — four cool hues + one warm anchor",
  "slots": [
    ("chart-1", "#1F4A6E", "#82C8E5", "#FFFFFF", "#0A1628"),  # navy
    ("chart-2", "#3D6890", "#7AAACB", "#FFFFFF", "#0A1628"),  # mid-blue
    ("chart-3", "#1F6B6B", "#5FB5B5", "#FFFFFF", "#0A1628"),  # teal
    ("chart-4", "#4F4F7B", "#9595BC", "#FFFFFF", "#0A0A1F"),  # indigo-grey
    ("chart-5", "#A05015", "#E3A45A", "#FFFFFF", "#1A0F00"),  # warm anchor
  ],
})


def verify_pair(slot):
    name, fl, fd, tl, td = slot
    cl, cd = contrast(tl, fl), contrast(td, fd)
    return name, fl, fd, tl, td, cl, cd, grade(cl), grade(cd)


def report(p):
    print(f"\n=== {p['name']:14s} — {p['tagline']}")
    fail = False
    for slot in p["slots"]:
        name, fl, fd, tl, td, cl, cd, gl, gd = verify_pair(slot)
        marker = "  " if (gl != "FAIL" and gd != "FAIL") else "!!"
        print(f"  {marker} {name}  L {fl} txt {tl} {cl:5.2f}:1 {gl}    D {fd} txt {td} {cd:5.2f}:1 {gd}")
        if gl == "FAIL" or gd == "FAIL":
            fail = True
    return fail


CSS = """/* @theme chart-{name}
 * @size hd       1280px 720px
 * @size HD       1280px 720px
 * @size 4K       3840px 2160px
 * @size 4k       3840px 2160px
 * @size standard 960px  720px
 * @size 16:9     1280px 720px
 *
 * Palette iteration: {name} — {tagline} */

@import 'indaco';

:root {{
{block}
  --chart-accent: var(--chart-1);
  --text-on-saturated: light-dark(#FFFFFF, #0A1628);
}}
"""


def emit(p):
    lines = []
    for name, fl, fd, tl, td in p["slots"]:
        lines.append(f"  --{name}:      light-dark({fl}, {fd});")
        lines.append(f"  --{name}-text: light-dark({tl}, {td});")
    # soft variants — derive paler versions (mix toward canvas)
    for name, fl, fd, tl, td in p["slots"]:
        sl = _soft(fl, 0.86)
        sd = _deep(fd, 0.78)
        lines.append(f"  --{name}-soft: light-dark({sl}, {sd});")
    block = "\n".join(lines)
    return CSS.format(name=p["name"], tagline=p["tagline"], block=block)


def _soft(hex_str, white_mix):
    h = hex_str.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    wr = round(255 * white_mix + r * (1 - white_mix))
    wg = round(255 * white_mix + g * (1 - white_mix))
    wb = round(255 * white_mix + b * (1 - white_mix))
    return f"#{wr:02X}{wg:02X}{wb:02X}"


def _deep(hex_str, dark_mix):
    h = hex_str.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    nr = round(0x00 * dark_mix + r * (1 - dark_mix))
    ng = round(0x1D * dark_mix + g * (1 - dark_mix))
    nb = round(0x33 * dark_mix + b * (1 - dark_mix))
    return f"#{nr:02X}{ng:02X}{nb:02X}"


def cmd_emit():
    here = os.path.dirname(os.path.abspath(__file__))
    theme_dir = os.path.join(here, "..", "themes")
    for p in PALETTES:
        path = os.path.join(theme_dir, f"chart-{p['name']}.css")
        with open(path, "w") as f:
            f.write(emit(p))
        print(f"wrote {path}")


def cmd_render():
    cmd_emit()
    chrome = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
    src_l = ".scratch/state-token-test/all-charts.light.md"
    src_d = ".scratch/state-token-test/all-charts.dark.md"
    out = ".scratch/palette-iter"
    os.makedirs(out, exist_ok=True)
    for p in PALETTES:
        for variant, src in [("light", src_l), ("dark", src_d)]:
            dest = os.path.join(out, f"{p['name']}.{variant}.pdf")
            env = os.environ.copy()
            env["PUPPETEER_EXECUTABLE_PATH"] = chrome
            subprocess.run(
                ["node", "lattice-emulator.js", src, dest, "-p", f"chart-{p['name']}"],
                env=env, capture_output=True
            )
            print(f"rendered {dest}")


def cmd_list():
    any_fail = False
    for p in PALETTES:
        if report(p):
            any_fail = True
    if any_fail:
        print("\nSome pairs FAIL AA-large.")
        sys.exit(1)
    print(f"\nAll {len(PALETTES)} palettes pass AA-large.")


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    {"emit": cmd_emit, "render": cmd_render, "list": cmd_list}[cmd]()


if __name__ == "__main__":
    main()
