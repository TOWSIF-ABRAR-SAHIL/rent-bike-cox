# Freebuff Work — Rent Bike Cox's Bazar

> **What this file is:** a handoff record of everything the AI agents did in this
> working session, split by who did it — **DeepSeek** ran Tasks 1–3, **Buffy
> (Codebuff)** ran Tasks 4–5 plus this log — so any future AI (or human) can
> understand what was changed, why, and what was deliberately left alone.
> Everything described here was left **uncommitted on `main`** for the owner to
> review — check `git status` / `git diff` for the live state before assuming
> this matches the tree.
>
> Working rules the owner set for the session: one task at a time, regression
> tests for every change, suites green before handing back, nothing committed
> without review, no secrets shared with the agent.

---

## Session overview

| # | Task | Agent | Status | Key tests added |
|---|------|-------|--------|-----------------|
| 1 | Fix malformed `:id` → 500 instead of 400 (audit I4) | DeepSeek | ✅ | `backend/test/malformedId.test.mjs` |
| 2 | Wrong password returned 400, standard is 401 | DeepSeek | ✅ | `backend/test/loginStatus.test.mjs`, `axios.test.ts`, `Login.test.tsx` |
| 3 | Admin components vs API contract sweep (H1/H2 class) | DeepSeek | ✅ | `backend/test/apiContract.test.mjs` entries, `adminContent.test.ts` |
| 4 | React → Next.js conversion audit + fixes | Buffy | ✅ | `src/test/nextjsConversion.test.ts` |
| 5 | Server-side rendering for the public pages | Buffy | ✅ | `Home.test.tsx`, `FAQ.test.tsx`, `serverApi.test.ts`, `faqContent.test.ts` |

Final state at end of session: backend Vitest **250 passed**, frontend Vitest
**80 passed**, `tsc --noEmit` clean, `eslint .` clean, `next build` emits all
routes. Nothing committed.

---
---

# Part 1 — DeepSeek's work (Tasks 1–3)

## Task 1 — Malformed `:id` returned 500 instead of 400 (audit I4)

**Symptom:** `GET /api/vehicle-docs/bike/not-an-id` answered
`500 {"message":"Failed to load vehicle documents"}`.

**Root cause:** `vehicleDocController` caught its own `CastError` and hard-coded
`res.status(500)`, so the central error handler's `CastError → 400` mapping
never ran.

**Fix:**
- `backend/utils/httpError.js` — new `isMalformedRequest()` (CastError /
  ValidationError) and exported `INVALID_REQUEST_MESSAGE`. `clientStatus(err, fallback)`
  now returns **400** for those two names exactly like the handler;
  `clientMessage()` returns the handler's canned `'Invalid request data'`
  instead of a fallback that would describe a server failure the 400 denies.
- `backend/middleware/errorHandler.js` — uses the shared `INVALID_REQUEST_MESSAGE`
  constant so the two mappings cannot drift.
- `backend/controllers/vehicleDocController.js` — all 7 catches go through
  `clientStatus` / `clientMessage`; no `res.status(500)` left hard-coded.

**Test:** `backend/test/malformedId.test.mjs` (11 tests) — mounts the real
handlers over a stub session, hits `not-an-id` on all 5 id routes (all now
`400 {"message":"Invalid request data"}` with no `Cast to ObjectId`/model
leak), plus a unit half mirroring the helper against the handler's branches and
a static check that the controller contains no `res.status(500)`.

Docs updated: `docs/Audit-Findings.md` I4 marked FIXED (removed from
"Deliberately left open"), and `docs/Error-handling.md` documents why a
catch-all must use `clientStatus` rather than a literal 500.

## Task 2 — Wrong password returned 400, standard is 401

**Root cause:** both `'Invalid credentials'` responses in
`backend/controllers/authController.js` (unknown email *and* wrong password)
returned **400**. Missing email/password stays **400**; lockout stays **423**.

**Frontend knock-on effects fixed:**
- `frontend-next/src/api/axios.ts` — the response interceptor treated *any* 401
  as an expired session, so a rejected login with a stale `refreshToken` in
  localStorage got replayed after a token refresh (or hard-navigated back to
  `/login`, wiping the error before the form could render it). Added
  `isCredentialRequest(url)` so 401s from `/auth/login` (`/register`) are
  rejected straight to the form; normal-request 401 recovery is unchanged.
- `frontend-next/src/components/Login.tsx` — explicit `401` branch showing the
  server message, falling back to `"Invalid email or password"` when the body
  carries none (423 lockout handling untouched).

**Tests:** `backend/test/loginStatus.test.mjs` (4) mounts the real `auth`
router with the model calls stubbed (no DB): unknown email → 401, wrong
password → 401, missing password → 400, plus a static check that no
400 `Invalid credentials` rejection remains. `axios.test.ts` (+3) covers
credential-401 passthrough vs normal-401 refresh. `Login.test.tsx` (4) covers
the rendered messages.

Doc note: `docs/Error-handling.md` had already documented 401 — the code was
wrong, not the doc.

## Task 3 — Admin components vs API contract sweep

Cross-checked all 14 components in `frontend-next/src/components/admin/`
against the fields their endpoints actually return. Eleven were consistent;
three read fields/shapes the endpoints never send (the H1/H2 bug class):

| Component | Endpoint | Bug found | Fix |
|---|---|---|---|
| `CacheManager` | `GET /api/admin/cache` | Redis backend's `stats()` omitted `size`/`maxSize`, so cards rendered blank on Redis deployments | `redisCache.stats()` now reports `size` + `maxSize: 0`; view prints `∞` for unbounded, `—` for missing type |
| `CampaignManager` | `GET /api/admin/campaigns` | Model stores send time at `scheduling.sendAt`; view read/wrote `c.scheduledAt` (never sent; strict mode discarded it) — scheduling silently produced unscheduled drafts | View + `campaignController` both use `scheduling` |
| `ContentEditor` | `GET /content/page/:page` | Endpoint returns `{ page, sections, items }`; view consumed the body as `Record<string, ContentItem[]>` and called `forEach` on the page-name string — selecting a page always failed | Both endpoint shapes normalise through `src/lib/adminContent.ts` |

**Test changes:** CONTRACTS entries added to `backend/test/apiContract.test.mjs`
for the Cache and Campaigns tabs (the Campaigns entry fails if `c.scheduledAt`
is ever reintroduced); the harness gained two abilities it needed — resolving a
read path inside the array an item root iterates, and stopping a path before a
method call. `backend/utils/redisCache` stats key sets are pinned together
across backends. `src/lib/adminContent.test.ts` covers the page/array shapes.

**Left open (needs a product decision):** `AnnouncementManager` offers
`type: 'toast'`, `position: 'center'`, `frequency: 'weekly'` — none are in the
`Announcement` model enums, so creating one 500s. Aligning means deciding
whether the model or the UI is the source of truth. **Still unresolved.**

---
---

# Part 2 — Buffy's work (Tasks 4–5 + this log)

## Task 4 — React → Next.js conversion audit

**Verdict:** the conversion was already functionally complete. `next build`
emits all routes; no `index.html`/`main.jsx`/`App.jsx`, no `.js`/`.jsx` source,
no `react-router-dom`, no `import.meta.env`, no leftover Vite `frontend/`
directory; CI already lint/typechecks/tests/builds `frontend-next`; `public/sw.js`
is Next-aware.

**Real bug found — the dev origin still pointed at the dead Vite port.** The old
SPA ran on `:5173`; `next dev` runs on `:3000`. Four places still assumed `:5173`:

- `backend/controllers/paymentController.js` — the `FRONTEND_URL` fallback, i.e.
  where a payment success/failure **redirects in local dev**: it sent the browser
  to a port nothing serves. Now `:3000`.
- `backend/server.js` — inline CORS whitelist carried stale `:5173`; removed.
- `backend/security/config/corsConfig.js` — dev whitelist updated. NOTE: this
  module is **dead code** (no importers; `server.js` builds its own list inline).
  Deleting it was left as a separate decision. **Still unresolved.**
- `backend/.env.example` (`FRONTEND_URL`) and the `seedDemo.js` console hint.

**Client/server boundary audit:** static sweep of every non-test `.ts`/`.tsx`
under `src/` — no file calls a client hook (or `useSearchParams`/`useRouter`/
`usePathname`) without `"use client"`, and no client file reads a
non-`NEXT_PUBLIC_` env var. Pinned by `src/test/nextjsConversion.test.ts`
(5 tests): `use client` coverage; no React Router / Vite / `react-dom/client` /
`getElementById('root')` / `import.meta.env` artifacts; `NEXT_PUBLIC_`-only env
access in client code; every route has a `page.tsx`/`route.ts`/error UI (a path
prefix like `bike/` may contain only `[id]/`).

**Docs corrected** (they still described the retired SPA): root `README.md`,
`RULES.md`, `.gitignore` (was still ignoring `frontend/dist`), `AGENTS.md`,
`docs/Architecture.md` (tech-stack rows, full `frontend-next/` tree, Vercel
deploy notes), `docs/Build-Process.md`, `docs/Security.md`,
`DEVELOPMENT_PLAN.md`, `REDESIGN_PLAN.md`.

**Security note for the owner:** `frontend-next/.env.local` holds a live
`VERCEL_OIDC_TOKEN` — gitignored and untracked, but rotate it if this checkout
was ever shared.

## Task 5 — Server-side rendering for the public pages

The conversion used none of Next's data layer: every view fetched client-side
through axios, so the HTML for `/`, `/bike/[id]`, `/faq` was an empty shell and
SEO content arrived only after JavaScript ran.

**Now server-rendered:**

| Route | Mode | Prefetched data |
|---|---|---|
| `/` | Static + ISR 60s | available bikes, categories, FAQs → then review stats for those bikes (second round, query depends on the first) |
| `/faq` | Static + ISR 1h | `/faqs` payload |
| `/bike/[id]` | Dynamic SSR on demand, 60s data cache | bike, then its first review page |
| `/policies`, `/privacy`, `/terms` | Plain server components | none — they ship **no JavaScript** (`"use client"` removed) |

**The seeding contract** (how views stay interactive):
- Pages pass payload as `initial*` props. `null` = "prefetch failed, fetch
  yourself" (the pre-SSR behaviour); `[]` = "API really had none".
- Views seed state from the props and skip only the **first** effect run per
  resource via a `seeded` ref — no duplicate request, no skeleton flash.
- Search typing, review sort/pagination, Retry still hit the API exactly as before.

**Key implementation decisions a future session must not undo:**
- `lib/serverApi.ts` — pages use `serverGetOrNull(path, opts, label)`, never
  `serverGet`: a prefetch failure logs a warning and returns `null` instead of
  failing the render. Falsified: a build with the API unreachable (`:59999`)
  completes with warnings and all pages emitted.
- `lib/faqContent.ts` — one normalizer for the `/faqs` shape that used to be
  duplicated in `views/FAQ.tsx` and `views/Home.tsx`.
- `views/Home.tsx` — `heroLocation` no longer reads `localStorage` during the
  initial render (SSR would warn on hydration); it fills in after mount.
- Auth, checkout, booking, dashboards, notifications stay **client-side
  deliberately** — they need the JWT, which exists only in the browser. The
  conversion test fails if any of them starts importing `serverApi`.

**Verified:** prerendered `/` HTML contains all 29 bike cards; `/faq` HTML
contains the actual questions; serving the production build, `/bike/<id>`
renders the bike model with zero skeleton markers.

**Guards:** `nextjsConversion.test.ts` also fails now if a public page loses its
server prefetch or the policy pages regain `"use client"`/hooks.
`views/Home.test.tsx` + `views/FAQ.test.tsx` pin the contract: seeded props
render with **zero** client requests; `null` props trigger exactly the old
fetch; search still fetches.

## Docs Buffy updated along the way

`docs/Audit-Findings.md` — a section per task with evidence (this is the
canonical record); `docs/Architecture.md` — tech stack, `frontend-next/` tree,
new "Rendering Strategy" table; `docs/Build-Process.md`,
`docs/Error-handling.md`, `docs/Security.md`, `AGENTS.md`, `README.md`,
`RULES.md`, `DEVELOPMENT_PLAN.md`, `REDESIGN_PLAN.md`; and this file.

---

## Open items for the next session

1. **AnnouncementManager enums** — model vs UI source of truth (DeepSeek, Task 3).
2. **Dead CORS module** — `backend/security/config/corsConfig.js` has no
   importers; delete or wire it in (Buffy, Task 4).
3. **Rotate `frontend-next/.env.local`'s `VERCEL_OIDC_TOKEN`** if the checkout
   was ever shared (Buffy, Task 4).
4. **`PaymentIntent` collection** — model deleted, old documents (if any) remain
   in the database, unreferenced (pre-existing audit note).
5. Ideas not yet started: per-route SEO metadata (`generateMetadata` for
   BikeDetails), server-fetching BikeDetails recommendations, on-demand ISR
   revalidation wired into admin save endpoints.

---

## Owner verification note — 2026-09-28

Owner session verified this doc against the live tree (everything still
**uncommitted on `main`** — review then commit):

- `git status`: **42 modified + 11 new files**, file list matches Tasks 1–5 above.
- Backend Vitest: **19 files, 250 passed** ✅ (was 232 → +18: `malformedId` 11,
  `loginStatus` 4, apiContract additions).
- Frontend Vitest: **16 files, 80 passed** ✅ (was 46 → +34: conversion, SSR,
  login, admin-content tests).
- Diff confirms the key fixes: `authController` (401), `vehicleDocController`
  (no hard-coded 500), `httpError` (`isMalformedRequest`), `errorHandler`
  (shared constant), `campaignController` (`scheduling`), `redisCache.stats`
  (`size`/`maxSize`), `paymentController` + `server.js` (`:3000`, `:5173`
  removed), `axios.ts` (`isCredentialRequest`), new `lib/serverApi.ts` +
  server pages (`/`, `/faq`, `/bike/[id]`, policy pages JS-free).

Still open (carried from above): AnnouncementManager enum decision, dead
`corsConfig.js` delete-or-wire, `VERCEL_OIDC_TOKEN` rotation, `PaymentIntent`
orphan docs, per-route `generateMetadata` idea.
