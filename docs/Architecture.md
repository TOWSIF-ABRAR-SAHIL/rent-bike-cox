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
| Logging | Winston | — |
| Finance | Decimal.js | — |
| Sanitization | DOMPurify + jsdom | — |
| Email | Nodemailer | — |

## Directory Structure

```
rent-bike-cox/
├── backend/
│   ├── server.js                    # Express app entry, middleware wiring, route mounts
│   ├── .env / .env.example
│   ├── controllers/                 # 18 controllers
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── paymentController.js
│   │   ├── dashboardController.js   # settings, bikes, categories, admin ops
│   │   ├── couponController.js
│   │   ├── policyController.js
│   │   ├── pricingController.js
│   │   ├── maintenanceController.js
│   │   ├── availabilityController.js
│   │   ├── zoneController.js
│   │   ├── fleetController.js
│   │   ├── bulkController.js
│   │   ├── vehicleHistoryController.js
│   │   ├── searchController.js
│   │   ├── analyticsController.js
│   │   ├── notificationController.js
│   │   ├── reviewController.js
│   │   ├── seasonalController.js
│   │   ├── vehicleDocController.js
│   │   └── notificationPrefController.js
│   ├── models/                      # 20+ Mongoose models
│   │   ├── User.js                  # role enum, select:false password, NID/license
│   │   ├── Bike.js                  # category ref, renter ref, tier pricing
│   │   ├── Booking.js               # status machine, invoice number, buffers
│   │   ├── Category.js              # slug, isActive
│   │   ├── Settings.js              # singleton (basePricePerHour, packages)
│   │   ├── Counter.js               # auto-increment RBC-YYYY-XXXXXX
│   │   ├── Policy.js
│   │   ├── Coupon.js
│   │   ├── PaymentIntent.js
│   │   ├── Refund.js
│   │   ├── AuditLog.js
│   │   ├── RefreshToken.js
│   │   ├── BlacklistedToken.js
│   │   ├── LoginAttempt.js
│   │   ├── PasswordReset.js
│   │   ├── Payout.js
│   │   ├── LedgerEntry.js
│   │   ├── FraudEvent.js
│   │   ├── CircuitBreaker.js
│   │   ├── IdempotencyKey.js
│   │   ├── MaintenanceLog.js        # Fleet: maintenance tracking
│   │   ├── MaintenanceNotification.js
│   │   ├── Zone.js                  # Fleet: service zones
│   │   ├── Notification.js          # In-app notifications
│   │   ├── NotificationPreference.js # Per-user email/push/inApp toggles
│   │   ├── Review.js                # Bike reviews and ratings
│   │   ├── SeasonalRate.js          # Peak/off-peak/holiday pricing
│   │   └── VehicleDocument.js       # Registration/insurance/fitness docs
│   ├── routes/                      # 20+ route files
│   │   ├── auth.js                  # /api/auth
│   │   ├── dashboard.js             # /api/dashboard (public + auth)
│   │   ├── booking.js               # /api/booking
│   │   ├── payment.js               # /api/payment
│   │   ├── coupons.js               # /api/coupons
│   │   ├── policy.js                # /api/policies
│   │   ├── financial.js             # /api/financial
│   │   ├── documents.js             # /api/documents
│   │   ├── pricing.js               # /api/pricing
│   │   ├── maintenance.js           # /api/maintenance
│   │   ├── availability.js          # /api/availability
│   │   ├── zone.js                  # /api/zones
│   │   ├── fleet.js                 # /api/fleet
│   │   ├── bulk.js                  # /api/bulk
│   │   ├── vehicleHistory.js        # /api/vehicle-history
│   │   ├── search.js                # /api/search
│   │   ├── analytics.js             # /api/analytics
│   │   ├── engagement.js            # /api/notifications, /api/reviews
│   │   ├── seasonal.js              # /api/seasonal-rates, /api/admin/seasonal-rates
│   │   ├── vehicleDoc.js            # /api/vehicle-docs
│   │   └── notificationPref.js      # /api/notification-preferences
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT decode → req.user
│   │   ├── uploadMiddleware.js      # multer → Cloudinary
│   │   ├── requestLogger.js         # Correlation ID, method, URL, status, duration
│   │   ├── errorHandler.js          # Centralized error handling
│   │   ├── notFoundHandler.js       # 404 catch-all for /api/*
│   │   └── sanitize.js              # Custom express-mongo-sanitize replacement
│   ├── security/
│   │   ├── middleware/
│   │   │   ├── authorize.js         # Role-based authorization
│   │   │   ├── checkOwnership.js    # Resource ownership verification
│   │   │   └── securityHeaders.js   # Helmet, COOP, CORP, CSP
│   │   ├── validators/
│   │   │   ├── authValidator.js
│   │   │   ├── bookingValidator.js
│   │   │   ├── maintenanceValidator.js
│   │   │   └── zoneValidator.js
│   │   ├── sanitizers/
│   │   │   └── domSanitizer.js      # DOMPurify-based XSS prevention
│   │   └── utils/
│   │       └── passwordPolicy.js    # Password strength validation
│   ├── services/
│   │   ├── Pricing.js               # Tier-based + seasonal pricing
│   │   ├── Payment.js               # SSLCommerz integration
│   │   ├── Refund.js
│   │   ├── Cancellation.js          # Time-based refund policy
│   │   ├── Coupon.js
│   │   ├── Fraud.js                 # Fraud detection
│   │   ├── Notification.js          # In-app notifications
│   │   ├── Payout.js
│   │   └── Email.js                 # Nodemailer SMTP
│   ├── stateMachines/
│   │   ├── Booking.js               # Pending → Confirmed → Active → Completed
│   │   ├── PaymentIntent.js
│   │   └── Refund.js
│   ├── gateways/
│   │   ├── SSLCommerzGateway.js
│   │   ├── BkashGateway.js
│   │   └── StripeGateway.js
│   ├── domain/
│   │   ├── Money.js                 # Decimal.js wrapper
│   │   └── enums.js
│   ├── events/
│   │   └── EventBus.js              # Event-driven architecture
│   ├── jobs/
│   │   ├── expiredIntentCleanup.js
│   │   ├── bookingStateTransition.js
│   │   ├── dataRetention.js         # 2-year retention
│   │   ├── maintenanceReminder.js
│   │   └── checkoutCleanup.js       # 5-min pending checkout expiry
│   ├── utils/
│   │   ├── logger.js                # Winston (redaction, file rotation)
│   │   ├── pricing.js               # calculateBookingPrice (tier + seasonal + buffer)
│   │   ├── bookingLock.js           # MongoDB session transactions (CAS fallback)
│   │   ├── cache.js                 # In-memory cache with TTL (MemoryCache)
│   │   ├── gracefulShutdown.js      # SIGTERM/SIGINT handling
│   │   ├── safeAmount.js            # Decimal.js wrapper (prevents floating point errors)
│   │   ├── timezone.js              # Asia/Dhaka timezone helpers
│   │   ├── circuitBreaker.js        # Payment gateway circuit breaker
│   │   ├── idempotency.js           # Prevent duplicate operations
│   │   └── checkoutCleanup.js
│   ├── services/
│   │   └── emailService.js          # Nodemailer SMTP service
│   ├── scripts/
│   │   ├── seedAdmin.js
│   │   └── seedDemo.js
│   ├── Dockerfile                   # Production container (node:20-alpine)
│   ├── .dockerignore
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Router + React.lazy code splitting
│   │   ├── main.jsx                 # ReactDOM entry
│   │   ├── index.css                # Tailwind 4 + design system (CSS variables, glass, gradients)
│   │   ├── api/axios.js             # Axios instance + JWT interceptor
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       # Auth provider (separate file per ESLint)
│   │   │   ├── useAuth.js           # useAuth hook
│   │   │   ├── ThemeContext.jsx      # Light/Dark/System theme
│   │   │   └── useTheme.js
│   │   ├── pages/                   # 23 route pages
│   │   │   ├── Home.jsx
│   │   │   ├── BikeDetails.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Invoice.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── ForgotPassword.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── RenterDashboard.jsx
│   │   │   ├── FleetDashboard.jsx
│   │   │   ├── AnalyticsDashboard.jsx
│   │   │   ├── AdvancedSearch.jsx
│   │   │   ├── VehicleHistory.jsx
│   │   │   ├── Notifications.jsx
│   │   │   ├── NotificationPreferences.jsx
│   │   │   ├── SeasonalPricingManager.jsx
│   │   │   ├── VehicleDocuments.jsx
│   │   │   ├── PolicyList.jsx
│   │   │   ├── ZoneExplorer.jsx
│   │   │   ├── CompareVehicles.jsx
│   │   │   ├── Wishlist.jsx
│   │   │   ├── RefundManagement.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── ChangePassword.jsx
│   │   │   ├── MyBookings.jsx
│   │   │   ├── PaymentFailed.jsx
│   │   │   ├── PaymentCancelled.jsx
│   │   │   └── NotFound.jsx
│   │   ├── components/              # 50+ reusable components
│   │   │   ├── ErrorBoundary.jsx    # User-friendly error UI
│   │   │   ├── PageSpinner.jsx      # Full-page loading for lazy routes
│   │   │   ├── LoadingSkeleton.jsx
│   │   │   ├── ProtectedRoute.jsx   # Role-based route gating
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── AvailabilityCalendar.jsx
│   │   │   ├── FleetOverview.jsx, FleetSummary.jsx, FleetFilter.jsx, FleetBikeRow.jsx
│   │   │   ├── FleetHealthChart.jsx, FleetUtilizationChart.jsx
│   │   │   ├── MaintenanceSchedule.jsx, MaintenanceLogForm.jsx, MaintenanceHistory.jsx
│   │   │   ├── VehicleHealthCard.jsx
│   │   │   ├── HistoryTimeline.jsx, HistoryFilter.jsx, HistoryStats.jsx
│   │   │   ├── SearchFilters.jsx, SearchResults.jsx, SearchAutocomplete.jsx
│   │   │   ├── RevenueChart.jsx, BookingTrendChart.jsx, CategoryPerformance.jsx, TopBikes.jsx
│   │   │   ├── CustomerInsights.jsx, ZoneAnalytics.jsx, RentalDurationChart.jsx
│   │   │   ├── FinancialSummary.jsx, HourlyDistribution.jsx
│   │   │   ├── NotificationBell.jsx
│   │   │   ├── ReviewForm.jsx, ReviewList.jsx
│   │   │   ├── SeasonalBadge.jsx
│   │   │   ├── DocumentUpload.jsx, DocumentViewer.jsx
│   │   │   ├── BulkOperations.jsx
│   │   │   ├── ZoneCard.jsx, ZoneMap.jsx
│   │   │   ├── RoutePlanner.jsx
│   │   │   ├── CompareBar.jsx
│   │   │   ├── BottomNav.jsx
│   │   │   ├── WhatsAppButton.jsx
│   │   │   ├── Lightbox.jsx
│   │   │   └── ui/ (EmptyState, Skeleton)
│   │   └── assets/
│   ├── index.html                   # SEO meta tags, OG, Twitter cards
│   ├── public/
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── .well-known/security.txt
│   ├── vercel.json                  # SPA rewrites + asset caching
│   ├── vite.config.js
│   ├── eslint.config.js
│   ├── tailwind.config.js
│   ├── .env / .env.example / .env.production
│   └── package.json
├── docs/
├── .github/workflows/
│   ├── ci.yml                       # Lint + build + syntax check
│   └── deploy.yml                   # Render + Vercel deploy triggers
├── render.yaml                      # Render blueprint
├── vercel.json                      # Vercel SPA config
├── docker-compose.yml               # Local Docker dev (backend + mongo:7)
├── AGENTS.md                        # Dev context
├── RULES.md                         # Business rules
├── CREDENTIALS.md                   # Secrets (gitignored)
├── CONTRIBUTING.md                  # Commit conventions
└── README.md
```

## API Routes

| Prefix | File | Access |
|--------|------|--------|
| `GET /api/health` | server.js (inline) | public |
| `/api/auth` | routes/auth.js | public (login, register) |
| `/api/dashboard` | routes/dashboard.js | public (settings, bikes, categories) + renter + admin |
| `/api/booking` | routes/booking.js | authenticated (role-based per handler) |
| `/api/payment` | routes/payment.js | init (auth), success/fail/cancel/ipn (SSLCommerz POSTs) |
| `/api/coupons` | routes/coupons.js | admin CRUD |
| `/api/policies` | routes/policy.js | public GET, admin CRUD |
| `/api/financial` | routes/financial.js | admin only |
| `/api/documents` | routes/documents.js | authenticated |
| `/api/pricing` | routes/pricing.js | auth (preview) |
| `/api/maintenance` | routes/maintenance.js | auth (Renter + Admin) |
| `/api/availability` | routes/availability.js | public |
| `/api/zones` | routes/zone.js | public GET, admin CRUD |
| `/api/fleet` | routes/fleet.js | auth (Renter + Admin) |
| `/api/bulk` | routes/bulk.js | auth (Renter + Admin) |
| `/api/vehicle-history` | routes/vehicleHistory.js | auth (Renter + Admin) |
| `/api/search` | routes/search.js | public |
| `/api/analytics` | routes/analytics.js | admin only (9 endpoints: revenue, bookings, categories, top-bikes, customers, zones, duration, financial, export) |
| `/api/notifications` | routes/engagement.js | auth |
| `/api/reviews` | routes/engagement.js | public GET, auth POST/PUT/DELETE |
| `/api/seasonal-rates` | routes/seasonal.js | public GET (active) |
| `/api/admin/seasonal-rates` | routes/seasonal.js | admin CRUD |
| `/api/vehicle-docs` | routes/vehicleDoc.js | auth (Renter + Admin) |
| `/api/notification-preferences` | routes/notificationPref.js | auth |

## Rate Limiters

| Limiter | Window | Max Requests |
|---------|--------|-------------|
| Auth | 15 min | 20 |
| Booking | 15 min | 20 |
| Payment | 15 min | 10 |
| Financial | 15 min | 20 |
| Search | 1 min | 30 |
| Dashboard | 1 min | 60 |
| Fleet | 1 min | 40 |

## Key Middleware (in order)

1. `cors()` — exact-match whitelist only
2. `express.json({ limit: '1mb' })`
3. `express.urlencoded({ extended: true, limit: '1mb' })`
4. `mongoSanitize()` — custom implementation (replaced express-mongo-sanitize)
5. `hpp()` — HTTP parameter pollution
6. `helmet()` — CSP, HSTS preload, COOP, CORP
7. `compression()`
8. `correlationId` — UUID-based request ID + response time
9. `requestLogger` — structured logging with winston
10. Rate limiters (per-route)
11. `notFoundHandler` — 404 catch-all
12. `errorHandler` — centralized error handling

## Payment Flow (SSLCommerz)

1. Frontend `POST /api/booking` → booking created as `Pending`
2. Frontend `POST /api/payment/init` → returns SSLCommerz gateway URL
3. User pays on SSLCommerz page
4. SSLCommerz POSTs `/api/payment/success/:bookingId/:tranId` → confirms booking, marks bike unavailable
5. Redirects to frontend `/invoice/:bookingId`
6. IPN handler also verifies via SSLCommerz validation API

Advance: 50% for ≤24h, 30% for >24h. `BACKEND_URL` and `FRONTEND_URL` control callback redirects.

## Deployment

### Backend (Render)
- `render.yaml` blueprint: `cd backend && npm install` (build), `node server.js` (start)
- Env vars: MONGODB_URI, JWT_SECRET, Cloudinary, SSLCommerz, BACKEND_URL, FRONTEND_URL

### Frontend (Vercel)
- `vercel.json` in `frontend/`: SPA catch-all rewrite + asset caching
- Env var: `VITE_API_URL=https://rent-bike-backend.onrender.com/api`

### Docker
- `docker-compose.yml`: backend + mongo:7 with health checks + persistent volume
- `backend/Dockerfile`: node:20-alpine, non-root user, healthcheck
