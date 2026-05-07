#!/usr/bin/env python3
"""
ASCII layout preview helper for docs/references/templates.md (and friends).

Two modes:

  audit  — scan every ```text fenced block in a markdown file and report
           any block whose framed rows aren't all the same length, plus
           any rows whose outer-wall padding is asymmetric or smaller
           than the canonical 2 spaces.

  build  — programmatic builder for the canonical 43-wide preview blocks
           used in templates.md. Importable as a module, or runnable
           directly to print every standard layout to stdout for review.

Canonical geometry (templates.md):

    outer width:        43 chars   (┌─...─┐ / └─...─┘)
    outer wall pad:     2 spaces   (lead and trail inside the │ walls)
    inner content area: 37 chars   (between the 2-pad walls)
    2-card grid:        16-wide cards, 5-space gap   (16 + 5 + 16 = 37)
    comparison arrow:   "  →  "   sits in the same 5-space gap
    3-col table:        11-wide columns with shared edges (37 total)

Why this exists:

    These previews drift over time as authors hand-edit them. The result
    is mixed widths, asymmetric padding, and stray fence artifacts that
    only become visible in rendered preview. This script makes the
    geometry programmatic so any rebuild stays uniform.

Usage:

    python3 tools/ascii-preview.py audit docs/references/templates.md
    python3 tools/ascii-preview.py build           # prints all canonical blocks

History note:

    Created 2026-05-07 after a sweep that unified 33 ASCII previews to
    43-wide / pad-2 / gap-5 geometry. Same pass also caught a renderer
    bug (an orphan ```text fence wrapping the bullet list and heading
    of the next template — see commit history for the full lesson).
"""

from __future__ import annotations
import argparse
import re
import sys

# ----- canonical geometry --------------------------------------------------

OUTER = 43            # full row width including walls
PAD = 2               # spaces between │ wall and content
INNER = OUTER - 2     # 41 chars between │…│
CONTENT = INNER - 2 * PAD  # 37 chars of content area

CARD_W = 16           # 2-card layout
GAP = 5               # 16 + 5 + 16 = 37 ✓
TABLE_COL = 11        # 11×3 with shared edges = 37


# ----- frame builders -------------------------------------------------------

def frame(rows: list[tuple]) -> str:
    """Build a 43-wide framed block from a row spec list.

    Row kinds:
      ('center', text)              — centered in the 37-char content area
      ('left',   text)              — left-anchored in the content area
      ('split',  left, right)       — left at start, right at end of content
      ('blank',)                    — fully blank inner row
      ('raw',    text37)            — text already exactly 37 chars wide
    """
    out = ['┌' + '─' * INNER + '┐']
    for r in rows:
        kind = r[0]
        if kind == 'center':
            s = r[1]
            pad = CONTENT - len(s)
            l, rr = pad // 2, pad - pad // 2
            out.append('│' + ' ' * PAD + ' ' * l + s + ' ' * rr + ' ' * PAD + '│')
        elif kind == 'left':
            s = r[1]
            out.append('│' + ' ' * PAD + s + ' ' * (CONTENT - len(s)) + ' ' * PAD + '│')
        elif kind == 'split':
            l, rr = r[1], r[2]
            mid = CONTENT - len(l) - len(rr)
            out.append('│' + ' ' * PAD + l + ' ' * mid + rr + ' ' * PAD + '│')
        elif kind == 'blank':
            out.append('│' + ' ' * INNER + '│')
        elif kind == 'raw':
            s = r[1]
            if len(s) != CONTENT:
                raise ValueError(f"raw row must be {CONTENT} chars, got {len(s)}: {s!r}")
            out.append('│' + ' ' * PAD + s + ' ' * PAD + '│')
        else:
            raise ValueError(f"unknown row kind: {kind!r}")
    out.append('└' + '─' * INNER + '┘')
    return '\n'.join(out)


# ----- card primitives ------------------------------------------------------

def card_top() -> str:
    return '┌' + '─' * (CARD_W - 2) + '┐'


def card_bot() -> str:
    return '└' + '─' * (CARD_W - 2) + '┘'


def card_row(text: str) -> str:
    body = CARD_W - 2
    return '│ ' + text + ' ' * (body - 1 - len(text)) + '│'


def two_cards(L: str, R: str) -> tuple:
    return ('raw', L + ' ' * GAP + R)


def two_cards_arrow(L: str, R: str) -> tuple:
    """Like two_cards but with '  →  ' (5 chars) in the gap."""
    return ('raw', L + '  →  ' + R)


# ----- table primitives -----------------------------------------------------

def table_top() -> str:
    c = TABLE_COL
    return '┌' + '─' * c + '┬' + '─' * c + '┬' + '─' * c + '┐'


def table_sep() -> str:
    c = TABLE_COL
    return '├' + '─' * c + '┼' + '─' * c + '┼' + '─' * c + '┤'


def table_bot() -> str:
    c = TABLE_COL
    return '└' + '─' * c + '┴' + '─' * c + '┴' + '─' * c + '┘'


def _cell(t: str) -> str:
    return ' ' + t + ' ' * (TABLE_COL - 1 - len(t))


def table_row(a: str, b: str, c: str) -> tuple:
    return ('raw', '│' + _cell(a) + '│' + _cell(b) + '│' + _cell(c) + '│')


# ----- audit ----------------------------------------------------------------

def audit(path: str) -> int:
    """Walk every ```text block in a markdown file, report any anomalies.
    Returns the number of issues found.
    """
    issues: list[str] = []
    blocks = 0
    in_block = False
    buf: list[tuple[int, str]] = []
    start = 0

    with open(path, encoding='utf-8') as f:
        for i, raw in enumerate(f, 1):
            line = raw.rstrip('\n')
            if line == '```text':
                in_block = True
                buf = []
                start = i
                continue
            if in_block and line.startswith('```'):
                in_block = False
                blocks += 1
                widths = {len(l) for _, l in buf if l.strip()}
                if widths and widths != {OUTER}:
                    issues.append(
                        f"L{start}: widths {sorted(widths)} (expected {{{OUTER}}})"
                    )
                for li, l in buf:
                    if len(l) != OUTER or not (l.startswith('│') and l.endswith('│')):
                        continue
                    inner = l[1:-1]
                    if not inner.strip():
                        continue
                    if any(c in inner for c in '┌└├┬┴┤'):
                        continue
                    lead = len(inner) - len(inner.lstrip(' '))
                    trail = len(inner) - len(inner.rstrip(' '))
                    if lead < PAD or trail < PAD:
                        issues.append(
                            f"L{li}: lead={lead} trail={trail} (expected ≥{PAD}): {l}"
                        )
                continue
            if in_block:
                buf.append((i, line))

    print(f"{blocks} ```text blocks scanned, {len(issues)} issue(s)")
    for x in issues:
        print(f"  {x}")
    return len(issues)


# ----- build (demo / library entry point) -----------------------------------

def demo_blocks() -> dict[str, str]:
    """Return a dict of canonical templates.md ASCII blocks, keyed by id."""
    blocks: dict[str, str] = {}

    blocks['T7-card-grid-2x2'] = frame([
        ('left', 'header'),
        ('center', 'LABEL'),
        ('center', 'Grid Title'),
        ('blank',),
        two_cards(card_top(), card_top()),
        two_cards(card_row('Card Title 1'), card_row('Card Title 2')),
        two_cards(card_row('content'), card_row('content')),
        two_cards(card_bot(), card_bot()),
        two_cards(card_top(), card_top()),
        two_cards(card_row('Card Title 3'), card_row('Card Title 4')),
        two_cards(card_row('content'), card_row('content')),
        two_cards(card_bot(), card_bot()),
        ('split', 'footer', '1/19'),
    ])

    blocks['T11-comparison'] = frame([
        ('left', 'header'),
        ('center', 'LABEL'),
        ('center', 'Comparison Title'),
        ('blank',),
        two_cards(card_top(), card_top()),
        two_cards_arrow(card_row('Before /'), card_row('After /')),
        two_cards(card_row('Option A'), card_row('Option B')),
        two_cards(card_row(''), card_row('')),
        two_cards(card_bot(), card_bot()),
        ('blank',),
        ('split', 'footer', '1/19'),
    ])

    blocks['T22-compare-table'] = frame([
        ('left', 'header'),
        ('left', 'LABEL'),
        ('left', 'Here are the numbers side by side.'),
        ('blank',),
        ('raw', table_top()),
        table_row('', 'Option A', 'Option B'),
        ('raw', table_sep()),
        table_row('Row 1', '✓', '✕'),
        table_row('Row 2', '✕', '✓'),
        table_row('Row 3', '✓', '✓'),
        table_row('Row 4', '⚠', '✓'),
        ('raw', table_bot()),
        ('left', 'Footnote text for scope caveats.'),
        ('split', 'footer', '11/19'),
    ])

    return blocks


# ----- cli ------------------------------------------------------------------

def main(argv: list[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[1])
    sub = p.add_subparsers(dest='cmd', required=True)

    pa = sub.add_parser('audit', help='audit a markdown file for off-spec blocks')
    pa.add_argument('path', help='markdown file with ```text preview blocks')

    sub.add_parser('build', help='print canonical demo blocks to stdout')

    args = p.parse_args(argv)

    if args.cmd == 'audit':
        return 0 if audit(args.path) == 0 else 1
    if args.cmd == 'build':
        for name, body in demo_blocks().items():
            print(f"=== {name} ===")
            print(body)
            print()
        return 0
    return 2


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
