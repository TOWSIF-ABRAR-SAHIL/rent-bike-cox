# AGENTS.md

## Project Structure

Two independent packages in a single repo:

- `backend/` — Express 5, Mongoose 9, CommonJS (`"type": "commonjs"`)
- `frontend/` — React 19, Vite 8, Tailwind CSS 4, ESM (`"type": "module"`)

Each has its own `node_modules/` and `.env`. No shared tooling or workspace config.

## Commands

```bash
# Backend
cd backend && npm run dev      # starts nodemon on port 5000

# Frontend
cd frontend && npm run dev     # starts vite on port 5173
cd frontend && npm run lint    # eslint — no typecheck exists
cd frontend && npm run build   # production build
```

No test suites exist yet. `npm test` in backend is a stub.

## Commit Convention

Enforced by `.git/hooks/commit-msg`. Format: `type: description`

Allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`

- Description starts lowercase
- Subject line max 72 characters

## Architecture

### Roles

Three roles stored in User model: `Admin`, `Renter`, `User`. Role checks are inline in controllers (no middleware layer for authorization).

### Payment Flow

1. Frontend creates booking via `POST /api/booking` (calculates price + min advance)
2. Frontend calls `POST /api/payment/init` (builds SSLCommerz payload, returns gateway URL)
3. User pays on SSLCommerz hosted page
4. SSLCommerz POSTs to `/api/payment/success/:bookingId/:tranId` (server-side callback)
5. Server confirms booking, marks bike unavailable, redirects to frontend invoice

Advance: 50% for rentals ≤24h, 30% for longer. `BACKEND_URL` and `FRONTEND_URL` env vars control callback redirects.

### Settings

Global pricing (base hourly rate, packages) stored in `Settings` model (singleton document in MongoDB). Seeded on first read if missing.

### File Uploads

NID/license images and bike photos go through multer → Cloudinary. Folders: `rent-bike-cox/nids/`, `rent-bike-cox/licenses/`, `rent-bike-cox/bikes/`.

## Key Files

| File | Why it matters |
|---|---|
| `backend/controllers/paymentController.js` | SSLCommerz integration, redirect URLs |
| `backend/controllers/bookingController.js` | Price calculation, availability checks |
| `backend/controllers/dashboardController.js` | All CRUD for bikes, settings, admin actions |
| `frontend/src/pages/Checkout.jsx` | Booking creation + payment redirect |
| `frontend/src/api/axios.js` | Axios instance with JWT interceptor |

## Gotchas

- React 19 — no need to `import React` in components (triggers lint `no-unused-vars`)
- Express 5 — route errors propagate differently than Express 4
- `process.env` loads from `backend/.env` via dotenv at server start
- Frontend env vars must be prefixed with `VITE_` to be exposed to client code
- No protected routes on frontend — auth is checked ad-hoc in components
- No global state management — all state is local `useState`, auth token in `localStorage`

## Business Rules

See `RULES.md` for pricing, fine policies, and operational constraints. Key numbers:
- Base rate: 200 TK/hour
- Beach sand fine: 1,000 TK
- Lost helmet fine: 2,000 TK
- Boundary violation fine: 5,000 TK
- Max 2 persons per bike, speed limit 50 km/h
