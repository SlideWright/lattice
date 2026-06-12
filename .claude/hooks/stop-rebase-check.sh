#!/bin/bash
# Stop-hook backstop for the "stay rebased" rule (CLAUDE.md § Default Operating
# Mode). Warns — never blocks — when the current branch is behind the
# locally-known origin/main and likely needs a rebase before the next push.
#
# Local-only by design: it does NOT run `git fetch`, so it adds no latency to
# ending a turn. The agent's own workflow is responsible for the fetch + rebase;
# this hook is the cheap safety net that catches "origin/main is known to be
# ahead but I never rebased." Silent on the happy path (emits JSON only when a
# rebase is actually warranted).
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null) || exit 0
[ "$branch" = "main" ] && exit 0
[ "$branch" = "HEAD" ] && exit 0

# No known origin/main ref → nothing to compare against.
git rev-parse --verify -q origin/main >/dev/null 2>&1 || exit 0

behind=$(git rev-list --count "HEAD..origin/main" 2>/dev/null || echo 0)
if [ "${behind:-0}" -gt 0 ]; then
  printf '{"systemMessage":"Branch %s is %s commit(s) behind origin/main — rebase before pushing: git fetch origin main && git rebase origin/main"}\n' "$branch" "$behind"
fi
exit 0
