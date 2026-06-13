/**
 * Unit: tools/build.js — the build orchestrator's static shape.
 *
 * Covers that every step (and the guard) names a generator script that
 * actually exists on disk, so a renamed/removed tool fails here rather
 * than mid-build. Does not execute the generators (some need esbuild /
 * Chromium not present in every environment).
 */

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { STEPS, GUARD, PREFLIGHT } = require('../../../tools/build');

const TOOLS = path.join(__dirname, '..', '..', '..', 'tools');

describe('build orchestrator', () => {
  test('the guard step exists', () => {
    assert.ok(fs.existsSync(path.join(TOOLS, GUARD.script)), `missing ${GUARD.script}`);
  });

  test('every preflight gate names an existing script', () => {
    assert.ok(PREFLIGHT.length > 0);
    for (const gate of PREFLIGHT) {
      assert.ok(gate.label, 'preflight gate missing label');
      assert.ok(fs.existsSync(path.join(TOOLS, gate.script)), `missing ${gate.script}`);
    }
  });

  test('every step names an existing generator script', () => {
    assert.ok(STEPS.length > 0);
    for (const step of STEPS) {
      assert.ok(step.label, 'step missing label');
      assert.ok(fs.existsSync(path.join(TOOLS, step.script)), `missing ${step.script}`);
    }
  });

  test('css, runtime, snippets, and both doc generators are all covered', () => {
    const scripts = STEPS.map((s) => s.script);
    for (const required of [
      'build-css.js',
      'build-runtime.js',
      'build-snippets.js',
      'build-component-docs.js',
      'build-docs-portal.js',
    ]) {
      assert.ok(scripts.includes(required), `orchestrator does not run ${required}`);
    }
  });
});
