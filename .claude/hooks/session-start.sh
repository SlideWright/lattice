#!/bin/bash
# Lattice — Claude Code on the web session bootstrap.
#
# Containers come up with the repo cloned but node_modules empty. Without
# `npm install`, every Puppeteer-driven build (lattice-emulator, marp-cli,
# preview tool) crashes with "Puppeteer not found" — once per branch, every
# session, forever. This hook fixes that.
#
# Quiet on success, verbose on failure. Idempotent (skips install when the
# tree is already populated and lockfile-current). Skips PUPPETEER_SKIP_DOWNLOAD
# because the container ships Chromium at /opt/pw-browsers/chromium and
# .claude/settings.json points PUPPETEER_EXECUTABLE_PATH there — no need to
# download a ~150MB copy that wouldn't run anyway (no glibc deps locally).
#
# Local desktop runs: this hook still works (npm install is harmless if
# node_modules is already populated). Restrict to remote only if it ever
# becomes a nuisance — for now, idempotent + fast is enough.

set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Already populated and lockfile not newer than node_modules — bail.
if [ -d node_modules ] && [ -f node_modules/.package-lock.json ]; then
  if [ "package-lock.json" -ot "node_modules/.package-lock.json" ] \
     || [ "package-lock.json" -nt "node_modules/.package-lock.json" -a \
          "$(stat -c %Y package-lock.json 2>/dev/null || stat -f %m package-lock.json)" \
          -le "$(stat -c %Y node_modules/.package-lock.json 2>/dev/null || stat -f %m node_modules/.package-lock.json)" ]; then
    exit 0
  fi
fi

# Install. Suppress stdout, keep stderr; print full log only on failure.
LOG=$(mktemp)
if PUPPETEER_SKIP_DOWNLOAD=true npm install --prefer-offline --no-audit --no-fund >"$LOG" 2>&1; then
  rm -f "$LOG"
  exit 0
fi

echo "session-start hook: npm install failed" >&2
cat "$LOG" >&2
rm -f "$LOG"
exit 1
