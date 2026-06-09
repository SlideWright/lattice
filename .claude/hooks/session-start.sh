#!/bin/bash
set -euo pipefail

# SessionStart hook — installs JS dependencies so the toolchain works in
# fresh Claude Code on the web containers, which clone the repo without
# node_modules. Without this, `npm run lint` (biome), `npm test`
# (node --test), and `npm run build` all fail with "command not found".
#
# Web-only: local checkouts already have node_modules, and we don't want
# to mutate a developer's working tree on session start.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# npm install (not ci) is idempotent and benefits from container-state
# caching after the first run. The lockfile pins versions either way.
# Skips audit/fund network chatter for a faster, quieter install.
npm install --no-audit --no-fund
