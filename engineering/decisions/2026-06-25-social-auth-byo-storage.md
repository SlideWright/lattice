---
status: proposed
summary: Decides what "social login" means for Lattice. The user-visible ask ("Sign in with Google / GitHub / Apple") is reframed as bring-your-own-storage — the user authorizes their OWN cloud and decks save there; Lattice stores nothing and pays for nothing. Two routes are compared: Route A (Auth.js / hosted accounts — the library "everyone uses", but it needs a server, a DB, and only solves identity) and Route B (per-provider client-side OAuth with PKCE — no backend, the docs site stays static on free GitHub Pages, and it solves the actual goal of saving to the user's Drive). Route B is chosen. Google Drive ships first as a "Connect / Save / Open" feature wired into the existing drawing-board store; Dropbox + OneDrive are easy follow-ons; GitHub costs one tiny token-exchange proxy; Apple is dropped because it cannot satisfy the storage goal. No code in this doc.
---

# Social auth = bring-your-own-storage, not hosted accounts

**Date:** 2026-06-25 · **Status:** Direction ratified by owner (2026-06-25) —
**Route B / Google Drive first; Auth.js explicitly rejected**; not yet built ·
**Decision owner:** maintainer

This doc decides *what "add a login button" means for Lattice* before any code
is written, because the obvious reading of the request and the right
implementation point in different directions. It does **not** ship code.

The trigger: *"can we add a Google / Apple / GitHub login button like other
sites have?"* — refined in conversation to *"let users pick their own account
and save there; zero cost to me; it is not my business how they operate. Meet
the customer where they are — save to their Google Drive, GitHub, etc."*

That refinement is the whole decision. It turns a generic "add auth" task into a
specific, cheap, low-liability architecture — and it rules out the library most
people reach for first.

---

## 0. The decision in one paragraph

Lattice adds **no user accounts and no backend.** "Sign in" means the user
**authorizes their own storage provider** from the browser using **OAuth 2.0
Authorization Code + PKCE** (a secretless flow built for public clients); the
access token lives in the user's browser and their decks save into *their* cloud
via that provider's API. Lattice stores nothing, runs no server, and the docs
site **stays static on free GitHub Pages**. We **reject Route A** (Auth.js /
hosted accounts) for now — it is the popular tool but it solves *identity*, not
*storage*, and forces a server + database we explicitly don't want. We adopt
**Route B** (per-provider client-side SDKs) and ship **Google Drive first** as a
"Connect Drive → Save / Open" feature in the existing drawing-board editor, with
Dropbox and OneDrive as additive follow-ons, GitHub behind one small proxy, and
Apple out of scope.

---

## 1. The reframe — "login" is the wrong word for what's wanted

A "Sign in with Google" button conflates two things that are usually bought
together but don't have to be:

- **Identity** — *who is this person* (a stable user id, an email, a profile).
- **Storage authorization** — *permission to read/write files in a cloud the
  user already owns* (Drive, Dropbox, OneDrive, a GitHub repo).

Most sites buy identity because they run a backend that stores the user's data,
and identity is how they keep each user's rows apart. **Lattice has no such
backend and wants none.** The stated goal is not "let me know who you are" — it
is "let you keep your own decks in your own cloud, at no cost or liability to
me." That is **storage authorization with no identity layer at all.**

This distinction is the hinge of the whole doc. Get it wrong and you build (and
pay to run) an accounts system to deliver a feature that needs no account.

---

## 2. What Lattice is today (the constraint that shapes everything)

Established from the codebase (see `../architecture.md`):

- **Docs site** (`docs/`) — a **static** Astro site, **no `output`/`adapter`**,
  deployed to **GitHub Pages** via `.github/workflows/docs.yml`
  (`actions/deploy-pages@v4`). No server runtime, no API routes.
- **In-browser editor already exists** — the "drawing board" / "workbench" /
  "playground" (`docs/src/pages/drawing-board.astro`,
  `docs/src/playground/drawing-board-store.js`,
  `docs/src/playground/drawing-board-export.js`). It already persists decks
  **locally** and exports them. This is the natural and only sane home for
  "save to my cloud."
- **No users, no sessions, no database, no secrets** anywhere in the repo.

The win to protect: **the site costs ~nothing to run and carries no user-data
liability.** Any auth design that breaks that property had better buy something
worth it. Route B keeps it; Route A breaks it.

---

## 3. The two routes

### Route A — Auth.js (a.k.a. NextAuth) / hosted accounts

The library "everyone uses." One config, ~80 providers, mature. **And the wrong
tool here**, for reasons that are about *fit*, not quality:

- **Needs a server runtime.** Auth.js runs the OAuth code exchange server-side
  (it holds the client secret and sets the session cookie). That forces the
  docs site off static GitHub Pages onto an SSR host (Vercel / Netlify /
  Cloudflare adapter) — new infra, new bill, new attack surface.
- **Implies a session/user store.** A logged-in user is a row somewhere. Now
  there's a database to run, back up, and be liable for.
- **Solves identity, not storage.** Out of the box it tells you *who* signed in.
  It does **not** save a deck to the user's Drive — you'd still write all of
  Route B's storage code *on top of* the accounts system you just stood up.

Auth.js is the right answer to a different question: *"I want hosted Lattice
accounts."* If that ever becomes the goal (a paid tier, server-side deck
library, team sharing), revisit this doc — Route A becomes correct the moment we
*want* to hold user data. Today we explicitly don't.

### Route B — per-provider client-side OAuth (chosen)

Each provider exposes a browser SDK that performs **Authorization Code + PKCE**
with **no client secret** and keeps the token in the page. Lattice calls the
provider's storage API directly from the browser. No server, no secret, no DB.

- Google → **Google Identity Services** (`google.accounts.oauth2`) + Drive REST
  API, scope **`drive.file`** (app sees only files it created — privacy-friendly
  and the reason there's nothing to be liable for).
- Dropbox → Dropbox JS SDK + Files API (app-folder scoped).
- OneDrive/Microsoft → **MSAL.js** + Graph API.

Trade vs Route A: Auth.js is *one* library for *many* providers but needs a
backend; Route B is *no* backend but you wire *each* provider's SDK. Given the
zero-cost mandate and that we only need a couple of providers, the wiring cost is
small and one-time, and it preserves the static-site property. **Route B wins.**

---

## 4. Per-provider feasibility — they are NOT equal

The customer's "Google, GitHub, Apple, etc." flattens providers that behave very
differently under a zero-backend model. The split:

| Provider | Sign-in (browser, no secret) | Save to *their* storage | Zero-backend? | Verdict |
|---|---|---|---|---|
| **Google Drive** | ✅ PKCE via GIS | ✅ Drive API, `drive.file` scope | ✅ **Yes** | **Ship first** |
| **Dropbox** | ✅ PKCE | ✅ Files API, app-folder | ✅ Yes | Easy follow-on |
| **OneDrive / Microsoft** | ✅ PKCE (MSAL.js) | ✅ Graph API | ✅ Yes | Easy follow-on |
| **GitHub** (deck → repo/gist) | ⚠️ token endpoint has **no CORS** + wants a secret; **no PKCE** for OAuth Apps | ✅ REST API works client-side | ⚠️ Needs **Device Flow** *or* a one-function token-exchange proxy | Doable; dev audience loves it |
| **Apple / iCloud** | ⚠️ client secret is a signed **ES256 JWT** (needs a key kept off-browser) + **$99/yr** dev account | ❌ no third-party "write a file to the user's iCloud Drive" web API | ❌ No | **Out of scope** |

Two facts do the most work here:

- **GitHub** breaks "pure static" at exactly one point: the OAuth *token
  exchange* has no CORS and historically no PKCE, so the browser can't complete
  it alone. Everything *after* the token (committing a Markdown deck to a repo or
  gist) is plain CORS-friendly REST. So GitHub costs **one** tiny serverless
  function (≈30 lines, free tier) *or* the clunkier Device Flow — not a backend.
- **Apple** fails the *storage* goal outright: there is no public API to write
  arbitrary files into a user's iCloud Drive from a third-party web app. Apple
  is an *identity* provider, and its sign-in alone needs a backend to mint the
  JWT client secret. It cannot satisfy "save to their cloud," so it's dropped —
  not deferred-with-a-plan, just not a fit for this feature.

---

## 5. Chosen plan — Google Drive first

Ship the smallest thing that proves the whole model end-to-end while the site
stays free and static.

1. **Register** a Google Cloud OAuth client ("Web application"; redirect = the
   Pages origin). Free. The client **id** is public by design; there is **no
   secret** in this flow.
2. **Auth module** (client-side) in the editor: a "Connect Google Drive" control
   using GIS to obtain a `drive.file`-scoped token, held in memory /
   `sessionStorage`.
3. **Storage backend** wired alongside the existing local store: add **Save to
   Drive** / **Open from Drive** next to the current persist + export paths in
   `docs/src/playground/drawing-board-store.js` /
   `drawing-board-export.js`. A deck is just its `.md` source (+ existing export
   for PDF) written through the Drive API.
4. **Scope discipline:** `drive.file` only — Lattice can touch *only* decks it
   created. It cannot see the rest of the user's Drive, which is exactly why
   there's nothing for Lattice to be liable for.

No host migration, no DB, no recurring cost. Dropbox and OneDrive then slot in as
additional storage backends behind the same editor UI.

---

## 6. Honest caveats (record these so they aren't re-litigated)

- **No refresh tokens in-browser.** Pure-SPA flows don't get long-lived offline
  tokens; sessions are short and the user re-consents (usually silently) on
  return. Acceptable for a "save my deck" tool — and it is *precisely why*
  Lattice carries no standing credential to safeguard.
- **GitHub needs the one proxy or Device Flow.** Optional; add it when the dev
  audience asks. It's the only thing that would put any server in the picture,
  and it's a single stateless function, not a backend.
- **Apple stays out** unless the goal later shifts to Apple *identity* (not
  storage) — at which point it belongs with Route A, not here.
- **If hosted accounts ever become the goal**, Route A / Auth.js is the correct
  pivot and this decision should be revisited rather than extended.

---

## 7. Open questions for the owner

1. **Provider order beyond Google** — Dropbox and OneDrive next (broad consumer
   reach), or jump to GitHub (dev audience, but costs the proxy)?
2. **Is GitHub's one-function proxy acceptable**, given it's the only thing that
   dents the "zero server" property — or hold the line at strictly-static
   (Google/Dropbox/OneDrive only) for now?
3. **Where in the editor UI** the Connect/Save/Open controls live — the deck-setup
   drawer, or a dedicated storage menu?

Once the order and the GitHub-proxy question are settled, the Google Drive slice
is independently shippable (HARD RULE #17: one feature → one branch → one PR) and
can graduate without waiting on the others.
