#!/usr/bin/env bash
# Render the journey deck six times with different actor-dot/gap overlays.
# Each overlay is injected as a 'style:' field inside the YAML frontmatter,
# which Marp delivers verbatim into a <style> tag in the document head
# (no markdown parsing applied to the contents).
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(cd ../.. && pwd)"
MD_SRC="$ROOT/examples/user-journey.md"

variants=(A-stripe-loose A-stripe-tight B-inline-loose B-inline-tight C-corner-loose C-corner-tight)

for v in "${variants[@]}"; do
  echo "=== $v ==="
  css="$v.css"
  md_out="$v.md"
  pdf_out="$v.pdf"

  # Inject the CSS as a 'style: |' frontmatter field, indented two spaces.
  # The closing '---' of the frontmatter is the second line in user-journey.md
  # that matches '^---$'; we insert just before it.
  awk -v css_file="$css" '
    BEGIN { count = 0; injected = 0 }
    /^---$/ {
      count++
      if (count == 2 && !injected) {
        print "style: |"
        while ((getline line < css_file) > 0) print "  " line
        close(css_file)
        injected = 1
      }
    }
    { print }
  ' "$MD_SRC" > "$md_out"

  node "$ROOT/lattice-emulator.js" -q "$md_out" "$pdf_out"
done

echo "All renders complete."
