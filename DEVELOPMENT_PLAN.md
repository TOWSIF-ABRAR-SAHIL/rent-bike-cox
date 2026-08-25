# Rent Bike Cox's Bazar — Development Plan

Complete guide for building, learning, and scaling this project.

## Live URLs

- **Frontend:** https://rent-bike-cox.vercel.app
- **Backend:** https://rent-bike-backend.onrender.com

---

## 1. Getting Started

### Prerequisites
- Node.js 20+ (via nvm)
- MongoDB (local or Atlas)
- Cloudinary account (image uploads)
- SSLCommerz sandbox account (payments)
- Git

### Quick Start
```bash
git clone https://github.com/TOWSIF-ABRAR-SAHIL/rent-bike-cox.git
cd rent-bike-cox
git config core.hooksPath .githooks

# Backend
cd backend && cp .env.example .env && npm install && npm run dev

# Frontend (new terminal)
cd frontend && cp .env.example .env && npm run dev
```

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@rentbikecox.com | admin123 |
| Renter | renter@rentbikecox.com | renter123 |
| User | user@rentbikecox.com | user123 |

---

## 2. Current Status

**All core features are COMPLETE and DEPLOYED.**

| Phase | Tasks | Status |
|-------|-------|--------|
| Project Setup | — | ✅ Done |
| Core Models & Auth | — | ✅ Done |
| Frontend Pages | 18 pages | ✅ Done |
| UI/UX Redesign | 9 phases | ✅ Done |
| Tier-Based Pricing | 5 tasks | ✅ Done |
| Enterprise Payment | 153 tasks | ✅ Done |
| Security Hardening | 200 tasks | ✅ Done |
| Fleet Management | 190 tasks | ✅ Done |
| Production Readiness | 218 tasks | ✅ Done |
| Deployment | 7 tasks | ✅ Done |
| QA Audit | 140 bugs | ✅ Fixed |
| Quality Push (Vitest, Sentry, CI) | 54 tasks | ✅ Done |
| Post-Deployment Enhancements | 19 phases | ✅ Done |
| **Total Tests** | **157** | **131 backend + 26 frontend** |

---

## 3. Architecture Summary

### Tech Stack
- **Frontend:** React 19, Vite 8, Tailwind CSS 4, React Router 7
- **Backend:** Express 5, Mongoose 9, MongoDB
- **Auth:** JWT (bcryptjs)
- **Payments:** SSLCommerz
- **Uploads:** Multer + Cloudinary
- **Logging:** Winston
- **Finance:** Decimal.js
- **Email:** Nodemailer
- **Security:** Helmet, CORS, DOMPurify, rate limiting

### Key Features
- 3-role system (Admin/Renter/User)
- 3 vehicle categories (Bike/Car/Jeep)
- Tier-based pricing with seasonal rates
- Fleet management (zones, maintenance, availability, bulk ops)
- Analytics dashboard (revenue, trends, top bikes, customers, zones, duration, financial, hourly)
- GPS live tracking (Leaflet real-time map with clustering, trails, telemetry)
- 18 report types in CSV/JSON/PDF/XLSX with preview and history
- Admin dashboard with 22 tabs, TabErrorBoundary isolation
- Maps & zones (Leaflet/OpenStreetMap, 8 Cox's Bazar zones, route planner)
- Vehicle comparison (max 3 side-by-side)
- Wishlist (localStorage-persisted)
- In-app + email + push notifications with user preferences
- Reviews and ratings
- Vehicle document management
- Hero carousel, photo lightbox, testimonials
- Mobile bottom navigation + WhatsApp contact
- Theme switcher (Light/Dark/System)
- 157 tests (131 backend + 26 frontend)

---

## 4. Development Workflow

### Code Quality
- ESLint strict rules (no typecheck)
- Context hooks in separate files (ESLint enforced)
- React 19 purity rules

### Git
- Commit convention: `type: description`
- Types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `style`
- Branch protection on `main`

### Adding a New Feature

1. **Backend:**
   - Create model in `backend/models/`
   - Create controller in `backend/controllers/`
   - Create route in `backend/routes/`
   - Mount route in `backend/server.js`
   - Add rate limiter if needed

2. **Frontend:**
   - Create page in `frontend/src/pages/`
   - Add route in `App.jsx` with `React.lazy`
   - Create components in `frontend/src/components/`
   - Use `useAuth()` for auth state
   - Use `useTheme()` for theme state

3. **Testing:**
   - Start backend: `cd backend && npm run dev`
   - Start frontend: `cd frontend && npm run dev`
   - Test all roles
   - Run `npm run lint` in frontend

---

## 5. Key Gotchas

| Gotcha | Details |
|--------|---------|
| React 19 | No `import React` in components (ESLint flags it) |
| Express 5 | Route errors propagate differently than Express 4 |
| Tailwind 4 | No `@tailwind` directives, use `@import "tailwindcss"` |
| ESLint | Context hooks MUST be in separate files from providers |
| Frontend env | Must be prefixed with `VITE_` |
| CORS | Errors return 403, not 500 |
| CORS localhost | Only in dev mode (NODE_ENV !== production) |
| `req.query` | Express 5 makes it read-only — use custom sanitize.js |
| MongoDB Atlas M0 | No transactions — CAS fallback for booking locks |

---

## 6. Deployment

### Backend (Render)
1. Push to `main` → auto-deploys (or manual from dashboard)
2. Env vars in Render dashboard (never in code)
3. URL: `https://rent-bike-backend.onrender.com`

### Frontend (Vercel)
1. Push to `main` → auto-deploys
2. `VITE_API_URL` env var in Vercel dashboard
3. URL: `https://rent-bike-cox.vercel.app`

### Post-Deploy
- Configure SSLCommerz callback URLs
- Whitelist Render IPs in MongoDB Atlas
- Test all 3 role logins

---

## 7. Scalability Roadmap

### Phase 10 (Future)
- WebSocket real-time availability updates
- SMS notifications (Twilio)
- httpOnly cookie auth flow
- Bengali (bn) i18n
- Vehicle photo management

### Phase 11 (Future)
- Mobile app (React Native)
- Payment gateway expansion (Stripe, bKash direct)
- Advanced analytics (ML-based demand prediction)
- Multi-city support

---

## 8. Learning Path

| Topic | Where to Look |
|-------|--------------|
| Express 5 routing | `backend/server.js`, `backend/routes/` |
| Mongoose schemas | `backend/models/` |
| React context pattern | `frontend/src/context/AuthContext.jsx` + `useAuth.js` |
| JWT auth flow | `backend/middleware/authMiddleware.js`, `frontend/src/api/axios.js` |
| Payment flow | `backend/gateways/SSLCommerzGateway.js`, `backend/controllers/paymentController.js` |
| State machines | `backend/stateMachines/` |
| Event system | `backend/events/EventBus.js` |
| Caching | `backend/utils/cache.js` |
| Error handling | `backend/middleware/errorHandler.js` |
| Docker | `backend/Dockerfile`, `docker-compose.yml` |

---

## 9. Commit Rules

Format: `type: description`

```bash
feat: add fleet management dashboard
fix: correct payment amount calculation
docs: update README deployment instructions
refactor: migrate console.log to winston
chore: update npm dependencies
test: add booking controller tests
style: fix indentation in navbar
```

Description starts lowercase. Max 72 characters.
