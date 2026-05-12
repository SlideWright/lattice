---
marp: true
theme: indaco
size: 16:9
paginate: true
header: "Lattice · Tabular Layout Studies"
footer: "One base, four variants, five modifiers"
---

<!-- _class: title -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

# Tabular Lists.

`Layout Studies · 2026`

One base class, four visual variants, five fine-tuning modifiers

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Concept 01 · Ledger`

## Hairline-ruled rows. Display-serif name. Mono meta. The quiet boardroom accounting look.

---

<!-- _class: list-tabular -->
<!-- _footer: "Ledger · list-tabular" -->

## The six signal dimensions, what they measure, and how they are scored.

1. Confidence `1–5 · Auto-scored`
   - Number of independent sources corroborating the signal
2. Recency `0.0–1.0 · Auto-scored`
   - Time-decay from signal date, configurable half-life
3. Relevance `1–5 · Manual`
   - Alignment to current strategic bets, owner-scored
4. Reach `1–5 · Auto-scored`
   - Number of customers or segments affected
5. Effort `1–5 · Manual`
   - Engineering and design cost to act on the signal
6. Confidence delta `−5 to +5 · Auto`
   - Change in confidence score since last cycle

---

<!-- _class: list-tabular compact -->
<!-- _footer: "Ledger compact · list-tabular compact" -->

## Eight engineering metrics tracked weekly.

1. Deploy frequency `Target · >5`
   - Production deployments per developer per week
2. Lead time `Target · <8h`
   - Commit to production duration, ninety-fifth percentile
3. Change failure rate `Target · <5%`
   - Deploys requiring rollback or hotfix, thirty-day window
4. Time to restore `Target · <30m`
   - Incident detection to resolution, median
5. Test coverage `Target · >85%`
   - Lines covered by automated tests, CI gate
6. Bundle size `Target · <250kb`
   - Web bundle gzipped on the main route
7. Error budget `Target · >50%`
   - SLO error budget remaining, monthly window
8. Page load p95 `Target · <1.5s`
   - First contentful paint from field measurement

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Concept 02 · Definition`

## Name is the visual star. Big display-serif headline, supporting body alongside.

---

<!-- _class: list-tabular def -->
<!-- _footer: "Definition · list-tabular def" -->

## The four governance principles, defined.

1. Reversibility `Principle 01`
   - Decisions should be undoable without architectural surgery.
2. Optionality `Principle 02`
   - Preserve future choices when the present cost is similar.
3. Locality `Principle 03`
   - Place decisions close to the people executing them.
4. Calibration `Principle 04`
   - Track decision outcomes and update priors accordingly.

---

<!-- _class: list-tabular def rule -->
<!-- _footer: "Definition with rule · list-tabular def rule" -->

## What we mean when we use these terms.

1. Pilot `Glossary`
   - A time-bound deployment with one design partner and a kill-switch.
2. GA `Glossary`
   - Generally available — self-serve onboarding without sales involvement.
3. Land and expand `Glossary`
   - Initial seat-count contract that grows via usage-based pricing.
4. Multi-tenant `Glossary`
   - Single deployment serving multiple isolated customer datasets.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Concept 03 · Metric`

## Meta is the column. Each row anchors a stat tile on the right.

---

<!-- _class: list-tabular metric -->
<!-- _footer: "Metric · list-tabular metric" -->

## Quarterly OKR scorecard.

1. Net retention `132%`
   - Trailing twelve months gross retention plus expansion
2. New ARR `$14.2M`
   - New business closed across all segments
3. CSAT `8.6/10`
   - Customer satisfaction, rolling sixty-day average
4. NPS `+42`
   - Net promoter score from sampled quarterly surveys
5. Time to value `4.1d`
   - Median days from signup to first integration
6. Gross margin `76%`
   - Revenue minus cost of revenue, GAAP

---

<!-- _class: list-tabular metric solid -->
<!-- _footer: "Metric solid · list-tabular metric solid" -->

## The five hero numbers from this quarter.

1. Net new ARR `$14.2M`
   - Of which $9.4M came from expansion within existing accounts
2. Logo retention `97%`
   - Trailing twelve months, all segments
3. Pipeline coverage `4.2x`
   - Forward two quarters at current win rate
4. Sales cycle `42d`
   - Median first-touch to signature, enterprise tier
5. Burn multiple `0.8`
   - Net cash burned per dollar of net new ARR

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Concept 04 · Spec`

## Mono names like keys. The technical-reference feel.

---

<!-- _class: list-tabular spec -->
<!-- _footer: "Spec · list-tabular spec" -->

## The platform API surface, at a glance.

1. assets.create `POST · v1`
   - Upload a binary blob and receive a content-addressed ID
2. assets.read `GET · v1`
   - Fetch the asset by ID, with optional range request
3. assets.delete `DELETE · v1`
   - Soft-delete with seven-day retention and audit log
4. assets.list `GET · v1`
   - Paginated listing filtered by owner, tag, or date
5. webhooks.subscribe `POST · v1`
   - Register a callback URL for asset lifecycle events

---

<!-- _class: list-tabular spec stacked -->
<!-- _footer: "Spec stacked · list-tabular spec stacked" -->

## Five public capabilities, each gated by feature flag.

1. ml.embeddings `Flag · ml_v2`
   - Vector embedding service accepting any text or image input, returning a 1536-dimension vector for semantic search and clustering downstream.
2. notifications.batch `Flag · notify_batch`
   - Bulk notification dispatch with template support, per-recipient personalisation, and idempotent retry semantics on the channel side.
3. exports.streaming `Flag · exports_v3`
   - Stream-based CSV and Parquet export pipeline with backpressure, resumable from a cursor token after partial failures.
4. auth.sso.saml `Flag · auth_saml`
   - SAML 2.0 single sign-on with both IdP-initiated and SP-initiated flows; supports multi-factor enforcement on the IdP side.

---

<!-- _class: divider -->
<!-- _paginate: false -->
<!-- _footer: "Section break · divider" -->

`Concept 05 · Register`

## Categorical meta as a pill. For risk logs, decision registers, status tables.

---

<!-- _class: list-tabular register -->
<!-- _footer: "Register · list-tabular register" -->

## The risk register, as of this quarter.

1. Supplier concentration `Watch`
   - Single-vendor exposure on the storage tier
2. Talent retention `Mitigate`
   - Platform team attrition above industry benchmark
3. Regulatory drift `Plan`
   - EU AI Act timeline shorter than originally planned
4. Customer concentration `Watch`
   - Top three customers exceed thirty percent of ARR
5. Currency `Accept`
   - Euro exposure unhedged beyond a six-month horizon

---

<!-- _class: list-tabular register outline -->
<!-- _footer: "Register outline · list-tabular register outline" -->

## Open architectural decisions, awaiting closure.

1. Storage layer `ADR-014`
   - Columnar versus hybrid — affects query and ingest costs
2. Multi-region `ADR-015`
   - Active-active versus active-passive across U.S. East and EU
3. Identity `ADR-016`
   - In-house IdP versus federated — affects compliance scope
4. Schema evolution `ADR-017`
   - Versioned envelopes versus append-only fields
5. Async runtime `ADR-018`
   - Workers versus serverless for long-running jobs

---

<!-- _class: closing -->
<!-- _paginate: false -->
<!-- _header: '' -->
<!-- _footer: '' -->

##### Five concepts, two iterations each

---

## Pick the two you want to keep.

The rest go in the drawer.
