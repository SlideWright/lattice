#!/usr/bin/env python3
"""Contrast checker for chart token pairs.

Reads a JSON manifest of (label, fill_hex, text_hex) tuples per canvas
mode and prints WCAG contrast ratios + pass/fail (AA = 4.5, AA-large = 3,
AAA = 7).

Usage:
  echo '[
    ["chart-1 light", "#1F4A6E", "#FFFFFF"],
    ["chart-1 dark",  "#4F9DC8", "#0A1628"]
  ]' | python3 tools/contrast.py
"""

import json
import sys
import re


def _channel(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_str):
    h = hex_str.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def contrast(fg, bg):
    l1, l2 = luminance(fg), luminance(bg)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def grade(c):
    if c >= 7.0:
        return "AAA"
    if c >= 4.5:
        return "AA "
    if c >= 3.0:
        return "AA-large"
    return "FAIL"


def check_pairs(pairs):
    """Each pair: [label, fill, text] — text on fill."""
    out = []
    for label, fill, text in pairs:
        c = contrast(text, fill)
        out.append((label, fill, text, c, grade(c)))
    return out


def fmt(rows):
    width = max(len(r[0]) for r in rows)
    for label, fill, text, c, g in rows:
        print(f"  {label:<{width}}  fill {fill}  text {text}  {c:5.2f}:1  {g}")


def main():
    raw = sys.stdin.read()
    pairs = json.loads(raw)
    rows = check_pairs(pairs)
    fmt(rows)
    fails = [r for r in rows if r[4] == "FAIL"]
    if fails:
        print(f"\n  {len(fails)} pair(s) failed AA-large (< 3:1).", file=sys.stderr)
        sys.exit(1)
    print(f"\n  all {len(rows)} pair(s) pass AA-large.")


if __name__ == "__main__":
    main()
