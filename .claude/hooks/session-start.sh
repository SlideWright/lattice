#!/bin/bash
set -euo pipefail

# SessionStart hook — makes a fresh Claude Code on the web container able to
# run the full quality pipeline (lint, unit + integration tests, build, and
# PDF rasterization for visual review). Fresh containers clone the repo with
# NONE of the following, so every one of those commands fails until set up:
#
#   1. node_modules        → biome (lint), node --test, the build toolchain
#   2. poppler-utils        → pdfinfo / pdftoppm: PDF page counts (integration
#                            tests) AND rasterize-for-review.sh / pixel-check
#   3. CHROME_PATH         → marp-cli's headless Chromium (integration tests,
#                            any deck render). puppeteer caches the binary but
#                            it isn't on PATH.
#
# Web-only: local checkouts already have all three and we don't want to mutate
# a developer's machine on session start.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# 1. JS deps. npm install (not ci) is idempotent and benefits from
#    container-state caching after the first run; the lockfile pins versions.
#    Its `prepare` step also runs `lefthook install`, wiring the git hooks so
#    the pre-commit / pre-push gates are actually active in this session.
npm install --no-audit --no-fund

# 2. System deps for the PDF pipeline. A fresh container's apt index is often
#    stale, so refresh it once before installing — a stale index 404s on the
#    pinned .deb and silently leaves pdfinfo missing, which fails the integration
#    gate (and, under set -e, aborts the rest of this hook before CHROME_PATH is
#    exported). Only pay the update cost when something actually needs installing.
if ! command -v pdfinfo >/dev/null 2>&1 || ! fc-list 2>/dev/null | grep -qi "noto color emoji"; then
  apt-get update || sudo apt-get update || true
fi

# 2a. poppler-utils → pdfinfo / pdftoppm (PDF page counts + rasterize-for-review).
#     Non-fatal: a transient apt outage must not abort the rest of setup; the
#     pre-push gate re-checks pdfinfo loudly anyway.
if ! command -v pdfinfo >/dev/null 2>&1; then
  apt-get install -y poppler-utils || sudo apt-get install -y poppler-utils || true
fi

# 2b. Color emoji font. The owned render paths (lattice-engine, lattice-emulator)
#     emit raw unicode emoji as plain text (no twemoji <img>), so a color emoji
#     font must be present for them to render in color in headless Chromium. The
#     webfont @import in lattice.css is a portable bonus, but an installed font
#     is the reliable guarantee. Idempotent: skip if already present.
if ! fc-list 2>/dev/null | grep -qi "noto color emoji"; then
  apt-get install -y fonts-noto-color-emoji || sudo apt-get install -y fonts-noto-color-emoji || true
fi

# 3. Point marp-cli at the puppeteer-cached Chromium for the whole session
#    (and thus for the pre-push integration gate, which inherits this env).
CHROME_BIN="$(ls /root/.cache/puppeteer/chrome/linux-*/chrome-linux64/chrome 2>/dev/null | head -1 || true)"
if [ -n "$CHROME_BIN" ] && [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export CHROME_PATH=\"$CHROME_BIN\"" >> "$CLAUDE_ENV_FILE"
fi
