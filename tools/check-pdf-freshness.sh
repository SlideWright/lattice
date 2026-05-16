#!/usr/bin/env bash
# Pre-commit gate: ensure every staged examples/<deck>.md ships with a
# rebuilt examples/<deck>.pdf in the same commit. Catches the "edited
# markdown, forgot to rebuild" failure mode without trusting human
# discipline.
#
# Two checks:
#   1. CHEAP — if <deck>.md is staged, <deck>.pdf must also be staged
#      (or the existing PDF must be newer than the staged .md content).
#   2. REBUILD VERIFICATION — for any staged .md+.pdf pair, rebuild
#      the deck against the staged source and confirm the staged PDF
#      matches. Slower (~10s per deck) but catches stale PDFs even
#      when the author staged both.
#
# Both checks are skippable via `git commit --no-verify` — last resort
# only. See docs/references/workflow.md.
#
# Usage:
#   tools/check-pdf-freshness.sh [<ignored>...]
#
# The hook ignores argv because lefthook's `glob:` filter strips .pdf
# entries from {staged_files}; we'd never see the .pdf siblings. Query
# git directly for the full staged file list instead.
#
# Exit codes:
#   0  every staged deck has a matching rebuilt PDF
#   1  at least one deck is missing or stale; commit blocked

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Collect staged examples/<deck>.md and .pdf files directly from the
# git index. argv is ignored — lefthook's glob filter would hide .pdf
# entries from us.
staged_md=()
staged_pdf=()
while IFS= read -r path; do
  case "$path" in
    examples/*.md) staged_md+=("$path") ;;
    examples/*.pdf) staged_pdf+=("$path") ;;
  esac
done < <(git diff --name-only --cached --diff-filter=ACMR)

if [ ${#staged_md[@]} -eq 0 ]; then
  exit 0
fi

fail=0

# CHEAP: for each staged .md, the matching .pdf must also be staged.
for md in "${staged_md[@]}"; do
  expected_pdf="${md%.md}.pdf"
  found=0
  for pdf in "${staged_pdf[@]:-}"; do
    if [ "$pdf" = "$expected_pdf" ]; then
      found=1
      break
    fi
  done
  if [ $found -eq 0 ]; then
    echo "pre-commit: $md is staged but $expected_pdf is not." >&2
    echo "            Run 'npm run preview -- ${md##examples/}' (strip .md) and stage the rebuilt PDF." >&2
    fail=1
  fi
done

if [ $fail -ne 0 ]; then
  echo "" >&2
  echo "Block: staged deck source(s) without rebuilt PDF. Bypass with --no-verify only as last resort." >&2
  exit 1
fi

# REBUILD VERIFICATION: rebuild each staged deck and compare to staged PDF.
# Uses lattice-emulator directly; relies on Puppeteer being available
# (PUPPETEER_EXECUTABLE_PATH for hosted environments, default for local).
EMULATOR="$ROOT/lattice-emulator.js"
TMPDIR="$(mktemp -d)"
# Clean up tempdir and any in-flight per-deck rebuild source files. The
# rebuild writes the staged source next to the real deck so relative
# asset paths resolve; trap guards against leaving litter on Ctrl-C.
trap 'rm -rf "$TMPDIR"; rm -f examples/.*.freshness.{md,pdf,html} lib/components/*/.*.freshness.{md,pdf,html}' EXIT

for md in "${staged_md[@]}"; do
  deck="$(basename "${md%.md}")"
  src_dir="$(dirname "$md")"
  build_src="$src_dir/.$deck.freshness.md"
  fresh_pdf="$src_dir/.$deck.freshness.pdf"
  fresh_html="$src_dir/.$deck.freshness.html"
  # Extract the staged source AND build its output into the same
  # directory as the real deck so relative asset URLs (images, themes,
  # included SVGs) resolve identically to a normal build. The output
  # HTML's location determines how Puppeteer resolves relative URLs,
  # so building to /tmp would silently drop every sibling asset and
  # produce a smaller, falsely-stale PDF. Trap cleans up litter.
  if ! git show ":$md" > "$build_src" 2>/dev/null; then
    echo "pre-commit: cannot read staged version of $md (was it a delete?). Skipping rebuild check." >&2
    rm -f "$build_src"
    continue
  fi
  echo "pre-commit: rebuilding $deck to verify staged PDF..."
  rebuild_ok=1
  if ! node "$EMULATOR" "$build_src" "$fresh_pdf" -q 2>/dev/null; then
    rebuild_ok=0
  fi
  rm -f "$build_src" "$fresh_html"
  if [ $rebuild_ok -eq 0 ]; then
    rm -f "$fresh_pdf"
    echo "pre-commit: rebuild FAILED for $deck. Source may be broken." >&2
    fail=1
    continue
  fi
  # Compare staged PDF byte count to fresh build as a cheap check.
  staged_pdf_file="${md%.md}.pdf"
  staged_bytes=$(git cat-file -s ":$staged_pdf_file" 2>/dev/null || echo 0)
  fresh_bytes=$(wc -c < "$fresh_pdf" | tr -d ' ')
  if [ "$staged_bytes" -eq 0 ]; then
    echo "pre-commit: staged $staged_pdf_file is empty or missing." >&2
    fail=1
    continue
  fi
  # PDF byte count varies by tiny amounts run-to-run due to Puppeteer
  # timestamps, so allow a 10% drift tolerance. Bigger drift = stale source.
  diff_bytes=$(( staged_bytes > fresh_bytes ? staged_bytes - fresh_bytes : fresh_bytes - staged_bytes ))
  threshold=$(( fresh_bytes / 10 ))
  if [ $threshold -lt 4096 ]; then threshold=4096; fi
  if [ $diff_bytes -gt $threshold ]; then
    echo "pre-commit: $staged_pdf_file appears stale relative to its source." >&2
    echo "            staged=${staged_bytes} bytes, fresh rebuild=${fresh_bytes} bytes (diff $diff_bytes > threshold $threshold)" >&2
    echo "            Run 'npm run preview -- $deck' and stage the rebuilt PDF." >&2
    fail=1
  fi
  rm -f "$fresh_pdf"
done

if [ $fail -ne 0 ]; then
  echo "" >&2
  echo "Block: staged PDF(s) appear stale relative to source. Bypass with --no-verify only as last resort." >&2
  exit 1
fi

exit 0
