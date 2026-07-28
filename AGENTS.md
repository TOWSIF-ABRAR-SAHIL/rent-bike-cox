# AGENTS.md

## Project Structure

Two independent packages, same repo — no workspace:

| Path | Module | Node | Dev command | Port |
|---|---|---|---|---|
| `backend/` | CommonJS | Express 5, Mongoose 9 | `npm run dev` (nodemon) | 5000 |
| `frontend/` | ESM | React 19, Vite 8, Tailwind 4 | `npm run dev` (vite) | 5173 |

Each has own `node_modules/`, `.env`, `package.json`. Lockfiles committed.

### Live URLs
- **Frontend:** https://rent-bike-cox.vercel.app
- **Backend:** https://rent-bike-backend.onrender.com

## Commands

```bash
# One-time after clone
git config core.hooksPath .githooks   # enables commit-msg hook

cd backend && npm run dev          # nodemon on :5000
cd frontend && npm run dev         # vite on :5173
cd frontend && npm run lint        # eslint (no typecheck in stack)
cd frontend && npm run build       # prod build
docker-compose up --build          # Docker (backend + mongo)
```

Test suites: Vitest. Backend 97 tests, frontend 26 tests (123 total). Run with `npx vitest run` in either package.

## Architecture

### Entrypoints
- Backend: `backend/server.js` — mounts all routes, middleware, error handler, MongoDB connect
- Frontend: `frontend/src/main.jsx` → `App.jsx` (React.lazy code splitting on all pages)

### Routes (backend)
| Prefix | File | Access |
|---|---|---|
| `GET /api/health` | inline in server.js + `routes/health.js` | public |
| `GET /api/health/info` | routes/health.js | public (memory, uptime, PID) |
| `GET /api/seed-temp` | inline (dev only, `NODE_ENV !== 'production'`) | public |
| `/api/auth` | `routes/auth.js` | register (file upload), login |
| `/api/dashboard` | `routes/dashboard.js` | public (settings, bikes, categories) + renter + admin |
| `/api/booking` | `routes/booking.js` | authenticated (role-based per handler) |
| `/api/payment` | `routes/payment.js` | init (auth), success/fail/cancel/ipn (public, SSLCommerz POSTs) |
| `/api/coupons` | `routes/coupons.js` | admin CRUD |
| `/api/policies` | `routes/policy.js` | public GET, admin CRUD |
| `/api/financial` | `routes/financial.js` | admin only |
| `/api/documents` | `routes/documents.js` | authenticated |
| `/api/pricing` | `routes/pricing.js` | auth (preview) |
| `/api/audit` | `routes/audit.js` | admin |
| `/api/fraud` | `routes/fraud.js` | admin |
| `/api/payouts` | `routes/payouts.js` | admin |
| `/api/maintenance` | `routes/maintenance.js` | auth (Renter + Admin) |
| `/api/availability` | `routes/availability.js` | public |
| `/api/zones` | `routes/zone.js` | public GET, admin CRUD |
| `/api/fleet` | `routes/fleet.js` | auth (Renter + Admin) |
| `/api/bulk` | `routes/bulk.js` | auth (Renter + Admin) |
| `/api/vehicle-history` | `routes/vehicleHistory.js` | auth (Renter + Admin) |
| `/api/search` | `routes/search.js` | public |
| `/api/analytics` | `routes/analytics.js` | admin only (revenue, bookings, categories, top-bikes, customers, zones, duration, financial, export) |
| `/api/notifications` | `routes/engagement.js` | auth |
| `/api/reviews` | `routes/engagement.js` | public GET, auth POST/PUT/DELETE |
| `/api/seasonal-rates` | `routes/seasonal.js` | public GET (active) |
| `/api/admin/seasonal-rates` | `routes/seasonal.js` | admin CRUD |
| `/api/vehicle-docs` | `routes/vehicleDoc.js` | auth (Renter + Admin) |
| `/api/notification-preferences` | `routes/notificationPref.js` | auth |
| `/api/{*splat}` | catch-all | 404 |

### Models (20+)
| Model | Purpose |
|-------|---------|
| User | role enum (Admin/Renter/User), select:false password, NID/license |
| Bike | category ref, renter ref, tier pricing, images |
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
| Zone | service zones (slug, geo) |
| Notification | in-app notifications |
| NotificationPreference | per-user email/push/inApp toggles |
| Review | bike reviews and ratings |
| SeasonalRate | peak/off-peak/holiday pricing |
| VehicleDocument | registration/insurance/fitness docs |

### Roles
Three roles on `User` model: `Admin`, `Renter`, `User`. Authorization via middleware: `security/middleware/authorize.js` and `security/middleware/checkOwnership.js`. `ProtectedRoute` component on frontend takes a `roles` prop for route gating.

### Auth
JWT in `Authorization: Bearer <token>` header. Token decoded in `middleware/authMiddleware.js` — sets `req.user = { id, role }`. Expires in 1d. Stored in `localStorage` on frontend, injected by Axios interceptor (`frontend/src/api/axios.js`). Refresh tokens supported.

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
| auth | 15 min | 20 |
| booking | 15 min | 20 |
| payment | 15 min | 10 |
| financial | 15 min | 20 |
| search | 1 min | 30 |
| dashboard | 1 min | 60 |
| fleet | 1 min | 40 |

### CORS whitelist
`FRONTEND_URL` env, `https://rent-bike-cox.vercel.app`, `https://sandbox.sslcommerz.com`, `https://sslcommerz.com`. `http://localhost:5173` only in dev mode (`NODE_ENV !== 'production'`). No loose `origin.includes()`. CORS errors return 403.

### Upload middleware
`middleware/uploadMiddleware.js` — multer → Cloudinary (if credentials configured) or memory storage fallback. Max 5MB, JPG/JPEG/PNG only. Folders: `rent-bike-cox/nids/`, `rent-bike-cox/licenses/`, `rent-bike-cox/bikes/`. File size/type errors return 400.

### Settings
Global pricing in `Settings` model (singleton). Seeded on-demand if missing. Whitelist-only update: `basePricePerHour` + `packages`.

### Taxonomy
`Category` model managed by Admin. Defaults in `dashboardController.js`: Bike, Car, Jeep. Bikes reference categories via ObjectId. Deletion blocked while bikes reference the category.

### Seeding
| Script | What it creates | Notes |
|---|---|---|
| `node scripts/seedAdmin.js` | admin@rentbikecox.com / admin123 | Uses `path: '../.env'` — must run from `backend/` |
| `node seed.js` | Same admin | Simpler script |
| `node seedDemo.js` | renter + user + categories + 10 demo bikes | Runs `process.exit()` when done |
| `GET /api/seed-temp` | All three users + categories + bikes | Dev only, guarded by `NODE_ENV !== 'production'` |

### Error handler
404 catch-all at `/api/{*splat}`. Centralized `middleware/errorHandler.js` — no stack traces. Distinct messages for CORS, file size, file type, and generic 500. Request logger tracks correlation ID, method, URL, status, and duration.

### Background jobs
| Job | Interval | Purpose |
|-----|----------|---------|
| checkoutCleanup | 60s | Auto-expire pending bookings (5min timeout) |
| expiredIntentCleanup | — | Clean up expired payment intents |
| bookingStateTransition | — | Move bookings through state machine |
| dataRetention | 24h | Delete old data (2-year policy) |
| maintenanceReminder | 12h | Alert for upcoming maintenance |

All jobs have MongoDB connection guards (`mongoose.connection.readyState !== 1`).

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

### Pages (all React.lazy loaded)
- `/` — Home (hero carousel, vehicle ratings, Explore Zones, testimonials)
- `/bike/:id` — BikeDetails (gallery, lightbox, zone map, save/compare, recommendations)
- `/checkout/:bikeId` — Checkout (booking + payment)
- `/invoice/:bookingId` — Invoice (printable)
- `/login` — Login
- `/signup` — Signup
- `/forgot-password` — Forgot password (OTP flow)
- `/renter-dashboard` — Renter (roles: Renter, Admin)
- `/admin-dashboard` — Admin only (9 tabs: Settings, Bikes, Users, Coupons, Categories, Walk-in, Finance, Maintenance, Zones)
- `/fleet` — Fleet dashboard (roles: Renter, Admin)
- `/analytics` — Analytics dashboard (Admin only — revenue, bookings, categories, top bikes, zones, duration, financial, hourly, customers)
- `/search` — Advanced search with filters (price range, category, sort)
- `/vehicle-history/:bikeId` — Vehicle history timeline
- `/notifications` — Notifications
- `/notification-settings` — Notification preferences (email, push, in-app)
- `/seasonal-pricing` — Seasonal pricing manager (Admin only)
- `/vehicle-docs` — Vehicle documents
- `/policies` — Public policy list
- `/zones` — Zone explorer with Leaflet map
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
- Env vars in dashboard: MONGODB_URI, JWT_SECRET, Cloudinary, SSLCommerz, BACKEND_URL, FRONTEND_URL
- Free tier: cold starts ~30s after idle

### Frontend (Vercel)
- `vercel.json` in `frontend/`: SPA catch-all rewrite + asset caching
- Env var: `VITE_API_URL=https://rent-bike-backend.onrender.com/api`

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
- Frontend env vars must be prefixed `VITE_` (Vite rule)
- `seedAdmin.js` uses `process.env.config({ path: '../.env' })` — always run from `backend/`
- Frontend no typecheck — only `npm run lint`
- CORS errors return 403, not 500
- **CORS localhost** — only in dev mode (`NODE_ENV !== 'production'`)
- **`req.query`** — Express 5 makes it read-only; custom `sanitize.js` handles this
- **MongoDB Atlas M0** — no transactions; booking lock uses CAS fallback
- **`vercel.json`** — must be in `frontend/` directory (not repo root) for SPA rewrites
- **`SSLCOMMERZ_STORE_PASS`** — code reads both `SSLCOMMERZ_STORE_PASS` and `SSLCOMMERZ_STORE_PASSWORD` (fallback)
- **`express-mongo-sanitize`** — replaced with custom `middleware/sanitize.js` (Express 5 incompatible)
- **`Date.now()` in render** — React 19 ESLint `set-state-in-effect` rule; keep side effects out of render
- **`context` hooks** — must be in separate files from providers (ESLint enforced)

## Business rules
See `RULES.md` for full pricing, fine policies, and operational constraints. Base: 200 TK/hr minimum. Tier-based pricing per vehicle. Seasonal rates. 30-minute buffer between bookings. 10-minute start time minimum. 5-minute checkout timeout. Advance: 50% ≤24h, 30% >24h. Cancellation: 24h+ full refund, 12-24h 50%, <12h none, no-show none.
