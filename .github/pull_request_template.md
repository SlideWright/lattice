<!--
PR conventions for this repo — both the typed `create pr` AND the Create-PR
button should follow this. Keep them in parity.

TITLE — the same convention as commit messages (`git log` / CLAUDE.md):
  area(scope): short summary
Imperative, lower-case, no trailing period. Examples:
  fix(drawing-board): update scroll slide-number on iOS via IntersectionObserver
  feat(coach): add title-incomplete rule + share ask/pacing definitions
Not "Update files", a bare branch name, or a vague summary.

BODY — lead with one or two plain-language sentences, then the sections below.
Delete a section only if it genuinely doesn't apply. Be honest about what was
NOT verified. A small before → after table helps when several things shifted.
-->

## Problem / Why

<!-- What's broken or missing, and why it matters. -->

## What changed

<!-- The fix, concretely — name the files / functions touched. -->

## Tests

<!-- What you ran or added, and which gates passed (unit / integration / biome).
     "None — docs only" is a fine answer. -->

## Caveats / not verified

<!-- Anything you couldn't verify (e.g. a live on-device check), follow-ups, or
     "none". Flag breaking changes here, led with **Breaking:**. -->
