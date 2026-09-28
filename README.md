# Rent Bike Cox's Bazar

Bike, car & jeep rental platform for Cox's Bazar. Guest browsing, 3-role system (Admin/Renter/User), tier-based pricing, SSLCommerz payments, fleet management, and a modern dark UI with theme switcher.

## Live

- **Frontend:** https://rent-bike-cox.vercel.app
- **Backend:** https://rent-bike-backend.onrender.com

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4, Axios |
| Backend | Express 5, Mongoose 9, MongoDB |
| Auth | JWT (bcryptjs), password policy (8+ chars, uppercase, number, special) |
| Payments | SSLCommerz (bKash, Nagad, card, internet banking) |
| Uploads | Multer + Cloudinary (NID, license, bike photos) |
| Logging | Winston (structured, redaction, file rotation) |
| Email | Nodemailer (SMTP) |
| Security | Helmet, CORS, rate limiting, DOMPurify sanitization, HSTS |
| Finance | Decimal.js (safe arithmetic) |
| Docker | Dockerfile + docker-compose (backend + mongo) |
| CI/CD | GitHub Actions (lint, build, syntax check) |
| Deploy | Render (backend), Vercel (frontend) |

## Features

- **Guest browsing** — browse bikes, search, view policies without login
- **3-role system** — Admin, Renter, User with role-based access
- **Vehicle categories** — Bike, Car, Jeep with tier-based pricing
- **Booking flow** — checkout, SSLCommerz payment, invoice, cancellation
- **Fleet management** — zones, availability calendar, maintenance logs, bulk operations
- **GPS Live Tracking** — real-time fleet map with Leaflet, category icons, movement trails, smooth marker animation, marker clustering, speed/battery/heading telemetry, ESP32/GSM IoT API
- **Reports** — 18 report types in CSV/JSON/PDF/XLSX with preview modal, download, and report history
- **Analytics** — revenue charts, booking trends, category performance, top bikes, zone analytics, rental duration, financial summary, hourly distribution
- **Notifications** — in-app + email + push notifications with per-user preferences
- **Reviews** — rider reviews and ratings on vehicles
- **Seasonal pricing** — admin-configurable peak/off-peak/holiday rates
- **Vehicle documents** — upload, verify, expiry tracking
- **Fleet maps** — Leaflet/OpenStreetMap with LiveFleetMap (real-time tracking, clustering, telemetry)
- **Vehicle comparison** — compare up to 3 vehicles side-by-side
- **Wishlist** — save favorite vehicles (localStorage)
- **Theme switcher** — Light, Dark, System mode
- **Mobile navigation** — bottom nav bar with WhatsApp contact
- **Hero carousel** — auto-rotating vehicle images
- **Photo lightbox** — fullscreen gallery with zoom and keyboard navigation
- **SEO** — meta tags, robots.txt, sitemap.xml, JSON-LD schema
- **Security** — Helmet CSP, rate limiting, audit logging, fraud detection, circuit breaker
- **Testing** — Vitest, run with `npm test` in either package (250 backend + 80 frontend)
- **Rendering** — public pages (`/`, `/faq`, `/bike/[id]`) are server-rendered with ISR and prefetch their data; the policy pages ship no JavaScript; auth/booking/dashboard pages stay client-side

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rentbikecox.com | admin123 |
| Renter | renter@rentbikecox.com | renter123 |
| User | user@rentbikecox.com | user123 |

## Local Development

### Prerequisites

- Node.js 20+ (via nvm recommended)
- MongoDB (local or Atlas)
- Cloudinary account
- SSLCommerz sandbox account

### Both at once

There is no root runner script — start each package in its own terminal:

```bash
# terminal 1 — backend on http://localhost:5000
cd backend && npm run dev

# terminal 2 — Next.js on http://localhost:3000
cd frontend-next && npm run dev
```

The frontend reads its API base from `NEXT_PUBLIC_API_URL` and falls back to
`http://localhost:5000/api`, so a local backend is picked up automatically.

### Backend

```bash
cd backend
cp .env.example .env    # fill in your credentials
npm install
node scripts/seedAdmin.js   # creates admin@rentbikecox.com / admin123
npm run dev
```

### Frontend

```bash
cd frontend-next
npm install
# create .env.local with: NEXT_PUBLIC_API_URL=https://rent-bike-backend.onrender.com/api
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000`. With no env file,
the Axios client defaults to `http://localhost:5000/api`.

### Docker

```bash
docker-compose up --build
```

Runs backend + MongoDB on `http://localhost:5000`.

## Deployment

### Backend (Render)

1. Push to `main` on GitHub
2. Create Web Service on Render → select repo
3. Root directory: `backend`, build: `npm install`, start: `node server.js`
4. Set env vars: MONGODB_URI, JWT_SECRET, Cloudinary, SSLComMERZ, BACKEND_URL, FRONTEND_URL
5. Backend URL: `https://rent-bike-backend.onrender.com`

### Frontend (Vercel)

1. Import repo on Vercel
2. Root directory: `frontend-next`, framework: Next.js (auto-detected)
3. Env var: `NEXT_PUBLIC_API_URL=https://rent-bike-backend.onrender.com/api`
4. Frontend URL: `https://rent-bike-cox.vercel.app`

No `vercel.json` — Next.js handles routing and headers through `next.config.ts`.

## Project Structure

```
rent-bike-cox/
├── backend/
│   ├── controllers/      # 21 controllers
│   ├── models/           # 30+ Mongoose models
│   ├── routes/           # 30+ route files
│   ├── middleware/        # auth, upload, error handling, sanitize, logging
│   ├── security/         # validators, sanitizers, authorization
│   ├── services/         # Pricing, Payment, Refund, Cancellation, Coupon, Fraud, Payout, Email, Notification
│   ├── stateMachines/    # Booking, PaymentIntent, Refund
│   ├── gateways/         # GatewayRegistry + SSLCommerz
│   ├── domain/           # Money (Decimal.js), enums
│   ├── events/           # EventBus
│   ├── jobs/             # Background jobs (cleanup, state transition, retention)
│   ├── utils/            # cache, logger, gracefulShutdown, pricing, etc
│   └── server.js         # Express app entry
├── frontend-next/
│   └── src/
│       ├── app/          # App Router routes (32)
│       ├── views/        # Route view components (client)
│       ├── components/   # 60+ reusable components
│       ├── context/      # AuthContext, ThemeContext
│       └── api/          # Axios instance
├── docs/                 # Architecture, Security, Phases, etc
├── .github/workflows/    # CI/CD pipelines
├── render.yaml           # Render blueprint
├── docker-compose.yml    # Local Docker dev
└── CREDENTIALS.md        # All secrets (gitignored)
```

## Project Docs

- `RULES.md` — Business rules, fine policies, pricing tiers
- `AGENTS.md` — Development context, routes, models, gotchas
- `docs/Architecture.md` — Full architecture and directory structure
- `docs/Security.md` — Security measures and configuration
- `docs/Phases.md` — Implementation phases and task status
- `docs/Build-Process.md` — Dev workflow and deployment
- `docs/Database.md` — All schemas and relations
- `docs/Error-handling.md` — Status codes and error patterns
- `CREDENTIALS.md` — All secrets and API keys (gitignored)

## Commit Convention

Format: `type: description`

Allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`

```bash
feat: add fleet management dashboard
fix: correct payment amount calculation
docs: update README deployment instructions
```

## License

Private — Rent Bike Cox's Bazar
