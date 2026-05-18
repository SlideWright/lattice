#!/usr/bin/env bash
# Rasterize a PDF to PNGs sized for safe inline review.
#
# The conversation API used to drive Claude sessions caps inline
# images at 2000px on the longest side; oversized images break the
# session. The existing codebase tools (pixel-check.js, preview.js)
# rasterize at 72dpi which is naturally safe for HD decks, but
# breaks for 4K decks (3840×2160pt → ~3840px PNG at 72dpi). Ad-hoc
# `pdftoppm -r 100` on a 4K deck produces ~5333×3000 PNGs — over
# the limit, and one such image is enough to start failing the
# session.
#
# This wrapper does the two-step safe pattern:
#   1. pdftoppm at modest DPI (default 100, override with -r)
#   2. mogrify -resize '1600x1600>' to clamp anything still over
#      1600px — idempotent for already-small images, downsizes
#      large ones. The `>` suffix means "only shrink if larger"
#      so HD output passes through untouched.
#
# Use this for any one-off rasterization meant for human review
# (Read tool on a PNG, SendUserFile of a rendered slide). The
# codebase's automated diff pipelines (pixel-check, preview) have
# their own rasterization at 72dpi and don't need this wrapper.
#
# Usage:
#   tools/rasterize-for-review.sh <pdf> [<output-dir>] [-r dpi] [-f first-page] [-l last-page]
#
# Defaults:
#   output-dir = /tmp/<pdf-basename-without-extension>/
#   dpi        = 100 (clamped to <=1600px on output regardless)
#   first/last = all pages
#
# Output:
#   Writes <output-dir>/p-NN.png for each rasterized page.
#   Prints the list of written paths to stdout so the command
#   composes with shells: `xargs -n1 echo`, etc.
#
# Exit codes:
#   0  success
#   1  bad args / missing tools / pdftoppm or mogrify failure
#   2  PDF doesn't exist or is unreadable
#
# Requires: pdftoppm (poppler-utils), mogrify (ImageMagick).
#
# See CLAUDE.md "Rasterize PDFs through tools/rasterize-for-review.sh".

set -euo pipefail

usage() {
  cat >&2 <<EOF
usage: tools/rasterize-for-review.sh <pdf> [<output-dir>] [-r dpi] [-f first] [-l last]

Rasterizes <pdf> to PNGs capped at 1600px on the longest side,
safe for inline review in a conversation session.
EOF
  exit 1
}

# Parse positional + flags. PDF and optional output-dir are
# positional; -r/-f/-l are flags. Keep it simple — no getopts.
pdf=""
out_dir=""
dpi=100
first=""
last=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -r) dpi="$2"; shift 2 ;;
    -f) first="$2"; shift 2 ;;
    -l) last="$2"; shift 2 ;;
    -h|--help) usage ;;
    -*) echo "unknown flag: $1" >&2; usage ;;
    *)
      if [[ -z "$pdf" ]]; then
        pdf="$1"
      elif [[ -z "$out_dir" ]]; then
        out_dir="$1"
      else
        echo "extra positional arg: $1" >&2; usage
      fi
      shift
      ;;
  esac
done

[[ -z "$pdf" ]] && usage
[[ -f "$pdf" ]] || { echo "error: $pdf not found" >&2; exit 2; }

command -v pdftoppm >/dev/null || { echo "error: pdftoppm not installed (poppler-utils)" >&2; exit 1; }
command -v mogrify >/dev/null  || { echo "error: mogrify not installed (ImageMagick)"  >&2; exit 1; }

# Default output dir: /tmp/<basename-without-.pdf>/
if [[ -z "$out_dir" ]]; then
  base="$(basename "$pdf" .pdf)"
  out_dir="/tmp/$base"
fi

mkdir -p "$out_dir"

# Rasterize. The page-range flags are optional.
page_args=()
[[ -n "$first" ]] && page_args+=( -f "$first" )
[[ -n "$last"  ]] && page_args+=( -l "$last" )

pdftoppm -r "$dpi" -png "${page_args[@]}" "$pdf" "$out_dir/p" >&2

# Clamp every output to <=1600px on the longest side. The `>`
# suffix on the geometry tells mogrify to ONLY shrink — never
# upscale. So already-small images (HD at 72dpi etc.) pass through
# untouched while oversized ones (4K at 100dpi etc.) get clamped.
mogrify -resize '1600x1600>' "$out_dir"/p-*.png

# Print written paths (newline-separated) for easy composition.
ls "$out_dir"/p-*.png
