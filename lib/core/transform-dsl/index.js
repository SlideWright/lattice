/**
 * Transform-DSL — public surface of the §11 prototype
 * (`engineering/decisions/2026-06-29-component-transform-dsl.md`).
 *
 *   validateTransform(raw)            → { ok, rules, errors }   (safety gate, §6)
 *   applyRulesToDom(root, rules, ctx) → root                    (runtime path)
 *   applyRulesToHtml(html, rules, ctx)→ html                    (engine/export path)
 *
 * The two apply* fns share the same interpreter (`applyRulesToHtml` parses a
 * matched section into a jsdom fragment and calls `applyRulesToDom`), so the
 * cross-path parity §11 worried about holds by construction.
 *
 * NOT YET wired into the transformer registry — this is the prototype that
 * converts the buildability uncertainty into evidence before the schema is
 * frozen (§12). `apply-to-html.js` is only required on the engine path so jsdom
 * stays out of the browser runtime bundle.
 */

const { validateTransform } = require('./schema');
const { applyRulesToDom } = require('./interpret');
const { applyRulesToHtml } = require('./apply-to-html');
const { CAPABILITY_NAMES } = require('./capabilities');

module.exports = { validateTransform, applyRulesToDom, applyRulesToHtml, CAPABILITY_NAMES };
