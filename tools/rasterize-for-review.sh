#!/usr/bin/env bash
# Rasterize a PDF for inline review at FULL QUALITY.
#
# Lattice is a design system. Visual fidelity matters: font edges,
# gradient stops, palette accuracy, image rendering. Downscaling a
# rasterized slide to fit a session image limit defeats the purpose
# of looking — you'd be reviewing a blurred approximation of the
# very thing you're trying to verify.
#
# IMPORTANT distinction: low-DPI rasterization is NOT downscaling.
# A vector PDF rendered at 30dpi produces a small image whose text
# shapes are still computed at full mathematical precision — they're
# just sampled to a coarser pixel grid. Edges are aliased, shapes
# are correct. This is the right approach for OVERVIEW renders that
# need to fit the API's 2000px-per-image limit on a 4K canvas.
# Downscaling (rasterize high, then mogrify -resize) is different:
# information is lost because the high-resolution sampling gets
# averaged into fewer pixels.
#
# Three modes:
#
# 1. DEFAULT (--check) — render at user-specified DPI (default 100),
#    no resize. For HD decks this fits naturally. For 4K decks, use
#    --check to confirm before sending; it fails loudly if output
#    exceeds 2000px on longest side.
#
# 2. OVERVIEW (--overview) — auto-compute a DPI so the whole slide
#    fits under 2000px. Output is the full layout at the right
#    resolution to be inline-reviewable. Use to see big picture
#    before drilling into a region.
#
# 3. CROPPED REGION (--region or --crop) — render at full --dpi,
#    then crop to a specific area. Use for detail inspection after
#    overview identifies where to look.
#
# Usage:
#   tools/rasterize-for-review.sh <pdf> [output-dir] [options]
#
# Options:
#   -r, --dpi <n>          rasterize at <n> DPI (default 100; ignored
#                          when --overview is set)
#   -f, --first <n>        first page to render (default: all)
#   -l, --last <n>         last page to render
#   --overview             auto-pick DPI so whole slide fits under
#                          2000px on longest side. Best for "show me
#                          the big picture" inspection.
#   --crop <WxH+X+Y>       crop each page to this ImageMagick geometry
#   --region <name>        shorthand crop, always clamped to <=2000px
#                          on longest side. One of:
#                            top, bottom, left, right, center,
#                            top-left, top-right, bottom-left, bottom-right
#   --check                verify output fits under 2000px; exit 3 if not
#   -h, --help             show this help
#
# Exit codes:
#   0  success
#   1  bad args / missing tools
#   2  PDF doesn't exist
#   3  --check failed (output exceeds 2000px)
#
# Requires: pdftoppm (poppler-utils), mogrify + identify (ImageMagick),
#           pdfinfo (for --overview).
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
overview=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -r|--dpi)    dpi="$2";    shift 2 ;;
    -f|--first)  first="$2";  shift 2 ;;
    -l|--last)   last="$2";   shift 2 ;;
    --crop)      crop="$2";   shift 2 ;;
    --region)    region="$2"; shift 2 ;;
    --check)     check=1;     shift   ;;
    --overview)  overview=1;  shift   ;;
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
[[ $overview -eq 1 && (-n "$crop" || -n "$region") ]] && {
  echo "error: --overview is incompatible with --crop / --region (overview shows the whole slide)" >&2
  exit 1
}

command -v pdftoppm >/dev/null || { echo "error: pdftoppm not installed (poppler-utils)" >&2; exit 1; }
command -v mogrify  >/dev/null || { echo "error: mogrify not installed (ImageMagick)"     >&2; exit 1; }
command -v identify >/dev/null || { echo "error: identify not installed (ImageMagick)"    >&2; exit 1; }
[[ $overview -eq 1 ]] && {
  command -v pdfinfo >/dev/null || { echo "error: pdfinfo not installed (poppler-utils)" >&2; exit 1; }
}

if [[ -z "$out_dir" ]]; then
  base="$(basename "$pdf" .pdf)"
  out_dir="/tmp/$base"
fi
mkdir -p "$out_dir"

# --overview: compute a DPI such that the rendered raster fits under
# 2000px on the longest side. PDF page dimensions are in points
# (1pt = 1/72in), so target_dpi = 2000 * 72 / max(width_pt, height_pt).
# Use 1900 as the target (under 2000) for a safety margin.
if [[ $overview -eq 1 ]]; then
  page_info="$(pdfinfo "$pdf" | awk -F': +' '/^Page size:/ {print $2}' | head -1)"
  # Format: "960 x 540 pts" — parse the two numbers.
  W_pt="${page_info%% x*}"
  rest="${page_info#* x }"
  H_pt="${rest%% *}"
  # max dimension
  if [[ $W_pt -gt $H_pt ]]; then MAX_PT=$W_pt; else MAX_PT=$H_pt; fi
  dpi=$(( 1900 * 72 / MAX_PT ))
  [[ $dpi -lt 1 ]] && dpi=1
fi

# Rasterize at chosen DPI.
page_args=()
[[ -n "$first" ]] && page_args+=( -f "$first" )
[[ -n "$last"  ]] && page_args+=( -l "$last"  )
pdftoppm -r "$dpi" -png "${page_args[@]}" "$pdf" "$out_dir/p" >&2

# Resolve --region shorthand into an ImageMagick geometry.
# Each region carves a portion of the slide and clamps both
# dimensions to <=2000px so the output always passes --check.
if [[ -n "$region" ]]; then
  first_png="$(ls "$out_dir"/p-*.png | head -1)"
  dims="$(identify -format "%w %h" "$first_png")"
  W="${dims% *}"
  H="${dims#* }"
  MAX=2000
  HW=$((W / 2)); [[ $HW -gt $MAX ]] && HW=$MAX
  HH=$((H / 2)); [[ $HH -gt $MAX ]] && HH=$MAX
  CW=$W; [[ $CW -gt $MAX ]] && CW=$MAX
  CH=$H; [[ $CH -gt $MAX ]] && CH=$MAX
  CX=$(( (W - HW) / 2 )); [[ $CX -lt 0 ]] && CX=0
  CY=$(( (H - HH) / 2 )); [[ $CY -lt 0 ]] && CY=0
  case "$region" in
    top)          crop="${CW}x${HH}+0+0"           ;;
    bottom)       crop="${CW}x${HH}+0+$((H - HH))"  ;;
    left)         crop="${HW}x${CH}+0+0"           ;;
    right)        crop="${HW}x${CH}+$((W - HW))+0"  ;;
    center)       crop="${HW}x${HH}+${CX}+${CY}"   ;;
    top-left)     crop="${HW}x${HH}+0+0"           ;;
    top-right)    crop="${HW}x${HH}+$((W - HW))+0"  ;;
    bottom-left)  crop="${HW}x${HH}+0+$((H - HH))"  ;;
    bottom-right) crop="${HW}x${HH}+$((W - HW))+$((H - HH))" ;;
    *) echo "error: unknown --region '$region'" >&2; exit 1 ;;
  esac
fi

# Apply crop if requested. mogrify crops in place.
if [[ -n "$crop" ]]; then
  mogrify -crop "$crop" +repage "$out_dir"/p-*.png
fi

# --check: every output must fit under 2000px on the longest side.
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
    echo "Use --overview for a fit-to-limit big-picture render, OR" >&2
    echo "--crop / --region for a full-DPI detail of a specific area." >&2
    echo "NEVER downscale — this is a design system, visual fidelity" >&2
    echo "is what we're checking." >&2
    exit 3
  fi
fi

# Print written paths (one per line) for shell composition.
ls "$out_dir"/p-*.png

