# AGENTS.md

## Project Structure

Two independent packages, same repo — no workspace:

| Path | Module | Node | Dev command | Port |
|---|---|---|---|---|
| `backend/` | CommonJS | Express 5, Mongoose 9 | `npm run dev` (nodemon) | 5000 |
| `frontend/` | ESM | React 19, Vite 8, Tailwind 4 | `npm run dev` (vite) | 5173 |

Each has own `node_modules/`, `.env`, `package.json`. Lockfiles committed.

## Commands

```bash
# One-time after clone
git config core.hooksPath .githooks   # enables commit-msg hook

cd backend && npm run dev          # nodemon on :5000
cd frontend && npm run dev         # vite on :5173
cd frontend && npm run lint        # eslint (no typecheck in stack)
cd frontend && npm run build       # prod build
```

No test suites exist. `npm test` in backend is a stub.

## Architecture

### Entrypoints
- Backend: `backend/server.js` — mounts all routes, middleware, error handler, MongoDB connect
- Frontend: `frontend/src/main.jsx` → `App.jsx` (React.lazy code splitting on all pages)

### Routes (backend)
| Prefix | File | Access |
|---|---|---|
| `GET /api/health` | inline in server.js | public |
| `GET /api/seed-temp` | inline (dev only, guarded by `NODE_ENV !== 'production'`) | public |
| `/api/auth` | `routes/auth.js` | register (file upload), login |
| `/api/dashboard` | `routes/dashboard.js` | public (settings, bikes, categories) + renter + admin |
| `/api/booking` | `routes/booking.js` | authenticated (role-based per handler) |
| `/api/payment` | `routes/payment.js` | init (auth), success/fail/cancel/ipn (public, SSLCommerz POSTs) |
| `/api/coupons` | `routes/coupon.js` | admin-only CRUD |
| `/api/policies` | `routes/policy.js` | public GET, admin CRUD |

### Roles
Three roles on `User` model: `Admin`, `Renter`, `User`. Authorization is inline in each controller handler (no middleware layer). `ProtectedRoute` component on frontend takes a `roles` prop for route gating.

### Auth
JWT in `Authorization: Bearer <token>` header. Token decoded in `middleware/authMiddleware.js` — sets `req.user = { id, role }`. Expires in 1d. Stored in `localStorage` on frontend, injected by Axios interceptor (`frontend/src/api/axios.js`).

### Context hook pattern (ESLint enforced)
`AuthContext` (provider) in `AuthContext.jsx`, `useAuth()` hook in separate `useAuth.js` file. ESLint React Hooks rules require hooks and providers in different files.

### Payment flow (SSLCommerz)
1. Frontend `POST /api/booking` → booking created as `Pending`
2. Frontend `POST /api/payment/init` → returns SSLCommerz gateway URL
3. User pays on SSLCommerz page
4. SSLCommerz POSTs (or GETs) `/api/payment/success/:bookingId/:tranId` → server confirms booking, marks bike unavailable, redirects to frontend `/invoice/:bookingId`
5. `paymentFail` and `paymentCancel` redirect to frontend `/payment-failed` and `/payment-cancelled`
6. Routes for success/fail/cancel handle BOTH GET and POST (SSLCommerz does both)

Advance: 50% for rentals ≤24h, 30% for longer. `BACKEND_URL` and `FRONTEND_URL` env vars control callback redirects.

### Key middleware (in order)
```js
helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })
compression()
cors({ origin: exact-match whitelist only })
express.json({ limit: '1mb' })
express.urlencoded({ extended: true, limit: '1mb' })
express-rate-limit({ max: 20, windowMs: 15min })  // /api/auth only
```

### CORS whitelist
`FRONTEND_URL` env, `https://rent-bike-cox.vercel.app`, `http://localhost:5173`, `https://sandbox.sslcommerz.com`, `https://sslcommerz.com`. No loose `origin.includes()`. CORS errors return 403.

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
| `node seedDemo.js` | renter + user + categories (Bike/Car/Microbus) + 10 demo bikes | Runs `process.exit()` when done |
| `GET /api/seed-temp` | All three users + 5 categories + 10 bikes | Dev only, guarded by `NODE_ENV !== 'production'` |

### Error handler
404 catch-all at `/api/{*splat}`. Error handler sanitized — no stack traces. Distinct messages for CORS, file size, file type, and generic 500.

## Frontend specifics

### Tailwind CSS 4
- `@import "tailwindcss"` (not `@tailwind` directives)
- Custom values via `@theme { --color-* }`
- `@apply` can only reference built-in utilities, not custom classes from `@layer utilities`
- Custom classes like `.glass`, `.gradient-primary` defined in `@layer utilities` with **plain CSS properties**

### Design system
Dark theme (`#0a0a0f`), glassmorphism (`.glass`, `.glass-light`, `.glass-dark`), 4 gradient classes, CSS animations (`fadeIn`, `slideUp`, `slideIn`, `float`, `glowPulse`, `shimmer`). Print stylesheet for invoices (`.no-print`).

### Pages (all React.lazy loaded)
- `/` — Home (hero, category filter, bike grid, stats)
- `/bike/:id` — BikeDetails (gallery, specs)
- `/checkout/:bikeId` — Checkout (booking + payment)
- `/invoice/:bookingId` — Invoice (printable)
- `/renter-dashboard` — Renter (roles: Renter, Admin)
- `/admin-dashboard` — Admin only
- `/policies` — Public policy list
- `/payment-failed`, `/payment-cancelled` — Error states
- `*` — 404

## Deployment

### Backend (Render)
`render.yaml` — `cd backend && npm install` (build), `cd backend && node server.js` (start). All env vars must be set in dashboard (not in yaml): MONGODB_URI, JWT_SECRET, Cloudinary, SSLCommerz.

### Frontend (Vercel)
`vercel.json` — SPA catch-all rewrite: `"source": "/(.*)", "destination": "/index.html"`. Frontend env `VITE_API_URL` must be set in Vercel dashboard.

## Key constraints (gotchas)

- **React 19** — no `import React` in components (ESLint will flag as unused)
- **Express 5** — route errors propagate differently than Express 4
- **Tailwind 4** — no `@tailwind` directives, no `tailwind.config.js` `theme.extend` (use `@theme` in CSS)
- `.env` files are gitignored — collaborator must create from `.env.example`
- Frontend env vars must be prefixed `VITE_` (Vite rule)
- `seedAdmin.js` uses `process.env.config({ path: '../.env' })` — always run from `backend/`
- Frontend no typecheck — only `npm run lint`
- CORS errors return 403, not 500

## Business rules
See `RULES.md` for full pricing, fine policies, and operational constraints. Base: 200 TK/hr. Cancellation: 24h+ full refund, 12-24h 50%, <12h none.
