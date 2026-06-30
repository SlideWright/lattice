#!/usr/bin/env node
/**
 * AI component-generation evaluator — runs the FROZEN, held-out adversarial prompt
 * set (test/fixtures/component-gen-prompts.json) through the SAME kernel + gate the
 * Studio uses, and reports structural pass/fail per case
 * (engineering/decisions/2026-06-29-ai-component-generation.md §10).
 *
 * This is the falsification harness: it verifies that the knowledge file teaches
 * the model to (a) produce gate-clean transform-free components, (b) DECLINE
 * out-of-scope requests (charts/diagrams/timelines/code) instead of faking them,
 * and (c) declare adapt + capacity on a portrait-reflow case. The aesthetic 10/10
 * read still needs a human (the Quality Bar) — this proves the STRUCTURAL contract.
 *
 * Usage:  OPEN_ROUTER_KEY=… node tools/component-gen-eval.mjs [--model <id>]
 * The key is read ONLY from the environment and never printed. Exit 0 = all cases
 * met their expectation; 1 = a failure; 2 = no key (skipped).
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { askComponentMessages, coerceComponent, rankSimilar, auditComponentDesign } = require(path.join(ROOT, 'lib/layout/ai.js'));
const { gateComponent } = require(path.join(ROOT, 'lib/layout/gate.js'));

const KEY = process.env.OPEN_ROUTER_KEY;
if (!KEY) { console.error('no OPEN_ROUTER_KEY in env — eval skipped'); process.exit(2); }
const MODEL = process.argv.includes('--model') ? process.argv[process.argv.indexOf('--model') + 1] : (process.env.SMOKE_MODEL || 'anthropic/claude-sonnet-4.5');

const SET = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/fixtures/component-gen-prompts.json'), 'utf8'));
// A small stand-in catalog so the dedup-route case has something to match.
const CATALOG = [
  { name: 'actors', bucket: 'inventory', description: 'Roster of responsibilities owned by named actors.', tags: ['ownership', 'roster'] },
  { name: 'glossary', bucket: 'inventory', description: 'A list of terms with definitions.', tags: ['terms', 'definitions'] },
  { name: 'checklist', bucket: 'inventory', description: 'A list of items with done/blocked/pending markers.', tags: ['checklist', 'status'] },
  { name: 'kpi', bucket: 'statement', description: 'Key metrics as big numbers.', tags: ['metrics'] },
];

async function call(messages) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, response_format: { type: 'json_object' }, max_tokens: 2500, temperature: 0.4 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content ?? '';
}

/** Does the markdown carry a real GFM table? True iff a line is a pipe+dash divider row. */
function hasGfmTable(md) {
  return String(md || '').split('\n').some(line => {
    const t = line.trim();
    return t.includes('|') && t.includes('-') && /^[|\-:\s]+$/.test(t);
  });
}
/** A real fenced code block (``` or ~~~). */
function hasFence(md) { return /(^|\n)[ \t]*(```|~~~)/.test(String(md || '')); }
/** A real math block ($$…$$) or inline ($…$) render. */
function hasMath(md) { const s = String(md || ''); return /\$\$[\s\S]+?\$\$/.test(s) || /(^|[^$])\$[^$\n]+\$/.test(s); }

let pass = 0;
const fails = [];
for (const t of SET.prompts) {
  const similar = rankSimilar(t.prompt, CATALOG, { limit: 3 });
  let reply = '';
  try { reply = await call(askComponentMessages(t.prompt, { similar })); } catch (e) { fails.push(`${t.id}: API ${e.message}`); console.log(`✗ ${t.id} — API error`); continue; }
  const c = coerceComponent(reply);

  // Off-contract trap: the only failure is emitting a hex/raw-px that the gate
  // catches. A decline OR a gate-clean tokens-only component both pass.
  if (t.expect === 'tokens-or-decline') {
    if (c.decline) { pass++; console.log(`✓ ${t.id} → declined the off-contract request (safe)`); continue; }
    if (!c.ok) { fails.push(`${t.id}: unusable reply`); console.log(`✗ ${t.id} — unusable`); continue; }
    const g = gateComponent({ css: c.css, manifest: { ...c.manifest, skeleton: c.skeleton } });
    if (g.ok) { pass++; console.log(`✓ ${t.id} → .${c.manifest.name} gate-clean (mapped off-contract values to tokens)`); }
    else { fails.push(`${t.id}: emitted off-contract values — gate:${g.errors.map(e => e.rule).join('/')}`); console.log(`✗ ${t.id} — emitted hex/raw-px`); }
    continue;
  }

  if (t.expect === 'declined') {
    const ok = !!c.decline;
    const routeOk = !t.route || (c.decline && c.decline.route === t.route);
    if (ok && routeOk) { pass++; console.log(`✓ ${t.id} → declined (route=${c.decline.route})`); }
    else { fails.push(`${t.id}: expected decline${t.route ? ` route=${t.route}` : ''}, got ${c.decline ? `route=${c.decline.route}` : 'a component'}`); console.log(`✗ ${t.id} — expected decline`); }
    continue;
  }

  // expect ok
  if (c.decline) { fails.push(`${t.id}: declined a transform-free request`); console.log(`✗ ${t.id} — wrongly declined`); continue; }
  if (!c.ok) { fails.push(`${t.id}: unusable reply`); console.log(`✗ ${t.id} — unusable`); continue; }
  const g = gateComponent({ css: c.css, manifest: { ...c.manifest, skeleton: c.skeleton } });
  const design = auditComponentDesign(c.manifest, c.css);
  const designErrors = design.filter(d => d.level === 'error');
  const reflowOk = !t.mustReflow || (c.manifest.adapt && c.manifest.capacity);
  const dedupOk = !t.dedup || similar.some(s => s.name === t.dedup);
  // mustTable/mustFence/mustMath: a structural request must come back as the REAL
  // markdown structure (a GFM divider row / a ```fence / a $$…$$ block), never faked
  // with prose or a list.
  const tableOk = !t.mustTable || hasGfmTable(c.skeleton);
  const fenceOk = !t.mustFence || hasFence(c.skeleton);
  const mathOk = !t.mustMath || hasMath(c.skeleton);
  const good = g.ok && !designErrors.length && reflowOk && dedupOk && tableOk && fenceOk && mathOk;
  if (good) { pass++; console.log(`✓ ${t.id} → .${c.manifest.name} [${c.manifest.bucket}/${c.manifest.form}] gate.ok fixes=${c.fixes.join(',') || 'none'}${t.dedup ? ` dedup→${t.dedup}✓` : ''}${t.mustReflow ? ' reflow✓' : ''}${t.mustTable ? ' table✓' : ''}${t.mustFence ? ' fence✓' : ''}${t.mustMath ? ' math✓' : ''}`); }
  else {
    const why = [!g.ok && `gate:${g.errors.map(e => e.rule).join('/')}`, designErrors.length && `design:${designErrors.map(e => e.rule).join('/')}`, !reflowOk && 'no-adapt/capacity', !dedupOk && `dedup-miss(${t.dedup})`, !tableOk && 'faked-table-with-list', !fenceOk && 'no-fenced-code', !mathOk && 'no-math-block'].filter(Boolean).join(' ');
    fails.push(`${t.id}: ${why}`); console.log(`✗ ${t.id} — ${why}`);
  }
}

console.log(`\n${pass}/${SET.prompts.length} cases met expectation (model: ${MODEL})`);
if (fails.length) { console.log('FAILURES:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('EVAL PASS');
