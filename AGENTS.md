# AGENTS.md

## Project Structure

Two independent packages, same repo — no workspace:

| Path | Module | Node | Dev command | Port |
|---|---|---|---|---|
| `backend/` | CommonJS | Express 5, Mongoose 9 | `npm run dev` (nodemon) | 5000 |
| `frontend-next/` | ESM+TS | Next.js 16, React 19, Tailwind 4 | `npm run dev` (next) | 3000 |

Each has own `node_modules/`, `.env`, `package.json`. Lockfiles committed.

### Live URLs
- **Frontend:** https://rent-bike-cox.vercel.app
- **Backend:** https://rent-bike-backend.onrender.com

## Commands

```bash
# One-time after clone
git config core.hooksPath .githooks   # enables commit-msg hook

node scripts/dev.js                # both packages; prefixed logs, Ctrl-C stops both
cd backend && npm run dev          # backend alone (nodemon on :5000)
cd frontend && npm run dev         # frontend alone (vite on :5173)
cd frontend && npm run lint        # eslint (no typecheck in stack)
cd frontend && npm run build       # prod build
docker-compose up --build          # Docker (backend + mongo)
```

`scripts/dev.js` (zero-dependency, no root `package.json`) is the preferred way to run the
stack: it resolves the ports, forces `PORT` into the backend's environment, points the
frontend's API URL at the backend it started, waits for both to answer, and kills both process
groups on exit. It exists because `dotenv` does not override an already-set `PORT` — a shell
exporting `PORT=0` makes the backend bind a random port while still logging "Server running on
port 0". See `.freebuff/run.md` for the run notes.

Test suites: Vitest. Backend 232 tests, frontend 26 tests (258 total). Run with `npx vitest run` in either package.

`backend/test/regressions.test.mjs` holds the regression tests for the payment, coupon,
booking-window, and PII-hashing fixes — 33 of the backend cases. They are unit-level by
design: the logic under test was extracted into pure functions (`utils/couponRules.js`,
`buildOverlapFilter`, `utils/safeAmount.js`, `security/utils/piiHash.js`) so it can be
verified without a database.

See `docs/Audit-Findings.md` for the full audit, what was fixed, and what was verified.

### Required in production

`ENCRYPTION_KEY` is **required** when `NODE_ENV=production` — the server refuses to
start without it. `models/User.js` only encrypts NID, licence, and phone number when
it is present, so booting without it silently stores identity documents in cleartext.
`PII_HASH_PEPPER` is optional and falls back to `ENCRYPTION_KEY`.

### Data migrations

`node scripts/migrateFixes.js` — **dry run by default**, pass `--apply` to write.
Covers coupon `usedBy` normalisation, `nidHash`/`phoneHash` backfill, and returning
bikes stranded out of service by the old global lock. Review the output before applying.

## Architecture

### Entrypoints
- Backend: `backend/server.js` — mounts all routes, middleware, error handler, MongoDB connect
- Frontend: `frontend-next/src/app/` (App Router; views in `src/views/` as client components)

### Routes (backend)
| Prefix | File | Access |
|---|---|---|
| `GET /api/health` | inline in server.js + `routes/health.js` | public — `{ status, timestamp }` only (used by the Docker healthcheck) |
| `GET /api/health/liveness` | routes/health.js | public — `{ status, timestamp }` only |
| `GET /api/health/readiness` | routes/health.js | public — `{ status, checks, timestamp }` (DB + gateway) |
| `GET /api/health/info` | routes/health.js | **Admin** — pid, env, uptime, node version, heap detail |
| `GET /api/seed-temp` | inline (dev only, `NODE_ENV !== 'production'`) | public |
| `/api/auth` | `routes/auth.js` | register (file upload), login |
| `/api/dashboard` | `routes/dashboard.js` | public (settings, bikes, categories) + renter + admin |
| `/api/booking` | `routes/booking.js` | authenticated (role-based per handler) |
| `/api/payment` | `routes/payment.js` | init (auth), success/fail/cancel/ipn (public, SSLCommerz POSTs) |
| `/api/coupons` | `routes/coupons.js` | admin CRUD |
| `/api/policies` | `routes/policy.js` | public GET, admin CRUD |
| `/api/financial` | `routes/financial.js` | admin only |
| `/api/documents` | — | **removed** — returned the raw NID/licence number rather than the uploaded image (`nidImage`/`licenseImage`) and had no caller |
| `/api/pricing` | `routes/pricing.js` | auth (preview) |
| `/api/audit` | `routes/audit.js` | admin |
| `/api/fraud` | `routes/fraud.js` | admin |
| `/api/payouts` | `routes/payout.js` | admin (list / approve / pay — payouts are **created** by `jobs/payoutJob.js`, there is no route for it) |
| `/api/maintenance` | `routes/maintenance.js` | auth (Renter + Admin) |
| `/api/availability` | `routes/availability.js` | public |
| `/api/fleet` | `routes/fleet.js` | auth (Renter + Admin) |
| `/api/bulk` | `routes/bulk.js` | auth (Renter + Admin) |
| `/api/vehicle-history` | `routes/vehicleHistory.js` | auth (Renter + Admin) |
| `/api/search` | `routes/search.js` | public |
| `/api/analytics` | `routes/analytics.js` | admin only (revenue, bookings, categories, top-bikes, customers, duration, financial, export) |
| `/api/notifications` | `routes/engagement.js` | auth |
| `/api/reviews` | `routes/engagement.js` | public GET, auth POST/PUT/DELETE |
| `GET /api/reviews/stats` | `routes/engagement.js` | public — bulk review stats for multiple bikes (1 request for all bikes on Home) |
| `/api/seasonal-rates` | `routes/seasonal.js` | public GET (active) |
| `/api/admin/seasonal-rates` | `routes/seasonal.js` | admin CRUD |
| `/api/vehicle-docs` | `routes/vehicleDoc.js` | auth (Renter + Admin) |
| `/api/notification-preferences` | `routes/notificationPref.js` | auth |
| `GET /api/content` | `routes/content.js` | public (site content) |
| `GET /api/content/:key` | `routes/content.js` | public (single key) |
| `/api/admin/content` | `routes/adminContent.js` | admin (content CRUD + rollback) |
| `/api/admin/notification-templates` | `routes/notificationTemplates.js` | admin (template CRUD) |
| `/api/announcements/active` | `routes/announcements.js` | public |
| `/api/admin/announcements` | `routes/announcements.js` | admin (CRUD + tracking) |
| `/api/faqs` | `routes/faqs.js` | public |
| `/api/admin/faqs` | `routes/faqs.js` | admin (CRUD + reorder) |
| `/api/contact` | `routes/contact.js` | public (submit message) |
| `/api/admin/messages` | `routes/contact.js` | admin (inbox + reply) |
| `/api/admin/notifications` | `routes/adminNotifications.js` | admin (alerts) |
| `/api/admin/campaigns` | `routes/campaigns.js` | admin (CRUD + send) |
| `/api/admin/system-health` | `routes/systemHealth.js` | admin |
| `/api/admin/reports` | `routes/reports.js` | admin (generate reports) |
| `/api/dashboard/branding` | `routes/dashboard.js` | public (GET), admin (PUT) |
| `/api/disputes` | `routes/dispute.js` | auth (create/my), admin (all/resolve/stats) |
| `GET /api/financial/renter/earnings` | `routes/financial.js` | renter (aggregated earnings) |
| `GET /api/admin/logs` | `routes/logs.js` | admin (tail server.log / server-error.log) |
| `GET /api/admin/cache` | `routes/cache.js` | admin (cache stats + keys) |
| `DELETE /api/admin/cache` | `routes/cache.js` | admin (flush all) |
| `DELETE /api/admin/cache/key/:key` | `routes/cache.js` | admin (delete single key) |
| `GET /api/admin/rate-limits` | `routes/rateLimit.js` | admin (limiter configs) |
| `POST /api/tracking` | `routes/tracking.js` | IoT device (X-API-Key auth) — accepts lat, lng, speed, heading, battery, accuracy |
| `GET /api/tracking` | `routes/tracking.js` | auth required, or public when `TRACKING_PUBLIC=true`; scoped by role — Admin all, Renter own fleet, customer only bookable vehicles not currently rented |
| `GET /api/tracking/stats` | `routes/tracking.js` | Renter + Admin, scoped to owned bikes (aggregated stats per bike) |
| `GET /api/tracking/history/:bikeId` | `routes/tracking.js` | Renter + Admin + ownership (last N trail points for path polyline) |
| `GET /api/tracking/:bikeId` | `routes/tracking.js` | Renter + Admin + ownership (single bike location + latest telemetry) |
| `GET /api/payment/admin/unconfirmed` | `routes/payment.js` | admin — read-only reconciliation report of bookings with a gateway tranId that were never confirmed |
| `/api/{*splat}` | catch-all | 404 |

### Models (20+)
| Model | Purpose |
|-------|---------|
| User | role enum (Admin/Renter/User), select:false password, NID/license |
| Bike | category ref, renter ref, tier pricing, images, currentLocation (GeoJSON Point) |
| Booking | status machine (Pending→Confirmed→Active→Completed/Cancelled), invoice number, 30min buffer |
| Category | slug, isActive (Bike, Car, Jeep) |
| Settings | singleton (basePricePerHour, packages) |
| Counter | auto-increment RBC-YYYY-XXXXXX |
| Policy | title, content, type, sortOrder |
| Coupon | unique code, discountPercent, expiryDate |
| PaymentIntent | SSLCommerz pending payments |
| Refund | refund tracking |
| AuditLog | action logging (actor, action, resource, timestamp) |
| RefreshToken | JWT refresh tokens |
| BlacklistedToken | logged-out tokens |
| LoginAttempt | login security |
| PasswordReset | OTP forgot password (15-min expiry) |
| Payout | renter payouts |
| LedgerEntry | financial ledger |
| FraudEvent | suspicious activity tracking |
| CircuitBreaker | payment gateway failure tracking |
| IdempotencyKey | prevent duplicate operations |
| MaintenanceLog | fleet maintenance tracking |
| MaintenanceNotification | maintenance alerts |
| Notification | in-app notifications |
| NotificationPreference | per-user email/push/inApp toggles |
| Review | bike reviews and ratings |
| LocationHistory | bike GPS trail history (7-day TTL), speed, heading, battery, accuracy |
| SeasonalRate | peak/off-peak/holiday pricing |
| VehicleDocument | registration/insurance/fitness docs |
| SiteContent | key/value content management, page grouping, history |
| PushSubscription | web push notification subscriptions |
| NotificationTemplate | email/push template with variables |
| Announcement | banner/popup/notice with scheduling and audience |
| FAQ | categorized questions with helpful tracking |
| ContactMessage | contact form inbox with status workflow |
| EmailCampaign | email campaigns with audience targeting |
| AdminNotification | admin alerts with severity and read tracking |
| Dispute | reason enum, status workflow (open→under_review→resolved→dismissed) |
| ReportHistory | generated report log (type, format, dateRange, fileSize, rowCount) |

### Frontend Components
| Component | Location | Purpose |
|-----------|----------|---------|
| ContentEditor | `components/admin/` | Edit site content by page group |
| BrandingTab | `components/admin/` | Business info, colors, social, SEO |
| AnnouncementManager | `components/admin/` | Banner/popup management |
| TemplateManager | `components/admin/` | Email/notification templates |
| FAQManager | `components/admin/` | FAQ CRUD with categories |
| MessageInbox | `components/admin/` | Contact form inbox |
| CampaignManager | `components/admin/` | Email campaign management |
| SystemHealthTab | `components/admin/` | Server/DB health dashboard |
| ReportsTab | `components/admin/` | 18 report types, 4 formats (CSV/JSON/PDF/XLSX), preview modal, history |
| CommandCenter | `components/admin/` | Quick actions, system status, platform overview (default tab) |
| LogsViewer | `components/admin/` | App/error log viewer with search, expand, export |
| CacheManager | `components/admin/` | In-memory cache stats, key browser, flush/delete |
| RateLimitManager | `components/admin/` | Rate limiter config cards with severity badges |
| AdminNotificationBell | `components/admin/` | Navbar notification dropdown |
| RenterEarnings | `components/` | Renter earnings dashboard |
| CompareBar | `components/` | Vehicle comparison floating bar |
| BottomNav | `components/` | Mobile bottom navigation |
| WhatsAppButton | `components/` | Floating WhatsApp contact |
| LiveFleetMap | `components/` | Advanced real-time Leaflet map with Socket.IO: category icons (Bike/Car/Jeep), movement trail polyline, smooth marker animation, marker clustering (leaflet.markercluster), speed/battery/heading telemetry, legend overlay, auto-fit bounds, search/filter by model, connection status badge, info panel |
| Lightbox | `components/` | Image gallery lightbox |
| TabErrorBoundary | `components/` | Isolates AdminDashboard tab crashes |

### Hooks
| Hook | Purpose |
|------|---------|
| useSiteContent | Cached fetch from /api/content with get(key, fallback) |
| useAuth | Auth context hook (separate file from provider) |
| useTheme | Theme context hook (separate file from provider) |
| useCompare | Vehicle comparison context hook |
| useWishlist | Wishlist context hook |

### Roles
Three roles on `User` model: `Admin`, `Renter`, `User`. Authorization via middleware: `security/middleware/authorize.js` and `security/middleware/checkOwnership.js`. `ProtectedRoute` component on frontend takes a `roles` prop for route gating.

### Auth
JWT in `Authorization: Bearer <token>` header. Token decoded in `middleware/authMiddleware.js` — sets `req.user = { id, role }`. Expires in 1d. Stored in `localStorage` on frontend, injected by Axios interceptor (`frontend-next/src/api/axios.ts`). Refresh tokens supported.

### Context hook pattern (ESLint enforced)
`AuthContext` (provider) in `AuthContext.jsx`, `useAuth()` hook in separate `useAuth.js` file. Same for `ThemeContext`/`useTheme`. ESLint React Hooks rules require hooks and providers in different files.

### Payment flow (SSLCommerz)
1. Frontend `POST /api/booking` → booking created as `Pending`
2. Frontend `POST /api/payment/init` → returns SSLCommerz gateway URL
3. User pays on SSLCommerz page
4. SSLCommerz POSTs `/api/payment/success/:bookingId/:tranId` → confirms booking, marks bike unavailable, redirects to frontend `/invoice/:bookingId`
5. `paymentFail` and `paymentCancel` redirect to frontend `/payment-failed` and `/payment-cancelled`
6. IPN handler also verifies via SSLCommerz validation API
7. Routes for success/fail/cancel handle BOTH GET and POST (SSLCommerz does both)

Advance: 50% for rentals ≤24h, 30% for longer. `BACKEND_URL` and `FRONTEND_URL` env vars control callback redirects.

### Key middleware (in order)
```js
correlationId              // UUID request ID + response time
requestLogger              // structured winston logging
mongoSanitize()            // custom (replaced express-mongo-sanitize for Express 5)
hpp()                      // HTTP parameter pollution
helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })
compression()
cors({ origin: exact-match whitelist only })
express.json({ limit: '1mb' })
express.urlencoded({ extended: true, limit: '1mb' })
// Per-route rate limiters: auth, booking, payment, financial, search, dashboard, fleet
// notFoundHandler → errorHandler (centralized)
```

### Rate limiters
| Limiter | Window | Max |
|---------|--------|-----|
| auth | 15 min | 5 |
| booking | 15 min | 30 |
| payment | 15 min | 20 |
| financial | 15 min | 60 |
| upload | 60 min | 10 |
| global | 1 min | 300 |
| search | 1 min | 30 |
| dashboard | 1 min | 120 |
| fleet | 1 min | 40 |

Mount limiters on the exact routes that need them, never on a path prefix: `app.use('/api/dashboard/bikes', …)` also matches the public storefront reads
`GET /api/dashboard/bikes/available` and `GET /api/dashboard/bikes/:id`, so a 10/hour
ceiling becomes "Too many file uploads" on the eleventh bike someone looks at. `upload`
is therefore mounted per-route (and skips non-`multipart/form-data` bodies), and `search`
skips `/suggestions` because it is a 250 ms-debounced type-ahead where one ten-character
query costs ten of the thirty requests.

Build every limiter with `makeLimiter(name, options)` from `middleware/rateLimitFactory.js`.
It registers the **options** for the admin Rate Limits view; `express-rate-limit` v8 hands
back a bare middleware (`resetKey`, `getKey`, nothing else), so registering the limiter
itself leaves every card blank (`Rate NaN/m`). `test/apiContract.test.mjs` fails if
`server.js` ever calls `registerLimiter` directly.

### CORS whitelist
`FRONTEND_URL` env, `https://rent-bike-cox.vercel.app`, `https://sandbox.sslcommerz.com`, `https://sslcommerz.com`. `http://localhost:5173` only in dev mode (`NODE_ENV !== 'production'`). No loose `origin.includes()`. CORS errors return 403.

### Upload middleware
`middleware/uploadMiddleware.js` — multer → Cloudinary (if credentials configured) or memory storage fallback. Max 5MB, JPG/JPEG/PNG only. Folders: `rent-bike-cox/nids/`, `rent-bike-cox/licenses/`, `rent-bike-cox/bikes/`. File size/type errors return 400.

The declared mimetype is checked in multer's `fileFilter`; the **bytes** are checked in
`middleware/fileContentGuard.js`, which wraps the storage — `fileFilter` runs before the file
body is read, so nothing can be validated there. The guard reads the first 8 bytes, rejects a
mismatch, and hands the storage a stream that replays them, so the check works for
`CloudinaryStorage` (which pipes to the CDN and never returns a buffer) and for `memoryStorage`
alike, and a rejected upload never reaches the CDN. Two traps to keep in mind when touching it:

- multer defines `file.stream` with `Object.defineProperty(..., { configurable: true })` — no
  `writable`, so `file.stream = other` is **silently ignored**. Replace it with
  `Object.defineProperty` (`replaceStream`), or the storage reads a stream you already consumed
  from: the upload loses its first bytes and multer waits forever for a storage callback, so an
  oversized request hangs instead of answering 400.
- A storage must implement `_removeFile`; multer calls it on its abort path.

### Settings
Global pricing in `Settings` model (singleton). Seeded on-demand if missing. Whitelist-only update: `basePricePerHour`, `packages`, `businessRules` (booking rules, payment rules, cancellation rules, fines).

### Taxonomy
`Category` model managed by Admin. Defaults in `dashboardController.js`: Bike, Car, Jeep. Bikes reference categories via ObjectId. Deletion blocked while bikes reference the category.

### Seeding
| Script | What it creates | Notes |
|---|---|---|
| `node scripts/seedAdmin.js` | admin@rentbikecox.com / admin123 | Uses `path: '../.env'` — must run from `backend/` |
| `node seed.js` | Same admin | Simpler script |
| `node seedDemo.js` | renter + user + categories + 10 demo bikes | Runs `process.exit()` when done |
| `node scripts/seedSettings.js` | Full settings with business rules + branding | Run once after deployment |
| `node scripts/seedContent.js` | Default site content pages | Run once after deployment |
| `GET /api/seed-temp` | All three users + categories + bikes | Dev only, guarded by `NODE_ENV !== 'production'` |
| `node seedTracking.js` | GPS trail points + currentLocation for all bikes | Must run from `backend/`; creates LocationHistory docs |

### Error handler
404 catch-all at `/api/{*splat}`. Centralized `middleware/errorHandler.js` — no stack traces.
Distinct messages for CORS, upload limits, file type, JSON parse failures, duplicate keys and
a generic 500. Request logger tracks correlation ID, method, URL, status, and duration.

**Never put `err.message` (or `err.stack`) in a response body.** It is whatever the failing
layer decided to say: mongoose prints the Atlas hostname, the collection and the duplicated
value of a duplicate-key error; `CastError` prints the model and path; axios prints the
upstream URL; SMTP prints the relay it refused. Two directions have to stay shut:

- **Controllers** use `clientMessage(err, fallback)` from `utils/httpError.js` — our own text,
  or a schema validation message, never a driver's — and `clientStatus(err, fallback)` for the
  status. Throw `HttpError(status, message)` when a caller should read the reason. Every catch
  must also `logger.error` it, so sanitising does not hide the failure from the logs.
- **The handler** forwards a message only through `isClientFacing(err)`, which checks a `Symbol`
  that only `HttpError` sets. Do not gate on `err.expose`: `http-errors` — the package behind
  body-parser and express's own 4xx errors — sets `expose: true` on every client error, and
  trusting it returned body-parser's raw parse text. Anything else keeps its status with canned
  text, and 500 bodies carry the `correlationId` that the matching log line carries.

`test/errorExposure.test.mjs` enforces both halves: runtime probes with hostile errors, plus a
sweep of every `.json(`/`.send(` call in the backend that fails if its argument mentions an
error's message or stack. An intentional exception needs a `// error-detail-ok: <reason>`
comment within five lines above the call, and the test caps how many of those may exist.

### Background jobs
Every job is started from the `server.listen` callback in `server.js` — a module that
exports `start*` and is never referenced there does nothing at all, silently, forever.
`test/jobWiring.test.mjs` fails if any module in `jobs/` is in that state. Timers are
stopped through the `onShutdown` hook passed to `gracefulShutdown` (for jobs that export
a stop function; `dataRetention`, `maintenanceReminder` and `checkoutCleanup` `unref()`
their only timer instead).

| Job | Interval | Purpose |
|-----|----------|---------|
| checkoutCleanup (`utils/checkoutCleanup.js`) | 60s | Auto-expire pending bookings (5min timeout) |
| bookingStateTransition | 60s | Move bookings through state machine |
| dataRetention | 24h | **Review-only** report of retirable accounts — mutates nothing |
| maintenanceReminder | 12h | Alert for upcoming maintenance |
| autoHeal | 30min | DB ping, stuck bookings, memory monitoring |
| cleanupScheduler | 1h | Old notifications, archived messages cleanup |
| scheduledMaintenance | 6h | Expired announcements/coupons deactivation |
| emailCampaignSender | 60s | Sends queued/scheduled email campaigns (never in the request thread) |
| payoutJob | 7d, plus once on boot | Schedule renter payouts for the previous 7 days; idempotent, and waits for the Mongo connection before its first run |

`payoutJob` running on boot is deliberate: a 7-day interval never fires on a host that
redeploys more often than weekly, which is why payouts had never been generated. All jobs
respect `DISABLE_JOBS=true` and guard on `mongoose.connection.readyState !== 1`.

Additional script (not on an interval — manually triggered):
| Script | Purpose |
|--------|---------|
| `utils/templateRenderer.js` | Renders notification templates with variables |

## Frontend specifics

### Tailwind CSS 4
- `@import "tailwindcss"` (not `@tailwind` directives)
- Custom values via `@theme { --color-* }`
- `@apply` can only reference built-in utilities, not custom classes from `@layer utilities`
- Custom classes like `.glass`, `.gradient-primary` defined in `@layer utilities` with **plain CSS properties**

### Design system
Dark theme (`#0a0a0f`), glassmorphism (`.glass`, `.glass-light`, `.glass-dark`), 4 gradient classes, CSS animations (`fadeIn`, `slideUp`, `slideIn`, `float`, `glowPulse`, `shimmer`). Print stylesheet for invoices (`.no-print`).

### CSS Variables
- Light mode: lavender base `#e8e4f0`, cards `#f3f0f8`, footer `#3d3550`
- Dark mode: base `#0a0a0f`, cards `#0d0d14`, footer `#0a0a0f`
- 18 accent CSS variables (text + bg + border for accent, success, warning, danger, info, purple)
- Footer uses dedicated `--footer-text`/`--footer-muted` variables
- Z-index hierarchy: content z-10 → navbar z-50 → dropdown z-[100] → modal z-[200] → toast z-[300]

### Mobile layout (fixed bottom bars)
Two bars are pinned to the bottom below 768px: `BottomNav` (`z-50`) and `CompareBar`
(`z-[100]`, sits on top of it). Their geometry lives in `index.css` — **never hard-code a
bottom offset again**, which is how the compare bar ended up 11px inside the nav:

- `--bottom-nav-h` — `0px`, and `calc(4.25rem + env(safe-area-inset-bottom, 0px))` under
  `max-width: 767px`. It matches `BottomNav`'s `min-height: 4.25rem` + `safe-area-bottom`, so the
  bars meet flush and the labels clear the home indicator.
- `--compare-bar-h` — `0px`, `4.5rem` while `body.has-compare-bar` (toggled by `CompareBar`,
  which is `fixed` on desktop too).
- `.pb-bottom-nav` — `padding-bottom: calc(--bottom-nav-h + --compare-bar-h)`. Applied to the
  `<footer>`, which is `main`'s **sibling**; padding `main` does not lift the footer.
- Any new fixed bottom bar must add itself to this sum, or it will cover the footer.

Use `dvh`, not `vh`, for anything that must match the visible viewport (full-height pages,
modal `max-h`): on mobile `100vh` includes the URL bar area, so `100vh`-sized content pushes its
primary action below the fold. `#root` already sets `min-height: 100dvh`. `.no-scrollbar` hides a
scrollbar on horizontal scrollers where one looks like a rendering fault (the 67px compare bar).

### Pages (all React.lazy loaded)
- `/` — Home (hero carousel, vehicle ratings, testimonials)
- `/bike/:id` — BikeDetails (gallery, lightbox, save/compare, recommendations)
- `/checkout/:bikeId` — Checkout (booking + payment)
- `/invoice/:bookingId` — Invoice (printable)
- `/login` — Login
- `/signup` — Signup
- `/forgot-password` — Forgot password (OTP flow)
- `/profile` — Profile (avatar upload, bio, emergency contact, memberSince badge)
- `/my-bookings` — My Bookings (search, status filter, sort, pagination, cancel with reason)
- `/renter-dashboard` — Renter (roles: Renter, Admin; stats cards: total/available/maintenance)
- `/my-disputes` — My Disputes (create dispute, expand/collapse, status filter, pagination)
- `/admin-dashboard` — Admin only (22 tabs: Command Center, Settings, Bikes, Users, Coupons, Categories, Walk-in, Finance, Maintenance, Content, Branding, Announcements, Templates, FAQ, Messages, Campaigns, System, Logs, Cache, Rate Limits, Reports, Disputes)
- `/admin/notifications` — Admin notifications full page (Admin only)
- `/fleet` — Fleet dashboard (roles: Renter, Admin)
- `/analytics` — Analytics dashboard (Admin only — revenue, bookings, categories, top bikes, duration, financial, hourly, customers)
- `/search` — Advanced search with filters (price range, category, sort)
- `/vehicle-history/:bikeId` — Vehicle history timeline
- `/notifications` — Notifications
- `/notification-settings` — Notification preferences (email, push, in-app)
- `/seasonal-pricing` — Seasonal pricing manager (Admin only)
- `/vehicle-docs` — Vehicle documents
- `/policies` — Public policy list
- `/faq` — Public FAQ page (category grouped, search, helpful tracking)
- `/contact` — Contact form (POST /api/contact, WhatsApp CTA)
- `/compare` — Vehicle comparison (max 3, side-by-side)
- `/wishlist` — Saved vehicles (localStorage)
- `/refunds` — Refund management (Admin only)
- `/payment-failed`, `/payment-cancelled` — Error states
- `*` — 404

### SEO
- 17 meta tags (OG, Twitter, robots, canonical, theme-color)
- `public/robots.txt` — disallows all dashboard/protected routes
- `public/sitemap.xml` — 7 public pages
- `public/.well-known/security.txt`
- JSON-LD Organization schema in Home.jsx

## Deployment

### Backend (Render)
- `render.yaml` blueprint: `cd backend && npm install` (build), `cd backend && node server.js` (start)
- Env vars in dashboard: MONGODB_URI, JWT_SECRET, Cloudinary, SSLCommerz, BACKEND_URL, FRONTEND_URL, IOT_API_KEY (used by ESP32/GSM devices for POST /api/tracking auth)
- Free tier: cold starts ~30s after idle

### Frontend (Vercel)
- Next.js App Router in `frontend-next/` (root directory); security headers + image hosts in `next.config.ts`
- Env var: `NEXT_PUBLIC_API_URL=https://rent-bike-backend.onrender.com/api`
- Preview project `rent-bike-next` tracks `main` (staging); `PREVIEW_URLS` on backend allows its origin through CORS

### Docker
- `backend/Dockerfile`: node:20-alpine, non-root user, healthcheck
- `docker-compose.yml`: backend + mongo:7 with health checks + persistent volume

### CI/CD
- `.github/workflows/ci.yml`: lint + build + syntax check on push/PR to main
- `.github/workflows/deploy.yml`: deploy triggers for Render + Vercel

## Key constraints (gotchas)

- **React 19** — no `import React` in components (ESLint will flag as unused)
- **Express 5** — route errors propagate differently than Express 4
- **Tailwind 4** — no `@tailwind` directives, no `tailwind.config.js` `theme.extend` (use `@theme` in CSS)
- `.env` files are gitignored — collaborator must create from `.env.example`
- Frontend env vars must be prefixed `NEXT_PUBLIC_` to reach the browser (Next.js rule)
- `seedAdmin.js` uses `process.env.config({ path: '../.env' })` — always run from `backend/`
- Frontend strict TypeScript — `npm run typecheck` must pass; `npm test` (vitest) in CI
- CORS errors return 403, not 500
- **CORS localhost** — only in dev mode (`NODE_ENV !== 'production'`)
- **`req.query`** — Express 5 makes it read-only; custom `sanitize.js` handles this
- **MongoDB Atlas M0** — no transactions; booking lock uses CAS fallback
- **No `vercel.json`** — Next.js handles routing/headers via `next.config.ts`; SPA rewrites retired with the Vite app
- **`SSLCOMMERZ_STORE_PASS`** — code reads both `SSLCOMMERZ_STORE_PASS` and `SSLCOMMERZ_STORE_PASSWORD` (fallback)
- **`leaflet.markercluster`** — installed; MarkerCluster CSS imported in LiveFleetMap; cluster icons colored by count (gold <5, purple 5-10, red >10)
- **`pdfkit`** — installed for PDF report generation; fonts embedded in document (Helvetica only, no custom fonts)
- **`xlsx`** — installed for XLSX report generation; simple `aoa_to_sheet` with auto-width columns
- **`express-mongo-sanitize`** — replaced with custom `middleware/sanitize.js` (Express 5 incompatible)
- **`Date.now()` in render** — React 19 ESLint `set-state-in-effect` rule; keep side effects out of render
- **`context` hooks** — must be in separate files from providers (ESLint enforced)
- **N+1 review requests** — Home.jsx uses `GET /reviews/stats?bikeIds=a,b,c` (bulk) instead of one request per bike; never add per-bike loops for review stats
- **`res.headersSent`** — controllers must check `if (!res.headersSent)` before responding; rate-limit middleware can already send a response, causing ERR_HTTP_HEADERS_SENT
- **Rate limits** — global 300/min, dashboard 120/min per IP; keep generous for real usage, tighten only for auth/booking routes. The strict auth limiter applies to `/api/auth/login|register|forgot-password|verify-otp|reset-password` **only** (the rest of `/api/auth` gets 100/15min), since capping `/profile` and `/refresh` at 5/15min broke normal use behind NAT. The payment limiter **skips** `/success|/fail|/cancel|/ipn` because the gateway calls them from a handful of shared IPs, and the search limiter skips `/suggestions`. Never mount a limiter on a path **prefix** that also carries GETs — that is how the 10/hour upload ceiling ended up throttling the public storefront with "Too many file uploads"
- **`Bike.availability` is a manual out-of-service switch**, not a booking lock. Booking conflicts are decided per time window by `createBookingAtomically` (insert-then-verify, tie-broken on ObjectId order) so a vehicle can hold multiple non-overlapping bookings. Overlap logic lives in `buildOverlapFilter` and is shared by the booking engine, the availability endpoint, and the pricing preview — never re-implement it inline
- **Money is taka everywhere**, despite `*Paisa` names in `utils/safeAmount.js` (aliases to the `*Taka` helpers) and in stored fields like `Payout.totalAmountPaisa` and `Refund.amountPaisa`. The one genuine paisa boundary is the coupon model's `discountFixedPaisa` / `maxDiscountPaisa` / `minBookingAmountPaisa`, converted in `utils/couponRules.js`
- **Coupon rules live in `utils/couponRules.js`** (pure, unit-tested). Both booking creation and the pricing preview call it, so the preview cannot disagree with what is charged. `usedBy` is `[{ user, usedAt, booking }]` — legacy rows hold bare ObjectIds, so read it via `userUsageCount()`, never `entry.user` directly
- **Ledger rows carry a content-hash `idempotencyKey`** with a unique sparse index, and `createJournalEntry` takes a `session`. Always pass the session so journals commit with the transaction they describe
- **`utils/withOptionalTransaction.js`** replaces direct `session.withTransaction()` calls. `docker-compose.yml` runs a standalone `mongo:7`, where transactions throw; this helper falls back to a sessionless run. Never call `res.*` inside the callback — it can run more than once
- **Access tokens carry a `tv` (tokenVersion) claim** checked by `authMiddleware` (60s cached). Bump `User.tokenVersion` and call `invalidateTokenVersionCache(userId)` to revoke tokens before their 15-minute expiry
- **Admin components must only read fields their endpoint returns.** A component that reads a missing field renders a blank, a zero or `NaN` instead of failing, and that is how the Rate Limits tab printed `Rate NaN/m` and System Health printed `Heap Used 0 B` / `Cores 0` / `Environment Unknown`. `test/apiContract.test.mjs` pairs a component with the real controller response and fails on any read that is `undefined`, `null` or `NaN` — add a `CONTRACTS` entry when a new admin view starts reading a response. Endpoint field names follow the ones in `/api/health/info` (`heapUsed`, `heapTotal`, `rss` in **bytes**), not rounded megabytes
- **Report history records exactly one row per generation**, from `middleware/reportHistory.js`, triggered by the `res.locals.report` record that `reportController.generateReport` publishes (`rowCount` plus the effective date range). Never add a second recording hook: patching both `res.send` and `res.setHeader` is what wrote a duplicate row — without `fileSize` — for every download. `GET /api/admin/reports/history` is paginated (`?page`, `?limit` max 100) and returns `{ reports, page, pages, total, limit }`
- **`ENCRYPTION_KEY` gates PII encryption** — NID, licence, and phone are encrypted only when it is set. Production refuses to boot without it. Duplicate detection uses `nidHash`/`phoneHash` via `security/utils/piiHash.js`, not the plaintext fields
- **`GET /api/tracking` requires a session** unless `TRACKING_PUBLIC=true`; the homepage map is shown to signed-in visitors only. The feed is also scoped by role — Admin sees every vehicle, a Renter sees their own fleet, and a signed-in customer sees only bookable vehicles that are not currently out on rent (so a rider's live position is never published). Per-vehicle tracking endpoints need Renter/Admin **and** ownership
- **`POST /api/admin/campaigns/:id/send` queues**, it does not send inline: it flips the campaign to `sending` and `jobs/emailCampaignSender.js` does the work in batches, persisting progress and pausing itself on a high bounce rate
- **All search input must go through `escapeRegex`** (`utils/sanitize.js`) before reaching `$regex` or `new RegExp`; `sanitize()` strips all HTML and is for user text, while `sanitizeEmail()` is for content that is meant to be HTML (email templates, campaign bodies)

## Business rules
See `RULES.md` for full pricing, fine policies, and operational constraints. Base: 200 TK/hr minimum. Tier-based pricing per vehicle. Seasonal rates. 30-minute buffer between bookings. 10-minute start time minimum. 5-minute checkout timeout. Advance: 50% ≤24h, 30% >24h. Cancellation: 24h+ full refund, 12-24h 50%, <12h none, no-show none. Business rules editable live via Settings model (businessRules JSON in admin Settings tab).
