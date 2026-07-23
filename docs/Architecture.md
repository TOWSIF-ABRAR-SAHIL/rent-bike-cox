# Architecture — Rent Bike Cox's Bazar

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.2.5 |
| Build tool | Vite | 8.0.10 |
| CSS | Tailwind CSS | 4.2.4 |
| Animations | Framer Motion | 12.42.2 |
| HTTP client | Axios | 1.16.0 |
| Routing | React Router DOM | 7.15.0 |
| Icons | Lucide React | 1.14.0 |
| Backend | Express | 5.2.1 |
| Database | Mongoose/MongoDB | 9.6.1 |
| Auth | JWT (jsonwebtoken) | 9.0.3 |
| Password | bcryptjs | 3.0.3 |
| Payments | SSLCommerz (sslcommerz-lts) | 1.2.0 |
| File uploads | Multer + Cloudinary | 2.1.1 / 1.41.3 |
| Security | Helmet, CORS, Rate Limit | 8.3.0, 2.8.6, 8.5.2 |
| Compression | compression | 1.8.1 |

## Directory Structure

```
rent-bike-cox/
├── backend/
│   ├── server.js              # Express app entry
│   ├── .env / .env.example
│   ├── controllers/            # Business logic
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # Express routers
│   ├── middleware/             # Auth, upload, 404
│   ├── utils/                 # invoiceNumber
│   ├── scripts/               # seedAdmin, seedDemo
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Router + lazy pages
│   │   ├── main.jsx           # ReactDOM entry
│   │   ├── index.css          # Tailwind + design system
│   │   ├── api/axios.js       # Axios instance + interceptor
│   │   ├── context/           # AuthContext + useAuth
│   │   ├── components/        # Reusable UI + layout
│   │   ├── pages/             # Route pages
│   │   └── assets/            # Images, SVGs
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── package.json
├── docs/                      # This directory
├── AGENTS.md
├── RULES.md
├── CREDENTIALS.md             # Gitignored
├── REDESIGN_PLAN.md
├── .githooks/commit-msg
├── render.yaml                # Backend deploy
└── vercel.json                # Frontend deploy
```

## Client-Server Flow

```
Browser ──► Vite Dev (5173) ──► API calls ──► Express (5000) ──► MongoDB Atlas
   │                                │
   │  React Router (SPA)           │  Auth middleware
   │  Context (useAuth)            │  Rate limiting
   │  Axios interceptor           │  CORS check
   │  Lazy pages                   │  Input validation
   └───────────────────────────────┘  File upload (Cloudinary)
```

## API Endpoints

### Health & Seed
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | Public | Server health check |
| GET | `/api/seed-temp` | Dev only | Seed demo data (NODE_ENV !== production) |

### Auth (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | Public | Register with NID + license images |
| POST | `/login` | Public | Login, returns JWT + user |

### Dashboard (`/api/dashboard`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings` | Public | Global pricing settings |
| GET | `/bikes/available` | Public | Available bikes |
| GET | `/bikes/:id` | Public | Single bike details |
| GET | `/categories` | Public | Active categories |
| POST | `/bikes` | Renter | Add bike (5 images) |
| GET | `/my-bikes` | Renter | Renter's own bikes |
| PUT | `/bikes/:id/availability` | Renter | Toggle availability |
| GET | `/admin/bikes` | Admin | All bikes |
| DELETE | `/admin/bikes/:id` | Admin | Delete bike |
| PUT | `/admin/settings` | Admin | Update pricing |
| PUT | `/admin/bikes/:id/verify` | Admin | Toggle verification |
| GET | `/admin/users` | Admin | All users |
| PUT | `/admin/users/:id/verify` | Admin | Toggle user verification |
| GET | `/admin/categories` | Admin | All categories |
| POST | `/admin/categories` | Admin | Create category |
| PUT | `/admin/categories/:id` | Admin | Update category |
| DELETE | `/admin/categories/:id` | Admin | Delete category |

### Bookings (`/api/booking`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Auth | Create booking |
| POST | `/confirm` | Auth | Confirm payment (server-computed amount) |
| GET | `/my-bookings` | User | User's bookings |
| GET | `/renter-bookings` | Renter | Renter's incoming bookings |
| GET | `/admin/all` | Admin | All bookings |
| GET | `/:id` | Auth | Booking details (ownership check) |
| PUT | `/:id/cancel` | Auth | Cancel booking |
| PUT | `/:id/complete` | Renter/Admin | Mark booking complete |

### Payment (`/api/payment`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/init` | Auth | Initialize SSLCommerz payment |
| GET/POST | `/success/:bookingId/:tranId` | Public | Payment success callback |
| GET/POST | `/fail` | Public | Payment failure redirect |
| GET/POST | `/cancel` | Public | Payment cancel redirect |
| POST | `/ipn` | Public | SSLCommerz IPN webhook |

### Coupons (`/api/coupons`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List coupons |
| POST | `/` | Admin | Create coupon |
| PUT | `/:id` | Admin | Update coupon |
| DELETE | `/:id` | Admin | Delete coupon |

### Policies (`/api/policies`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | Active policies |
| GET | `/admin` | Admin | All policies |
| POST | `/` | Admin | Create policy |
| PUT | `/:id` | Admin | Update policy |
| DELETE | `/:id` | Admin | Delete policy |

## Auth Flow

```
1. User registers → NID + license uploaded to Cloudinary
2. Admin verifies user (isVerified: true)
3. User logs in → JWT token (1 day expiry) returned
4. Frontend stores in localStorage
5. Axios interceptor injects Authorization: Bearer <token>
6. Backend middleware decodes JWT → req.user = { id, role }
7. Controllers check role + ownership inline
```

## Payment Flow

```
1. User selects bike → POST /api/booking → booking created (Pending)
2. Frontend → POST /api/payment/init → SSLCommerz gateway URL returned
3. User pays on SSLCommerz (bKash/Nagad/card)
4. SSLCommerz redirects → GET/POST /api/payment/success/:bookingId/:tranId
5. Server confirms booking, marks bike unavailable
6. Redirect to frontend /invoice/:bookingId
7. On failure/cancel → frontend /payment-failed or /payment-cancelled

Advance calculation:
  - Rental ≤ 24h → 50% advance
  - Rental > 24h → 30% advance
```

## Middleware Stack (order matters)

```js
helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })
compression()
cors({ origin: exact-match whitelist })
express.json({ limit: '1mb' })
express.urlencoded({ extended: true, limit: '1mb' })
express-rate-limit({ max: 20, windowMs: 15min })  // /api/auth only
```

## CORS Whitelist

- `FRONTEND_URL` env var
- `https://rent-bike-cox.vercel.app`
- `http://localhost:5173`
- `https://sandbox.sslcommerz.com`
- `https://sslcommerz.com`

No loose `origin.includes()`. CORS errors return 403.

## Deployment

| Service | Platform | Config |
|---------|----------|--------|
| Backend | Render | `render.yaml` — build: `cd backend && npm install`, start: `cd backend && node server.js` |
| Frontend | Vercel | `vercel.json` — SPA catch-all rewrite to `/index.html` |
| Database | MongoDB Atlas | Connection string in `MONGODB_URI` env |
| Files | Cloudinary | Image uploads in `rent-bike-cox/` folders |

## Design System

- Dark theme: `#0a0a0f` base, `#0d0d14` card, `#1a1a2e` border
- Glassmorphism: `.glass`, `.glass-light`, `.glass-dark`
- Gradients: `gradient-primary`, `gradient-accent`, `gradient-warm`, `gradient-cool`
- Animations: `fadeIn`, `slideUp`, `slideIn`, `float`, `glowPulse`, `shimmer`
- Print stylesheet for invoices (`.no-print` class)

## Key Constraints

- **React 19** — no `import React` (ESLint unused import)
- **Express 5** — route errors propagate differently than v4
- **Tailwind 4** — no `@tailwind` directives, no `tailwind.config.js` (use `@theme` in CSS)
- Frontend env vars must be prefixed `VITE_`
- `.env` files gitignored — create from `.env.example`
- `npm test` in backend is a stub (no test suites)
