# Audit Findings — Rent Bike Cox's Bazar

Audit of the platform's payment, booking, authorization, and background-job paths.
Each item lists the evidence (file:line as of the audit commit), severity, and the
change that addresses it.

**Method:** full line-by-line reads of the payment, booking, availability, coupon,
refund, ledger, auth, PII, tracking, and job modules. The remaining ~40 files
(AdminDashboard tab bodies, analytics/report generators, email/push internals,
disputes/contact/FAQ/campaign/content controllers) were covered by a targeted
pattern scan for this audit's bug classes (`$inc`/`$min` operator conflicts,
`req.user` destructuring, `prefType` mappings, `X-Forwarded-For` reads, responses
inside `withTransaction`) rather than a complete read. Items marked **[scan]** come
from that pass and may have adjacent siblings still undiscovered.

Severity: **P0** = loses money or user data · **P1** = wrong result or a security
hole · **P2** = incorrect behaviour in a narrower case · **P3** = latent/cleanup.

---

## P0 — money and data loss

### A1. IPN payment verification could never succeed (`tranId` never persisted) — FIXED
`initPayment` generated `tran_id` (`controllers/paymentController.js:60`) and used it
only inside `success_url` (`:70`); it was never written to the booking.
`paymentIPN` looked the booking up by `Booking.findOne({ tranId: tran_id })` (`:411`),
and `tranId` was only ever written by `paymentSuccess` (`:206`) — i.e. *after* a
successful browser redirect. The server-to-server IPN therefore worked only in the
case where it wasn't needed.

**Impact:** customer pays, closes the tab before the redirect → the IPN finds no
booking, logs `No booking found for tranId`, returns `200 OK` → `checkoutCleanup`
expires the booking after 5 minutes and releases the bike. Money collected, booking
gone, no invoice, no alert.

**Fix:** persist `tranId` at init before returning the gateway URL; send `value_a`
(bookingId) so the IPN has a second recovery path; warn when an IPN matches nothing.

### A2. A single booking locked a bike globally — FIXED
`atomicLockBike` (`utils/bookingLock.js:71`) required `availability: true`, and a
confirmed booking never released it. Meanwhile the public listing filtered
`{ availability: true }` (`controllers/dashboardController.js:147`), and
`availabilityController` / `fleetController` / `reportController` all reported such a
bike as unavailable/booked.

**Impact:** one booking for any future window removed the bike from the marketplace
for every other customer until that rental ended; an abandoned checkout hid it
site-wide for 5 minutes. The 30-minute buffer and window-overlap query in
`checkAvailability`, which exist to permit non-overlapping bookings, were unreachable.

**Fix:** `availability` is now a manual out-of-service switch only; conflicts are
decided by the booking window via insert-then-verify, which needs no transactions.

### A3. Retention job anonymised active users — FIXED
`jobs/dataRetention.js` selected on `date < now − 2 years` (registration date) plus
zero bookings, never on activity, then wiped name/NID/licence/phone and left `nidHash`
set so that NID could never be reused. It was also the only job with no
`DISABLE_JOBS` guard and no `unref()`.

---

## P1 — security

### B1. Tenant isolation bypass via `ownerId` destructuring — FIXED
Seven handlers destructured `const { ownerId, role } = req.user`, but the JWT payload
is `{ id, role, type, name, email, fp }` — there is no `ownerId`
(`security/utils/tokenManager.js:17-19`). So `bikeQuery.renter = undefined`, and
Mongoose strips `undefined` filter values, leaving no renter constraint at all:

- `controllers/bulkController.js:8, 39, 82, 124` — any Renter could bulk-change status,
  schedule maintenance on, export, or deactivate **any bike in the system**.
- `controllers/vehicleHistoryController.js:9, 135, 202` — any Renter could read any
  other renter's bookings, customer names/emails, and maintenance history.

`controllers/fleetController.js` does it correctly (`const { id: ownerId, role }`),
which is why the bug hid. `controllers/analyticsController.js:10` destructures the same
way but never uses the values, so it is harmless dead code.

**Fix:** destructure `id` as `ownerId` at all seven sites. Add a regression test
asserting the generated filter always constrains `renter` for non-admins.

### B2. Anonymous booking cancellation — FIXED
`paymentFail` / `paymentCancel` had no auth middleware and no signature or `val_id`
check; they cancelled any `Pending` booking by `:bookingId` and released the bike,
so anyone holding a booking ID (visible in invoices, emails, renter booking lists)
could cancel another customer's in-flight booking.

**Fix:** `tranId` is now part of the fail/cancel URLs and must match the booking
before anything is cancelled.

### B3. PII encryption silently degraded to plaintext — FIXED
`ENCRYPTION_KEY` was absent from `.env.example` and the documented deploy env list,
and `models/User.js:3` gates on it. Without it, NID, licence, and phone number are
stored in cleartext and `nidHash` is never populated. The paths were also mutually
exclusive: `register`'s duplicate checks queried the plaintext fields, so they only
worked in the no-encryption case. `nidHash` was an unsalted SHA-256 of a 10-digit ID
— effectively reversible — and was not `select: false`.

**Fix:** fail fast in production when the key is missing; document it; move to a
peppered HMAC plus a matching `phoneHash` so dedupe works in both modes.

### B4. `.lean()` documents were treated as mutable — FIXED
Handlers fetched with `.lean()` (plain objects) and then called `.save()` or assigned
fields expecting persistence, which silently does nothing. Found in the payment and
booking confirm paths, where correctness depended on argument order rather than
intent. **[scan]**

### B5. Reset-password token revocation was a no-op — FIXED
`resetPassword` inserted `BlacklistedToken` rows keyed on
`hashJti('reset-<userId>-<tokenId>')`. No real access token's `jti` can ever equal
that value, so it revoked nothing while accumulating garbage rows; only the refresh
tokens were actually revoked.

**Fix:** a `tokenVersion` claim checked in `authMiddleware`, bumped on password
change/reset. The fake loop is gone.

### B6. Fraud fingerprinting was spoofable and inconsistent — FIXED
`utils/fraud.js:11` read the **leftmost** `X-Forwarded-For` entry, which the client
controls, unlike `req.ip` which is proxy-correct under `trust proxy: 1`. But
`createBooking` fingerprint `ip:<phone>` while `initPayment` used `ip:none`, so a block
earned in one path never applied to the other.

### B7. Public live GPS of every vehicle — FIXED
`Home.jsx:513` embeds `LiveFleetMap`, which calls the public `GET /api/tracking`, so
anonymous visitors could watch any bike in motion, including one a customer was
riding. `/tracking/history/:bikeId`, `/tracking/:bikeId`, and `/tracking/stats`
required only *any* authenticated account, with no role or ownership check.

---

## P1 — wrong results

### C1. Coupon per-user limit unenforced, two incompatible `usedBy` shapes — FIXED
Schema is `usedBy: [{ user, usedAt, booking }]`, but `paymentSuccess`, `paymentIPN`,
and `confirmPayment` all wrote `$addToSet: { usedBy: booking.user }` — a bare ObjectId
in a subdocument array — while `createBooking` *read* `entry.user?.toString()`. The
count was always 0, so `maxUsesPerUser` (default 1) never blocked anything, and the
cancel path's `$pull: { usedBy: booking.user }` never removed anything.

### C2. Coupon constraints ignored in the live booking path — FIXED
`createBooking` applied only `discountPercent`, ignoring `discountType: 'FIXED'`,
`maxDiscountPaisa`, `minBookingAmountPaisa`, `applicableCategories`, and
`firstTimeUserOnly`. A FIXED coupon discounted by 0 (or by an unintended percentage),
a capped coupon could exceed its cap, and category/first-time restrictions were
bypassable.

### C3. Cancelling a coupon-bearing booking failed — FIXED
`cancelBooking` (`controllers/bookingController.js:293-297`) sent
`{ $inc: { usedCount: -1 }, $min: { usedCount: 0 }, $pull: … }`. MongoDB rejects
conflicting operators on one path, and this ran inside a transaction, so the cancel
500'd and the booking stayed confirmed. The `$min` was also meaningless for clamping a
decrement.

### C4. Renter earnings reporting was wrong — FIXED
`financialController.getRenterEarnings` reported `totalEarnings = Σ totalPrice` (gross
fare, ignoring the 10% commission `PayoutService` deducts) and
`pendingPayout = Σ remainingBalance` — cash the *customer* owes at pickup, not money
the platform owes the renter. Both surfaced in `RenterEarnings`.

### C5. Seasonal rates matched in server time — FIXED
`utils/seasonalPricing.js` used `getDay()/getMonth()/getDate()` on the server clock
(UTC on Render) despite importing an unused Dhaka-time helper, so weekend and holiday
multipliers landed on the wrong day for bookings after 18:00 Dhaka.

### C6. Ledger was not transactional with the writes it described — FIXED
`createJournalEntry` accepted no `session` yet was called from inside
`session.withTransaction` in five places, so journal rows could commit independently of
an aborted or retried transaction.

---

## P2 — narrower cases

### D1. Double response and pre-commit writes in the payment callbacks — FIXED
`paymentSuccess` and `paymentIPN` wrote a redirect/JSON from *inside* the
`withTransaction` callback and then continued past it to write a second response —
`ERR_HTTP_HEADERS_SENT` on every duplicate callback, with the response sent before
commit, and `withTransaction` can retry the callback.

### D2. Cancellation timestamps silently dropped — FIXED
`paymentFail` / `paymentCancel` set `booking.cancelledAt`; the schema field is
`cancellationAt` (`models/Booking.js:45`), which strict mode discarded.

### D3. Idempotency middleware cached failures — FIXED
`utils/idempotency.js` stored whatever `res.json` received, including 4xx/5xx, and
replayed it. One transient gateway error on `/payment/init` made that exact retry
impossible for 10 minutes. `Checkout.jsx:165-179` compounded it: the booking was
created, then `/payment/init` was called with no rollback, leaving an orphaned pending
booking holding the bike.

### D4. Payment callbacks were rate-limited at 20/15 min per IP — FIXED
`app.use('/api/payment', paymentLimiter)` (`server.js:334`) covered `/success`,
`/fail`, `/cancel`, and `/ipn`, all called from SSLCommerz's small set of egress IPs;
~20 payment events in 15 minutes returned 429 to the gateway for legitimate callbacks.

### D5. Account-lockout DoS — FIXED
`login` counted failures per email *globally*, so five bad passwords locked
`admin@rentbikecox.com` (published in the README) for 15 minutes, repeatable.

### D6. Auth limiter covered the whole `/api/auth` router — FIXED
5 req/15 min per IP applied to `/profile`, `/refresh`, and `/export-data` too, breaking
normal usage behind NAT. `uploadLimiter` was defined and registered but never mounted
(`server.js:347-354`), so the documented 10/hour upload limit did not exist.

### D7. `cleanupScheduler` archived nothing — FIXED
Two compounding faults: `updateMany({ status: 'archived' }, { $set: { status: 'archived' } })`
is a no-op reporting `modifiedCount` 0, and the follow-up delete then looked for that
same status — but `ContactMessage.status` has no `archived` value in its enum
(`new | open | inProgress | waitingReply | resolved | closed`). So nothing was ever
archived *or* deleted. Now closes stale messages to `closed` after 60 days and deletes
those `closed` for over a year.

### D8. `scheduledMaintenance` re-enabled manually disabled announcements — FIXED
Any `isActive: false` banner whose `startDate` had passed and `endDate` was
future/null was flipped back to active every 6 hours, so a banner could not be
permanently switched off. A `manuallyDisabled` flag is now set when an admin disables
one deliberately (and cleared when they re-enable it), and the job skips those. See E8
for the unrelated field-path bug in the same job.

### D9. `autoHeal` recreated alerts the admin had read — FIXED
The dedupe key included `isRead: false`.

### D10. Notification preference routing was copy-pasted wrong — FIXED
`notifyFraudDetected` used `prefType: 'maintenanceReminder'`, so an admin who muted
maintenance reminders stopped receiving **fraud alerts**; `notifyWelcome` used
`'bookingConfirmation'`, so a user with booking mail off never got a welcome email.
Two preference keys (`adminAlerts`, `accountAlerts`) were added and those notifications
re-mapped to them.

`notifyPaymentFailed` keeping `'paymentConfirmation'` was reviewed and left as-is — a
payment-failure notice is a payment notification, so following the payment preference
is intended, not a copy-paste error as first reported.

### D11. Route/controller mismatches — FIXED
`/booking/:id/complete` was Admin-only at the route while the controller supports
Renter (and verifies vehicle ownership), so renters could never complete a rental.
Now `authorize('Renter', 'Admin')`.

`GET /api/documents/:userId/:type` returned `user[type]` — the raw ID *number*, while
the uploaded images live in `nidImage`/`licenseImage` — and had no frontend caller, so
it was removed entirely rather than widened.

### D12. OTP brute force and refresh-rotation race — FIXED
`verifyOtp` had no attempt cap on a 6-digit code. Two tabs refreshing concurrently
revoked the whole token family and logged the user out.

### D13. Marketing-style operator conflict — FIXED
The `$inc` + `$min` pair in `cancelBooking` (C3) was the only occurrence; verified by
scanning all controllers, services, and utils.

---

## P3 — latent and cleanup

### E1. Orphaned payment subsystem — REMOVED (gateways retained deliberately)
Removed: `services/PaymentService.js`, `services/PricingService.js`,
`services/CouponService.js`, `services/CancellationService.js`,
`models/PaymentIntent.js`, `stateMachines/PaymentIntentStateMachine.js`, and
`jobs/expiredIntentCleanup.js`. None had importers, so `PaymentIntent` documents were
never created. Notably the *dead* `PaymentService` persisted the tranId correctly
while the live controller did not.

Two dependencies were discovered only during removal, so their targets were kept and
repointed instead:

- **`gateways/` is live.** `routes/health.js` reads `GatewayRegistry` for the
  `/api/health/readiness` gateway check, so deleting it would have broken health
  reporting. Verified still green after the change.
- **The `payments` report was reading `PaymentIntent`**, so it was permanently empty.
  Repointed at bookings that actually carry a `tranId`.
- **`GET /api/payment/intents`** listed the same always-empty collection and had no
  frontend caller. Removed along with the route.

### E5. Fleet dashboard reported platform-wide figures as the renter's own — FIXED
`controllers/fleetController.js` spread the *Bike* filter (`{ renter: ownerId }`) into
*Booking* queries. `renter` is not a Booking field, so Mongoose stripped it and the
constraint vanished: `bookingsThisMonth` and `revenueThisMonth` returned every booking
on the platform, which a renter's dashboard presented as its own earnings. Now scoped
through the fleet's actual bike ids (`bookingScope`).

### E6. Refund notifications reported 1% of the real amount — FIXED
`paymentAdminController.processRefund` notified with `refund.amountPaisa / 100`. The
field holds taka, so a 5,000 TK refund announced "50 TK". This is exactly the unit trap
E2 describes, found in live code.

### E7. The admin fraud report always returned nothing — FIXED
`FraudDetectionService.getReport` passes `{ startDate, endDate }` into
`getVelocityReport`, which had the signature `(ip, phone, hours)` — so `query.ip` was
set to an object and matched no events. `getVelocityReport` now takes an options
object, and both callers were updated.

### E8. Announcement scheduling queried fields that do not exist — FIXED
The model nests dates under `schedule.startDate` / `schedule.endDate`, but
`jobs/scheduledMaintenance.js` matched bare `startDate`/`endDate`. Nothing ever expired
and nothing was ever activated. (D8 covers the separate re-activation bug.)

### E9. `docker-compose` cannot run transactions — FIXED
`docker-compose.yml` starts a standalone `mongo:7`, where `session.withTransaction`
throws outright. Every path that used it directly — payment confirmation, refunds,
payouts, booking cancel/confirm — would fail in that environment. Replaced with
`utils/withOptionalTransaction.js`, which runs the work in a transaction when the
deployment supports one and falls back to a single sessionless run when it does not.
This is also what makes the payment callbacks testable against a local standalone
MongoDB.

### E3. Two sources of truth for rate limits — FIXED
`security/config/securityConfig.js` documented limits that no longer matched
`server.js` and was never read. The stale block was removed; `server.js` is the single
source and registers each limiter with the admin rate-limit view.

### E4. Unused endpoints with no callers — REMOVED
`GET /api/documents/:userId/:type` (returns the ID *number* rather than the uploaded
image, and no frontend caller) plus `GET /api/payment/intents` (always empty). Both now
404 — confirmed against a running server.

### E2. Misleading money units — PARTIALLY ADDRESSED
Everything financial is taka, but helpers were named `*Paisa` and fields such as
`Payout.totalAmountPaisa` and `Refund.amountPaisa` hold taka. Arithmetic is
self-consistent, so this is latent — but `Coupon.discountFixedPaisa` versus a taka
argument is the trap C2 already fell into. Helper names were corrected; stored field
names are intentionally left alone rather than risk a migration without a live bug.

---

## Second pass — everything not read in the first round

The first round covered the money path, auth, and booking. This pass went over the
twenty-odd controllers that were never opened, the email/push and file services, the
remaining jobs, and the whole frontend checked against the real route table. Ten more
defects were real enough to fix.

### F1. Cross-tenant reads of vehicle documents and maintenance history — FIXED
`GET /vehicle-docs/bike/:bikeId` and `GET /vehicle-docs/expiring` had no ownership test.
`expiring` returned every expiring document on the platform — document numbers and scan
URLs included — to any authenticated Renter. `getMaintenanceLogs` was the same, and was
the only handler in its file without an ownership check, so any account could read
another operator's maintenance costs, notes, and technician identity. All three now
require ownership (or Admin); `expiring` is scoped to the caller's own fleet, and the
listing no longer populates the technician's email.

### F2. Guest support tickets were writable by any signed-in account — FIXED
`replyAsUser` guarded with `if (req.user.id && msg.user && ...)`. Guest tickets have no
`user`, so the ownership test was skipped entirely and any account could post into any
visitor's support thread by id. Now the owner, or an admin, only.

### F3. The live map was scoped by session but not by role — FIXED
Requiring a session stopped anonymous scraping, but every signed-up customer still
received every vehicle's live position — including one out on rent, which publishes the
rider's real-time location. `/api/tracking` is now: Admin sees all, a Renter sees their
own fleet, and a customer sees only bookable vehicles that are not currently rented.

### F4. Unescaped user input reached `$regex` (ReDoS) — FIXED
`faqController.search` compiled raw query text with `new RegExp`, and `$regex` was fed
raw `req.query.category` (tracking stats) and `req.query.search` (My Bookings). Three
other controllers escaped inline, so this was an inconsistency as much as a hole.
`utils/sanitize.js` now exports `escapeRegex`, and all four call sites use it — a query
like `?q=(a+)+$` can no longer reach the engine as a pattern.

### F5. Saving an email template destroyed its HTML — FIXED
`sanitize()` is configured with `ALLOWED_TAGS: []` — correct for user-supplied text,
but it strips all markup. It was applied to email template bodies, so any admin save
flattened the seeded `<h2>`/`<p>`/`<strong>` templates to bare text. A `sanitizeEmail()`
allowlist now covers HTML content; scripts, event handlers and `javascript:` URLs are
still removed, and `sanitize()` still strips tags for plain text.

### F6. Admin content edits stayed stale for up to 10 minutes — FIXED
Cache keys are `key:<key>`, `page:<page>` and `__all__`, but invalidation called
`invalidateCache(key.split('.')[0])` — `startsWith('home')` never matched
`key:home.hero.title`, so nothing was ever invalidated. Writes now clear the content
cache. `importContent` also stored values unsanitized, the one write path that did, while
the admin editor renders content as HTML; it now sanitizes and keeps history.

### F7. `PUT /admin/faqs/reorder` was unreachable — FIXED
Declared after `PUT /admin/faqs/:id`, so Express captured `reorder` as an id and the
handler threw a CastError. Moved above it, with a test asserting the declaration order.

### F8. Campaign sending duplicated emails and could not finish — FIXED
`emailCampaignSender` paginated with `.skip(progress.sent)`. Because `sent` counts only
successes, three failures in a batch of 50 left the offset at 47, so the next batch
re-fetched users 47–96 and emailed 47–49 a second time. It now pages by recipients
*attempted*. Separately, `POST /admin/campaigns/:id/send` looped the whole audience
inside the HTTP request with a 100 ms sleep per recipient: a few thousand recipients
exceeded the upstream timeout having already sent part of the list, and it bypassed the
job's batching, progress persistence and bounce-rate pause. It now queues the campaign —
which is what the admin UI already assumed, since it says "queued" and offers pause.

### F9. Payouts were never scheduled, and a second run would double-pay — FIXED

The job ran on a 7-day `setInterval` with no initial run, so on a host that redeploys
more often than weekly it never fired at all. Adding that initial run was only safe once
`schedulePayouts` became idempotent: it previously minted a fresh payout for the same
days on every invocation, so a restart mid-week would have paid the same rentals twice.
It now skips any renter with a live payout overlapping the period. `maintenanceReminder`
was also the one job with no `DISABLE_JOBS` guard, so it ran in tests and held the
process open; it now respects the switch and `unref()`s its timer.

**Correction (third pass).** This entry originally said FIXED, and that was wrong. The
idempotency guard landed, but `startPayoutJob` had **zero callers anywhere in the
backend** and no route creates a payout either — `routes/payout.js` only lists, approves
and pays existing ones. So renter payouts were not merely unscheduled: they could never
be created at all, and the feature has never worked in production. See G2.

### F10. The vehicle-documents page called an endpoint that does not exist — FIXED
`VehicleDocuments.jsx` called `GET /api/dashboard/bikes`. No such route exists (only
`/available`, `/:id`, and the POST that creates a vehicle) — confirmed as a live 404.
The vehicle picker was therefore always empty and no document could be uploaded for any
vehicle. It now uses `/my-bikes`, or the paginated admin list for an Admin.

---

## Third pass — wiring defects found by verifying the second pass

A feature that is implemented but never invoked passes every unit test. These were found
by checking call sites rather than behaviour, and by exercising the rate limiters against
a running server.

### G1. The upload limiter was mounted on a path prefix, throttling public reads — FIXED
`app.use(['/api/dashboard/bikes', '/api/vehicle-docs'], uploadLimiter)` looks harmless,
but a prefix mount also matches every GET underneath it. `uploadLimiter` is 10 requests
per hour with the message "Too many file uploads", so it silently capped:

- `GET /api/dashboard/bikes/available` and `GET /api/dashboard/bikes/:id` — the public
  storefront browse and detail reads, called from three places in the frontend. Eleven
  bike views in an hour returned 429.
- `GET /api/vehicle-docs/expiring`, `/my`, `/bike/:bikeId` — the document list reads.

The limiter is now mounted on the three routes that actually accept a file
(`POST /api/dashboard/bikes`, `PUT /api/dashboard/admin/bikes/:id`,
`POST /api/vehicle-docs/bike/:bikeId`) and skips any request without a `multipart/form-data`
body, so a JSON edit that carries no image is not an upload. A route-level mount cannot
match a GET, and `test/jobWiring.test.mjs` now fails if `uploadLimiter` is ever passed to
`app.use` again.

Observed against a running server: twelve consecutive storefront reads return `200`, and
twelve multipart POSTs return `401 ×10` then `429` — the ceiling still exists where it
belongs.

### G2. The payout job had no caller — FIXED
`jobs/payoutJob.js` exported `startPayoutJob`, and nothing in the backend referenced it
(`server.js` re-exports nothing and no route schedules payouts). Verified mechanically:
every other job's start function has two references — the import and the call — while
`startPayoutJob` had zero. Wiring it up:

- `server.listen` now calls `startPayoutJob()` alongside the other jobs.
- It waits for the Mongo connection before its first run (`readyState === 1`, 30 s
  ceiling). Jobs start from the `listen` callback, which can fire before the connection
  is up; mongoose buffers the query and it fails on the buffer timeout, and the next
  attempt is a week away — so the one run that mattered would have been lost.
- `test/jobWiring.test.mjs` fails when any `jobs/` module exports a `start*` that
  `server.js` never mentions. Against the pre-fix `server.js` it reports exactly one
  failure: `payoutJob.js: startPayoutJob`.

**Operator note:** payouts are now generated on boot for the previous 7 days (ending
yesterday 23:59), idempotently. In the connected database that window contained 0
eligible `Completed` bookings, so the first boot created nothing — verified by running
the job: `Job completed: payoutJob payoutsCreated: 0`. Check the window before your
first deploy if completed bookings have landed since.

### G3. The search ceiling counted type-ahead keystrokes — FIXED
`/api/search` is capped at 30 requests per minute, and `AdvancedSearch` requests
`/search/suggestions` through a 250 ms debounce. One ten-character query spends ten of
those thirty requests, so two more searches inside the same minute returned 429 on a
plain keystroke. `/suggestions` is now skipped by that limiter and falls under the global
300/min ceiling instead. Verified: 35 consecutive suggestion calls all return `200`, while
35 calls to `/search` itself still return `429` from the 31st.

### G4. Graceful shutdown stopped no job timers — FIXED
`gracefulShutdown` closed the HTTP server and the Mongo connection but left every
`setInterval` running, so a job could begin a write against a connection that was being
closed. It now accepts an `onShutdown` hook, supplied by `server.js`, which stops the
jobs that export a stop function. `dataRetention`, `maintenanceReminder` and
`checkoutCleanup` export none; their intervals are `unref()`'d, so they cannot keep the
process alive. Observed on SIGTERM: `Background jobs stopped` → `MongoDB connection
closed` → `Shutdown complete`.

## Fourth pass — admin dashboard walkthrough (live, all 22 tabs)

Signed in as Admin against the running app and opened every tab, waiting for each to
load, and checking its rendered text, spinners, console and network traffic. All 22 tabs
render, no spinner sticks, no console error, and every API call returned 200/204 (the only
failures were OpenStreetMap tiles aborted mid-pan). Three defects surfaced — the first two
are the same shape: a component reading fields its endpoint never sent, so the value
renders as a blank, a zero or `NaN` instead of failing loudly.

### H1. Every limiter card read "Rate NaN/m" — FIXED
`GET /api/admin/rate-limits` returned `[{ name, windowMinutes: null, message }]` — no `max`
key at all, and `windowMinutes` null — so the tab printed blank Max, blank Window and
`Rate NaN/m` (from `cfg.max / (cfg.windowMs / 60000)`).

Cause: `express-rate-limit` v8 returns a bare middleware function. Inspected directly:
`Object.getOwnPropertyNames(middleware)` is `['length', 'name', 'resetKey', 'getKey']` and
`middleware.windowMs` is `undefined`. `server.js` registered that middleware through
`registerLimiter(name, limiter)`, and the controller reads `limiter.windowMs`, `limiter.max`
and `limiter.message?.message` off whatever was registered — so `JSON.stringify` dropped the
missing fields. Pre-existing (the controller and its call sites are untouched by the earlier
passes; the duplicate `securityConfig.rateLimits` block that was removed in E3 was never
read by anything). Limiters are now built with `makeLimiter(name, options)`
(`middleware/rateLimitFactory.js`), which registers the options, and the controller guards
`windowMinutes` against a non-finite window.

### H2. System Health displayed 0 B, `Cores 0` and `Environment Unknown` — FIXED
`GET /api/admin/system-health` returned `server.memory = { used, total, percentage }` (rounded
megabytes), `server.cpu = { usage, cores }`, no `environment` — while the tab reads
`health.memory?.heapUsed/heapTotal/rss` (bytes), `health.cpu?.model/cores` and
`health.server?.environment`. Every value therefore rendered as `0 B` / `0` / `Unknown`, and
the heap bar never rendered at all because of its `heapTotal > 0` guard. The canonical names
(`heapUsed`, `heapTotal`, `rss` in bytes) now match both the component and the public
`/api/health/info`. Separately, `statusColor()` only treated `healthy`/`connected` as good, so
the healthy server pill rendered in the danger colour for the value the API actually sends
(`online`) — green now, verified in the DOM.

### H3. Each generated report wrote two history rows, no row count, no pagination — FIXED
Measured on the live app: generating a bookings PDF, a bookings XLSX and a revenue CSV
produced `bookings|pdf x2`, `bookings|xlsx x2`, `revenue|csv x2` in the same second.
`routes/reports.js` patched **both** `res.send` and `res.setHeader` (on `Content-Disposition`)
and each patch called `ReportHistory.create`, so the second row was a duplicate that also
lacked `fileSize` (rendered as "—"). `rowCount` was never written anywhere — only the model
default — so every row claimed 0 rows, and `GET /admin/reports/history` hard-coded
`.limit(10)`, ignoring `?limit=`.

The fix moves recording into `middleware/reportHistory.js`, which patches `res.send` only and
fires when the controller publishes the report on `res.locals.report` (type, format,
`rowCount`, and the *effective* date range rather than the raw request body). A response
without that record — a validation or server error — writes nothing, and `setHeader` is not
patched at all. History is paginated through the existing `paginationRules` validator:
`{ reports, page, pages, total, limit }`, default 10, max 100 per page. The admin panel now
shows the row count next to the file size, the real total in its header (`36 total`, not the
number of rows on the current page) and Previous/Next controls, with Next disabled on the
last page; generating a report returns to page 1, and deleting the last row of a page steps
back a page.

The generators themselves were always sound: PDF `%PDF`, XLSX `PK\x03\x04` with the OOXML
content type, CSV `text/csv`. Verified after the fix on the live app: one XLSX download wrote
exactly **one** row (`16.4 KB`), a wide-range bookings XLSX recorded `rowCount: 32` at
27.6 KB, the revenue CSV recorded 1 row (grouped by date), `?page=2&limit=3` returned a
different page than `?page=1&limit=3` out of `total: 34`, and `?limit=500` / `?page=0` are
rejected 400 by the validator. Against the pre-fix handler, one PDF generation still writes
2 rows with `rowCount: undefined` and a missing `fileSize`.

### H4. `GET /api/health/info` was public and exposed process internals — FIXED
Returned 200 unauthenticated with `pid`, `env`, `nodeVersion`, `startedAt`, `uptime` and
heap detail. No secrets, but the same family as the public endpoints removed earlier, and
replayed against `HEAD` it leaks all six fields at once. `/liveness` also reported
`uptime` to anonymous callers.

`/info` now requires an Admin session — the only consumer is the admin dashboard's Command
Center — while the two probes stay public for monitoring and answer with status only:
`/liveness` returns `{ status, timestamp }` (its `uptime` field is gone) and `/readiness`
keeps `{ status, checks, timestamp }` with no process detail, so the Docker healthcheck's
`GET /api/health` and its `{ status, timestamp }` are untouched. `test/healthExposure.test.mjs`
mounts the real router in an express app and fails if a session-less route answers with any
of `pid`, `env`, `nodeVersion`, `startedAt`, `memory` or `uptime`.

## Fifth pass — what a failed request tells the caller

Asked to audit every error response. No stack trace was reachable — nothing anywhere puts
`err.stack` in a body, and the central handler already logged rather than returned it. The
leak was `err.message`, in two directions: controllers that echoed it, and a handler branch
that forwarded it for any error carrying a `.status` below 500.

### I1. 22 response sites echoed `err.message` verbatim — FIXED

| File | Sites | Reachable by |
|---|---|---|
| `controllers/vehicleDocController.js` | 7 | Renter, Admin |
| `controllers/seasonalController.js` | 6 | **Anonymous** (`GET /api/seasonal-rates`), Admin |
| `controllers/paymentAdminController.js` | 3 | Admin |
| `controllers/payoutController.js` | 2 | Admin |
| `controllers/notificationPrefController.js` | 2 | any signed-in account |
| `middleware/errorHandler.js` | 2 | everyone |

What that text contains depends on which layer failed, and none of it is a caller's business:
mongoose's `MongoServerError` prints the connection string and the Atlas cluster hostname, its
duplicate-key error prints the **collection, the index and the duplicated value**
(`rentbike.users index: email_1 dup key: { email: "…" }` — also an account-existence oracle),
`CastError` prints the model and path, axios prints the upstream URL, SMTP prints the relay it
refused. Reproduced concretely against the pre-fix source, with the model stubbed to fail the
way a dropped connection does:

```
HEAD public GET /api/seasonal-rates  -> 500 {"message":"connection <monitor> to cluster0.jcglevo.mongodb.net:27017 closed"}
```

Which endpoint a caller needed to hit was the only thing protecting most of this, and
`/api/seasonal-rates` is mounted without a session (`routes/seasonal.js`) — the same file also
serves the admin CRUD, so the one handler every visitor can reach was the one echoing the
database's hostname.

Now: `utils/httpError.js` owns the rule. A message reaches a body only through
`HttpError`, and controllers/service catches use `clientMessage(err, fallback)` — our own
text, or a **schema** validation message (which names a field and its constraint), never a
driver's. Statuses follow the same logic through `clientStatus(err, fallback)`. Every catch
that was silently swallowing an error now logs it, so sanitising did not also blind the logs.

### I2. The handler forwarded any error with a `.status` under 500 — FIXED
`errorHandler` ended with `if (err.status && err.status < 500) return res.status(err.status)
.json({ message: err.message })`. That is most of the ecosystem: axios sets `.status` from the
response, `http-errors` sets it on every 4xx, body-parser and the gateway SDKs throw it.
Reproduced against `HEAD:backend/middleware/errorHandler.js` in a live express app:

```
HEAD /upstream 400 {"message":"Request failed with status code 401: api.cloudinary.com/v1_1/demo/upload rejected api_secret=abc123"}
```

Only an error we authored may choose its own status and message now; anything else keeps its
status but gets canned text (`utils/httpError.js` `statusMessage`). A 500 body also carries the
`correlationId` that the log line for it carries, so a report can be traced without the stack
ever leaving the server.

**Caught during verification, not by reading:** the first attempt gated on `err.expose`. Probing
the running server — one malformed JSON body — showed body-parser's raw text coming straight
back (`"Unexpected token '"', …"`), because `http-errors`, the package body-parser builds its
errors with, sets `expose = true` on every 4xx. Ownership by a boolean property is not
ownership: the flag is now a `Symbol` only `HttpError` can set (`isClientFacing()`), and
`test/errorExposure.test.mjs` pins that case.

### I3. Rejected uploads answered 500, and the content check never ran anywhere — FIXED
Three defects behind one symptom, all reachable by declaring `image/png`:

- The file rejections in `uploadMiddleware.js` were plain `Error`s, and the handler only
  recognised them by sniffing `message.includes('Only JPG')` — which matches the *mimetype*
  message and nothing else. Every magic-byte rejection (a renamed `.exe`, a GIF declared as
  `image/png`) fell through to **500 "Internal server error"** for what is a 400. They are
  `HttpError(400, …)` now, and the sniff is gone.
- The magic-byte check itself never executed. multer calls `fileFilter` **before** it reads the
  file body, so `file.buffer` is always `undefined` there and `if (file.buffer) { validateFile(…) }`
  was dead code. Against `HEAD`, driving the real `fileFilter` with PHP declared as `image/png`
  returns `accept=true`.
- Moving the check into the storage only covered `memoryStorage`, which hands back a buffer.
  Production uses `CloudinaryStorage`, which pipes `file.stream` to the CDN and returns none, so
  there the bytes were validated nowhere. The two storages differ only in how they consume the
  stream, which is why the first attempt looked sufficient — it was verified against
  `memoryStorage` while production ran the other one.

`middleware/fileContentGuard.js` now wraps the storage for every storage: it reads the first 8
bytes of the incoming stream, rejects a mismatch, and hands the storage a stream replaying those
bytes followed by the rest. A rejected upload is stopped before the storage is called, so nothing
is written and nothing is uploaded. The one branch that could bypass the check — a stream it
cannot hand back after reading the head — fails **closed**: the upload is refused with a generic
500 rather than forwarded unvalidated (`test/uploadContentGuard.test.mjs` seeds a non-configurable
`stream` property to drive exactly that path). Verified against the real `CloudinaryStorage` with a stub CDN
client: a genuine image arrives at `upload_stream` byte for byte, PHP declared as `image/png`
returns `400 "Unable to determine file type from content"` with `upload_stream` **never called** —
which is what the pre-fix code did instead (`upload_stream called`, `CDN received 28 bytes:
"<?php system($_GET[\"c\"])"`).

**Two traps worth remembering, both hit while building this:**

- multer defines `file.stream` with `Object.defineProperty(file, 'stream', { configurable: true,
  value: fileStream })` — **no `writable`**, so `file.stream = rebuilt` is silently ignored. The
  first version of the guard read the head from the stream it then failed to replace, leaving the
  storage to read bytes we had already consumed. The visible symptom was not corruption but a
  **hang**: multer waited on `pendingWrites` for a storage callback that never came, so a 6 MB
  upload never got its 400. `replaceStream()` redefines the property; `canReplaceStream()` is
  checked *before* a byte is read, so a stream that cannot be put back is never consumed.
- A storage needs `_removeFile`; multer calls it on the abort path. My test stub lacked it and the
  request hung on an unhandled `storage._removeFile is not a function` — the guard was fine, the
  fixture was not.

The regression is pinned by a test that posts an oversized *valid* image through real
multipart parsing (without it, that request hangs rather than answering 400).

### I4. A malformed id is answered 500 — OPEN
Any handler catching its own errors turns a `CastError` on `:id` into a server fault, which is a
client mistake and noise in the error rate. Live: `GET /api/vehicle-docs/bike/not-an-id` with an
Admin token returns `500 {"message":"Failed to load vehicle documents"}`. Worst case is worse —
before I1 the same request returned `Cast to ObjectId failed for value "not-an-id" (type string)
at path "_id" for model "VehicleDocument"`, so it was both the wrong status and a description of
the schema. The central handler already maps `CastError` to 400; controllers that catch
everything should do the same rather than rely on the message staying hidden.

### I5. `GET /api/docs` serves the whole API surface to anonymous callers — OPEN
`server.js` mounts `swagger-ui-express` with no gate and without a `NODE_ENV` check, so in
production anyone can enumerate every route — including the admin endpoints, their parameters
and their schemas — from `/api/docs`. Nothing secret is in there, but it is a map, and it is the
same class as the public endpoints removed in earlier passes. Left open deliberately: removing
the URL is a product decision, not a defect (see "Deliberately left open").

## Sixth pass — mobile layout (429px viewport, live)

Every storefront page was measured in the running app at a 429px-wide viewport (below Tailwind's
`sm`, so the phone layout), checking horizontal overflow, clipped content, tap-target sizes and
the geometry of every `position: fixed` bar. The horizontal layout was already sound — the
defects were all about **fixed bottom bars and viewport units**, the two things a static read of
`className` hides.

### J1. The compare bar covered the mobile bottom nav — FIXED
`CompareBar` sat at a hard-coded `bottom-14` (56px) while the nav is 67px tall, and it carries
`z-[100]` against the nav's `z-50` — so it drew **11px over the nav**, covering the active-tab
indicator. Measured live: bar bottom 635, nav top 624 (`barOverNavBy: 11`). The bar was also
cramped on a phone, with a visible scrollbar inside its 67px-tall chip row.

Both bars now derive from one variable, `--bottom-nav-h` (`index.css`): the nav enforces it as
its `min-height`, the compare bar sits on it, and the chip row scrolls without a scrollbar
(`.no-scrollbar`). Re-measured: bar bottom 623, nav top 623 — `overlap: 0`, `gap: 0`.

### J2. The footer's last line was unreachable behind the nav — FIXED
`index.css` carried a mobile rule `main { padding-bottom: 5rem !important }`, commented "Mobile
bottom nav padding". It padded the wrong element: `Footer` is `main`'s **sibling** in `App.jsx`,
so the fixed nav covered the footer's last line. Live at the scroll bottom: `Built with React,
Express & MongoDB` had `bottom: 643` against a nav top of 624 — 19px permanently hidden.
The offset moved onto the `<footer>` itself (`.pb-bottom-nav`), and the stale comment was
corrected to say what `main`'s padding actually does. At the bottom now: `coveredFooterTexts:
[]`, last line clearing the nav by 48px.

The compare bar is `fixed` on desktop too, so it covered the footer there as well; the reserved
space is therefore not mobile-only — `CompareBar` toggles `body.has-compare-bar`, which sets
`--compare-bar-h` (see J3).

### J3. Two magic numbers, three consumers — FIXED (the underlying cause)
The bar height (56 vs 67), the content offset (`main`, wrong element) and the safe-area inset
(defined as `.safe-area-bottom` in 2023 but **never used anywhere**) were three independent
hard-coded values describing one bar. `index.css` now owns them:

```
--bottom-nav-h   0px  (>=768px)  |  calc(4.25rem + env(safe-area-inset-bottom, 0px))
--compare-bar-h  0px            |  4.5rem while body.has-compare-bar
.pb-bottom-nav   padding-bottom: calc(var(--bottom-nav-h) + var(--compare-bar-h))
```

`BottomNav` uses `safe-area-bottom` + `min-height: 4.25rem`, which sum to exactly
`--bottom-nav-h` — so on a notched phone the labels clear the home indicator instead of sitting
in the gesture area, and the two bars stay flush. Verified: nav `min-height: 68px`, height 68,
`--bottom-nav-h` = `calc(4.25rem + 0px)`, footer padding `68px` (140px with the compare bar up),
nothing covered at the scroll bottom in either state.

### J4. `vh` on full-height pages, and in modal max-heights — FIXED
`100vh` is the *large* viewport on mobile: with the URL bar showing it is ~60-100px taller than
what is visible, so a page sized to it pushes its primary action below the fold. `#root` already
used `100dvh`, so the project's convention was there to follow. Switched in
`min-h-[calc(100vh-4rem)]` -> `100dvh` (Login, Signup, ForgotPassword, NotFound,
PaymentCancelled, PaymentFailed, PrivacyPolicy, TermsOfService), the renter tracking map panel
(`RenterDashboard`, `calc(100dvh - 250px)`), and the modal max-heights (`85vh`/`80vh`/`90vh` ->
`dvh` in `ui/Modal`, `ReportsTab`, `MessageInbox`, `AdminDashboard`, `CompareVehicles`,
`RenterDashboard`) so a dialog can never be taller than the visible viewport. Verified live:
the login container computes to `627px` = `691 - 64`, i.e. the `dvh` declaration is the one
applying.

### J5. Three vehicles were squeezed into unreadable columns in Compare — FIXED
`CompareVehicles` wrapped its table in `min-w-0 lg:min-w-[600px]`, so on a phone the `min-w-0`
won and three vehicles were forced into ~135px columns: every model name truncated (`TVS Nt...`,
`Yamah...`, `Honda ...`) and the spec values were unreadably narrow. The wrapper now has a
per-column floor (`112 + items.length * 160`), which keeps columns readable and lets the
existing `overflow-x-auto` scroll instead: measured 592px inside a 397px scroller, with
`TVS Ntorq 125` and `Yamaha FZ-S V3` no longer truncated (only `Honda CB Hornet 160R`, which
needs ~190px). One vehicle still fits a phone without scrolling.

### J6. Considered and rejected: `position: sticky` on the compare row labels — NOT DONE
A sticky label column would keep `Price`/`Category` in view while the table scrolls sideways.
It does not work under the existing structure: the sticky cell's nearest scrollport is the
`overflow-hidden` rounded wrapper, not the `overflow-x-auto` parent, so the label scrolls away
anyway (measured: `labelLeft: -178` after scrolling). Making it work means dropping
`overflow-hidden` and rounding the first and last rows by hand — a visual risk for an
enhancement, not a defect. Left out on purpose.

### Also checked, no defect found
Horizontal overflow: **0** offenders on `/`, `/search`, `/bike/:id`, `/my-bookings`,
`/renter-dashboard`, `/admin-dashboard`, `/faq`, `/compare` and `/login` at 429px (only
`Leaflet` tiles, which their container clips by design, and one decorative `blur` circle inside
an `overflow-hidden` hero). Tap targets: the only sub-36px hits are the five footer links
(29px tall) — small, but a footer, so left alone. Tables: every `<table>` is wrapped in
`overflow-x-auto`, and the admin/refund ones are `hidden md:block` with card fallbacks for
mobile. Modals: `ui/Modal` already had `max-h-[85vh] overflow-y-auto`, so long content scrolls.
The `WhatsAppButton` FAB is correctly offset (`bottom-20` on mobile, `md:bottom-6`). The one
thing that *looks* like a scrollbar defect — a persistent amber bar under the admin tab strip —
is `scrollbar-width: thin` doing what it was told on a mouse-pointer device; on touch the
scrollbar is an overlay, so it was not treated as a mobile bug.

## Verified as NOT broken (so these aren't chased again)

- Money math is internally consistent — no 100× error in the live path. (The two
  places where a `/100` *was* wrong are E6 and the coupon paisa boundary.)
- The atomic `findOneAndUpdate({ _id, status: 'Pending' })` claim genuinely prevents
  double confirmation, and the coupon increment is guarded by that same claim.
- The overlap query in `checkAvailability` is correct.
- Replay nonces work as intended.
- `gateways/` is genuinely used by the health readiness probe.
- The documented test count (131 backend + 26 frontend = 157) was accurate.

## Verification performed

- `npx vitest run` — **231 backend** (131 pre-existing, 43 regression tests in
  `test/regressions.test.mjs`, 7 wiring tests in `test/jobWiring.test.mjs`, 5 API contract
  tests in `test/apiContract.test.mjs`, 6 report-history tests in
  `test/reportHistory.test.mjs`, 7 health-exposure tests in
  `test/healthExposure.test.mjs`, 14 error-exposure tests in
  `test/errorExposure.test.mjs`, 18 upload-content-guard tests in
  `test/uploadContentGuard.test.mjs`) and **26 frontend**, all passing.
- Health surface live after the fix: `/api/health` 200 `{status, timestamp}`,
  `/api/health/liveness` 200 `{status, timestamp}`, `/api/health/readiness` 200
  (`database` and `gateway` both `ok`), `/api/health/info` **401** unauthenticated; the same
  call with an Admin token still returns 200 and the Command Center still renders
  `Server online` / `Memory 96.8%` / `Uptime 0d 0h`.
- The error-exposure work was falsified against the pre-fix source, not assumed. The static
  sweep (`test/errorExposure.test.mjs`, `ERROR_SWEEP_DIR=` pointed at `git archive HEAD`)
  reports exactly I1's 22 sites on `HEAD` and none on the tree. The runtime half, driven by the
  pre-fix `errorHandler`, returns `400 {"message":"Request failed with status code 401:
  api.cloudinary.com/v1_1/demo/upload rejected api_secret=abc123"}` for a third-party 4xx, and
  passes the same case unchanged on the new handler.
- The upload guard (I3) is falsified the same way, against the real storage class production
  uses, with a stub CDN client: unguarded, PHP declared as `image/png` is `ACCEPTED`,
  `upload_stream` is called and the CDN receives `<?php system($_GET["c"]); ?>`; guarded, the
  same input is `400 Unable to determine file type from content` and `upload_stream` is never
  called. Against `HEAD`, the real `fileFilter` accepts the same file with `accept=true`.
- Upload behaviour live after the fix: PHP declared as `image/png` posted to
  `/api/vehicle-docs/bike/:id` with an Admin token returns
  `400 {"message":"Unable to determine file type from content"}` (nothing uploaded); a
  disallowed mimetype still returns `400 {"message":"Only JPG, JPEG, and PNG files are
  allowed"}`. Through real multipart parsing against a guarded storage: a valid image reaches
  the storage with every byte intact (`200`, size equal to the payload) and an oversized valid
  image answers `400 "File too large. Maximum size is 5MB."` in ~50 ms instead of hanging.
  No upload to Cloudinary was made at any point during verification.
- Error surface live after the fix: malformed JSON body → `400 {"message":"Invalid request"}`
  (was body-parser's text), `GET /api/vehicle-docs/bike/not-an-id` → `500 {"message":"Failed to
  load vehicle documents"}` (was the `CastError` text), a non-image upload →
  `400 {"message":"Only JPG, JPEG, and PNG files are allowed"}`, `GET /api/seasonal-rates` → 200,
  and Admin reads (`/api/admin/rate-limits`, `/api/health/info`) → 200.
- The contract tests were falsified against the pre-fix source rather than assumed: the
  registration invariant matches `registerLimiter(` in `HEAD:backend/server.js`; the System
  Health contract reports 6 unusable fields on the `HEAD` controller
  (`server.environment`, `memory.heapUsed`, `memory.heapTotal`, `memory.rss`, `cpu.model`,
  `cpu.cores`); the Rate Limits contract reports `max`, `windowMinutes` and `windowMs`
  unusable with the old registration, reproducing `[{"name":"auth","windowMinutes":null,
  "message":"Too many requests"}]` exactly. Without the fixes, all three fail.
- Live after the fix: `/api/admin/rate-limits` returns `windowMs`/`max`/`windowMinutes` for
  all nine limiters, and the Rate Limits tab renders `Auth API Strict Max 5 Window 15m Rate
  0.3/m`; System Health renders `Environment development`, `Heap Used 92.4 MB`,
  `RSS 169.5 MB`, `94.5% used`, `Cores 12` and the real CPU model.
- `npm run lint` and `npm run build` in `frontend/` — clean.
- Server boots; live-probed against a running instance: `/api/health` 200,
  `/api/health/readiness` 200 (`database` and `gateway` both `ok`), `/api/tracking`
  **401** (was public), `/api/documents/...` **404**, `/api/payment/intents` **404**,
  `/api/payment/admin/unconfirmed` **401** (present and protected), and the newly scoped
  document/maintenance endpoints **401** unauthenticated. `GET /api/dashboard/bikes`
  returned **404**, which is how F10 was confirmed rather than inferred.
- Rate limiters exercised against a running server (counts are per-IP, so each boot
  starts clean): 12 storefront reads → `200 ×12`; 35 type-ahead calls → `200 ×35`; 35
  searches → `200 ×30` then `429`; 25 gateway IPN posts → `400 ×25` (never `429`, so the
  callback skip works); 12 multipart uploads → `401 ×10` then `429`.
- The payout job run directly against the connected database: `Job completed: payoutJob
  payoutsCreated: 0`, payouts before/after `0 / 0`. Its window held no eligible
  `Completed` bookings, so this was a live run with a verified-zero write.
- SIGTERM on a running server: `Background jobs stopped` → `MongoDB connection closed`
  → `Shutdown complete`.
- `scripts/migrateFixes.js` dry run against the connected database (see the operator
  note below): it flagged **one bike stuck out of service with no active booking** —
  the A2 defect, observed in live data rather than inferred.

## Not verified (no way to exercise without the gateway)

- The SSLCommerz sandbox happy path, the close-the-browser-then-IPN path, and duplicate
  callback replay need a real gateway session. The IPN lookup was reasoned through
  against the code and covered indirectly by the tranId persistence change, but it has
  not been observed end to end.

## Operator actions before deploying this

0. **Know which database `backend/.env` points at.** `MONGODB_URI` is
   `mongodb+srv://…@rentbike.jcglevo.mongodb.net/rentbike` — the Atlas cluster, not a
   local Docker Mongo (`MONGODB_URI_ATLAS` holds the same connection string). Every dry
   run and probe recorded here therefore read that cluster. Render's `MONGODB_URI` is
   set in the dashboard, so confirm it is the same database before applying anything.
1. **Set `ENCRYPTION_KEY` on the API host.** 32 random bytes as hex
   (`openssl rand -hex 32`). It is now a hard boot requirement in production: without
   it the process exits rather than silently storing NID, licence, and phone in
   cleartext. Changing it later makes existing ciphertext unreadable, so set it once.
2. **Set `PII_HASH_PEPPER`** (falls back to `ENCRYPTION_KEY`). Optional, but without it
   the keyed hashes are not written and the `hashes` migration step skips.
3. **Run the data migrations.**
   ```
   cd backend
   node scripts/migrateFixes.js            # dry run — prints, writes nothing
   node scripts/migrateFixes.js --apply    # apply
   ```
   The `availability` step is the one worth reading before you apply: it returns
   vehicles to the marketplace that a *finished* booking had wrongly hidden. It
   reported **1 bike** against the connected Atlas database. The `campaigns` step reports
   campaigns left mid-send by the old synchronous sender, which the background sender
   would otherwise pick up and re-send to the entire audience from the beginning.
4. **Check for campaigns stuck in `sending`** if you skip the script — the sender picks
   up `sending`, `scheduled` and `paused` campaigns, resumes from recorded progress, and
   treats a campaign with no progress as unsent.
5. **Exercise the payment path in the SSLCommerz sandbox**: pay, then close the browser
   before the redirect, and confirm the IPN still finds and confirms the booking.

## Deliberately left open

- **Rate-limit ceilings reviewed and left alone.** `/api/booking` allows 30 requests per
  15 minutes and covers `GET /my-bookings`, `GET /:id` and the checkout heartbeat, which
  `Checkout.jsx` sends every 2 minutes (~7.5 per 15 minutes) — comfortable. `/api/auth`
  allows 100 per 15 minutes for `/profile`, `/refresh` and `/export-data`. The checkout
  price preview polls `/api/pricing/preview` every 20 seconds (45 per 15 minutes) and has
  no limiter of its own, only the global 300/min. None of these throttle ordinary use,
  but all of them are per-IP, so users behind one NAT share a single counter.

- **Stored money field names.** `Payout.totalAmountPaisa`, `Refund.amountPaisa`, and
  `Booking.pricing.*Paisa` hold taka. Helper names were corrected (`utils/safeAmount.js`
  now exports `*Taka` with the old names as aliases), but renaming stored fields needs a
  migration and there is no live bug driving it — E2 remains latent, and E6 was the one
  place it had already bitten.
- **What a customer should see on the live map.** `/api/tracking` requires a session
  (or `TRACKING_PUBLIC=true`), shows Admins everything, Renters their own fleet, and
  customers only bookable vehicles that are not currently out on rent (F3). If the
  product intent is a wider or narrower map, the scoping block in `getLocations` is the
  single place to change it.
- **What Cloudinary itself accepts (I3).** The guard rejects content that does not match its
  extension, but only for the extensions this app allows (JPG/PNG). If `allowed_formats` in the
  storage `params` is ever widened, the CDN's own validation is the only remaining control. The
  guard reads the first 8 bytes, which is enough for every signature in
  `security/utils/fileMagicBytes.js`; a format whose signature is further in would need more.
- **`GET /api/docs` in production (I5).** The API map is public. The obvious fixes are to serve
  it only when `NODE_ENV !== 'production'` or to require an Admin session, but Swagger UI's own
  assets load from the same path, so a header-based token gate would break the page itself —
  worth deciding deliberately rather than in passing.
- **`/api/vehicle-docs/bike/:id` answers 500 for a bad id (I4).** The message no longer leaks,
  but the status is still wrong. The same applies to every handler that catches its own errors
  and hard-codes 500 for a `CastError` from `req.params`.
- **`PaymentIntent` collection.** The model is deleted, but existing documents (if any
  were ever created) remain in the database. They are unreferenced.
