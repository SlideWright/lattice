#!/usr/bin/env bash
# Rasterize a region of a PDF for inline review at FULL QUALITY.
#
# Lattice is a design system. Visual fidelity matters: font edges,
# gradient stops, palette accuracy, image rendering. Downscaling a
# rasterized slide to fit a session image limit defeats the purpose
# of looking — you'd be reviewing a blurred approximation of the
# very thing you're trying to verify.
#
# This wrapper rasterizes at NATIVE DPI and supports cropping to a
# region. The 2000px API limit on session inline images forces
# discipline: if a whole slide doesn't fit, identify the specific
# region you're checking and render only that, at full quality.
#
# Two modes:
#
# 1. WHOLE SLIDE — for HD decks (≤2000px at any sensible DPI). Use
#    --check to verify the output fits before sending. If it doesn't,
#    use mode 2.
#
# 2. CROPPED REGION — for 4K decks or any time you want to inspect
#    a specific area. Specify the crop via --crop "WxH+X+Y" using
#    standard ImageMagick geometry, or use a shortcut like
#    --region top|bottom|left|right|center|top-left|...
#
# Output goes to /tmp/<pdf-basename>/ by default; pass an explicit
# directory as the second positional arg to override.
#
# Usage:
#   tools/rasterize-for-review.sh <pdf> [output-dir] [options]
#
# Options:
#   -r, --dpi <n>          rasterize at <n> DPI (default 100)
#   -f, --first <n>        first page to render (default: all)
#   -l, --last <n>         last page to render
#   --crop <WxH+X+Y>       crop each page to this ImageMagick geometry
#                          (e.g. --crop "1500x900+0+0" for top-left)
#   --region <name>        shorthand crop — one of:
#                            top, bottom, left, right, center,
#                            top-left, top-right, bottom-left, bottom-right
#                          (each carves a ~half-slide region)
#   --check                rasterize, check dimensions, ERROR if any
#                          page exceeds 2000px on longest side
#                          (use this before sending without --crop
#                          so you know the output is safe)
#   -h, --help             show this help
#
# Exit codes:
#   0  success
#   1  bad args / missing tools
#   2  PDF doesn't exist
#   3  --check failed (output exceeds 2000px)
#
# Requires: pdftoppm (poppler-utils), mogrify + identify (ImageMagick).
#
# See CLAUDE.md "Rasterize PDFs through tools/rasterize-for-review.sh".

set -euo pipefail

usage() {
  sed -n '/^# Usage:/,/^# Requires:/p' "$0" >&2
  exit 1
}

pdf=""
out_dir=""
dpi=100
first=""
last=""
crop=""
region=""
check=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -r|--dpi)    dpi="$2";    shift 2 ;;
    -f|--first)  first="$2";  shift 2 ;;
    -l|--last)   last="$2";   shift 2 ;;
    --crop)      crop="$2";   shift 2 ;;
    --region)    region="$2"; shift 2 ;;
    --check)     check=1;     shift   ;;
    -h|--help)   usage ;;
    -*)          echo "unknown flag: $1" >&2; usage ;;
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
[[ -n "$crop" && -n "$region" ]] && { echo "error: pass --crop OR --region, not both" >&2; exit 1; }

command -v pdftoppm >/dev/null || { echo "error: pdftoppm not installed (poppler-utils)" >&2; exit 1; }
command -v mogrify  >/dev/null || { echo "error: mogrify not installed (ImageMagick)"     >&2; exit 1; }
command -v identify >/dev/null || { echo "error: identify not installed (ImageMagick)"    >&2; exit 1; }

if [[ -z "$out_dir" ]]; then
  base="$(basename "$pdf" .pdf)"
  out_dir="/tmp/$base"
fi
mkdir -p "$out_dir"

# Rasterize at native DPI, no downsampling.
page_args=()
[[ -n "$first" ]] && page_args+=( -f "$first" )
[[ -n "$last"  ]] && page_args+=( -l "$last"  )
pdftoppm -r "$dpi" -png "${page_args[@]}" "$pdf" "$out_dir/p" >&2

# Resolve --region shorthand into an ImageMagick geometry.
# Each region carves out roughly half the slide (or a quadrant).
if [[ -n "$region" ]]; then
  # Need image dimensions from the first rendered page. Use a
  # subshell to capture identify's output — `read` with a here-string
  # avoids the no-trailing-newline issue that process substitution
  # of `identify -format` hits.
  first_png="$(ls "$out_dir"/p-*.png | head -1)"
  dims="$(identify -format "%w %h" "$first_png")"
  W="${dims% *}"
  H="${dims#* }"
  HW=$((W / 2))
  HH=$((H / 2))
  case "$region" in
    top)          crop="${W}x${HH}+0+0"           ;;
    bottom)       crop="${W}x${HH}+0+${HH}"       ;;
    left)         crop="${HW}x${H}+0+0"           ;;
    right)        crop="${HW}x${H}+${HW}+0"       ;;
    center)       crop="${HW}x${HH}+$((W/4))+$((H/4))" ;;
    top-left)     crop="${HW}x${HH}+0+0"          ;;
    top-right)    crop="${HW}x${HH}+${HW}+0"      ;;
    bottom-left)  crop="${HW}x${HH}+0+${HH}"      ;;
    bottom-right) crop="${HW}x${HH}+${HW}+${HH}"  ;;
    *) echo "error: unknown --region '$region'" >&2; exit 1 ;;
  esac
fi

# Apply crop if requested. mogrify crops in place.
if [[ -n "$crop" ]]; then
  mogrify -crop "$crop" +repage "$out_dir"/p-*.png
fi

# --check: every output must fit under 2000px on the longest side.
# Refuses to succeed if any page is too large (forces you to crop
# or lower DPI rather than blindly sending oversized images).
if [[ $check -eq 1 ]]; then
  bad=0
  for f in "$out_dir"/p-*.png; do
    dims="$(identify -format "%w %h" "$f")"
    W="${dims% *}"
    H="${dims#* }"
    if [[ $W -gt 2000 || $H -gt 2000 ]]; then
      echo "FAIL: $f is ${W}x${H} (>2000px on longest side)" >&2
      bad=1
    fi
  done
  if [[ $bad -eq 1 ]]; then
    echo "" >&2
    echo "Use --crop or --region to extract a specific area, OR" >&2
    echo "lower --dpi so the rasterized output fits. NEVER" >&2
    echo "downscale — this is a design system, visual fidelity" >&2
    echo "is what we're checking." >&2
    exit 3
  fi
fi

# Print written paths (one per line) for shell composition.
ls "$out_dir"/p-*.png
