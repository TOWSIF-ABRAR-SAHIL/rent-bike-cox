# Project Plan: Rent Bike Cox's Bazar

Single source of truth for all work. Each task is a checkbox. All completed phases marked [x].

**Live URLs:**
- Frontend: https://rent-bike-cox.vercel.app
- Backend: https://rent-bike-backend.onrender.com

---

## Phase 1 — Critical Bugs & Integrations ✅

- [x] **1.1** Public bike listing endpoint
- [x] **1.2** Single bike detail endpoint
- [x] **1.3** Home.jsx: Fetch real bikes
- [x] **1.4** BikeDetails.jsx: Fetch real bike
- [x] **1.5** Checkout.jsx: User-selectable duration
- [x] **1.6** Fix payment amount inconsistency
- [x] **1.7** Replace hardcoded localhost URLs
- [x] **1.8** Persist global settings in DB
- [x] **1.9** Bike availability check before booking

---

## Phase 2 — Core Features ✅

- [x] **2.1** AuthContext
- [x] **2.2** ProtectedRoute wrapper
- [x] **2.3** Navbar reactivity
- [x] **2.4** Admin: Verify/unverify bikes
- [x] **2.5** Admin: User verification
- [x] **2.6** Admin: Coupons management
- [x] **2.7** Booking cancellation
- [x] **2.8** Package pricing in booking

---

## Phase 3 — UI/UX Redesign ✅

- [x] **3.1** Design system (Dark + Gradient theme)
- [x] **3.2** Layout (Navbar, Footer)
- [x] **3.3** Auth pages redesign
- [x] **3.4** Home page redesign
- [x] **3.5** BikeDetails redesign
- [x] **3.6** Checkout + Payment redesign
- [x] **3.7** Invoice redesign
- [x] **3.8** Dashboard redesign
- [x] **3.9** Responsive breakpoints

---

## Phase 4 — Tier-Based Pricing ✅

- [x] **4.1** Tier pricing model on Bike
- [x] **4.2** Pricing preview endpoint
- [x] **4.3** Checkout sync (selected tier → booking)
- [x] **4.4** Renter tier management UI
- [x] **4.5** Admin can edit any renter's tiers

---

## Phase 5 — Enterprise Payment (153 tasks) ✅

- [x] **5.1** State machine (Booking lifecycle)
- [x] **5.2** PaymentIntent model + state machine
- [x] **5.3** Refund model + state machine
- [x] **5.4** Idempotency key system
- [x] **5.5** Circuit breaker for payment gateway
- [x] **5.6** Audit logging (AuditLog model)
- [x] **5.7** Fraud detection (FraudEvent model)
- [x] **5.8** Ledger entries
- [x] **5.9** Payout system
- [x] **5.10** Safe arithmetic (Decimal.js)
- [x] **5.11** Timezone handling (Asia/Dhaka)
- [x] **5.12** Booking lock (MongoDB transactions)
- [x] **5.13** Email service (Nodemailer)
- [x] **5.14** Cancelled booking notifications
- [x] **5.15** IPN verification

---

## Phase 6 — Security Hardening (200 tasks) ✅

- [x] Input validation, auth security
- [x] API security, file upload hardening
- [x] Rate limiting enhancement
- [x] Frontend security (XSS prevention)
- [x] Encryption, monitoring
- [x] Compliance (data export, deletion, retention)

---

## Phase 7 — Fleet Management (190 tasks) ✅

- [x] **7.1** Zone model + CRUD + API
- [x] **7.2** Advanced search (filters, autocomplete, results)
- [x] **7.3** Availability system (calendar, range queries)
- [x] **7.4** Analytics dashboard (revenue, trends, categories, top bikes, customers)
- [x] **7.5** Maintenance system (logs, notifications, schedule, stats)
- [x] **7.6** Bulk operations (status, zone, maintenance, export, delete)
- [x] **7.7** Vehicle history (timeline, filters, stats, export)
- [x] **7.8** Reviews (create, respond, delete)
- [x] **7.9** Seasonal pricing (peak/off-peak/holiday, priority matching)
- [x] **7.10** Vehicle documents (upload, verify, expiry tracking)
- [x] **7.11** Notifications (in-app, bell, preferences)
- [x] **7.12** Notification preferences (email/push/inApp toggles)

---

## Phase 8 — Production Readiness (218 tasks) ✅

- [x] **8.1** Request logger + correlation IDs
- [x] **8.2** Centralized error handler
- [x] **8.3** MemoryCache with TTL
- [x] **8.4** Graceful shutdown (SIGTERM/SIGINT)
- [x] **8.5** Health info endpoint (memory, uptime, PID)
- [x] **8.6** 76 .lean() additions (query optimization)
- [x] **8.7** 15 compound database indexes
- [x] **8.8** 3 new rate limiters (search, dashboard, fleet)
- [x] **8.9** Cache integration (19 operations)
- [x] **8.10** Frontend SEO (meta tags, robots, sitemap, JSON-LD)
- [x] **8.11** Error boundaries + PageSpinner
- [x] **8.12** Docker + deployment config
- [x] **8.13** CI/CD (GitHub Actions)
- [x] **8.14** Console.log elimination → winston
- [x] **8.15** Final smoke test (18/18 endpoints, 0 warnings)

---

## Phase 9 — Deployment ✅

- [x] **9.1** render.yaml updated (env vars aligned)
- [x] **9.2** vercel.json moved to frontend/ (SPA rewrites fix)
- [x] **9.3** Backend deployed to Render
- [x] **9.4** Frontend deployed to Vercel
- [x] **9.5** All 3 role logins verified
- [x] **9.6** All API endpoints verified
- [x] **9.7** All frontend pages verified (200 status)

---

## Phase 10 — QA Audit & Quality Push ✅

- [x] **10.1** 140 QA audit bugs fixed
- [x] **10.2** Vitest test suites (131 backend + 26 frontend = 157 total)
- [x] **10.3** Sentry error tracking (lazy-loaded)
- [x] **10.4** API retry with exponential backoff
- [x] **10.5** PageErrorBoundary per-route
- [x] **10.6** CI/CD pipelines fixed

---

## Phase 11 — Post-Deployment Enhancements ✅

### Phase 11: Expanded Test Coverage
- [x] Backend: 131 tests across 10 files
- [x] Frontend: 26 tests (axios, Toast, ProtectedRoute, ErrorBoundary, PageErrorBoundary)

### Phase 13: Maps & Location Features
- [x] Leaflet + OpenStreetMap (react-leaflet)
- [x] ZoneMap component, ZoneExplorer page
- [x] 8 Cox's Bazar zones seeded
- [x] Vehicle zone map on BikeDetails

### Phase 14: Route Planner + Home Zones
- [x] RoutePlanner component (Haversine distance, Google Maps link)
- [x] "Explore Zones" section on Home page

### Phase 15: Vehicle Comparison + Wishlist
- [x] CompareContext (max 3), CompareBar, CompareVehicles page
- [x] WishlistContext (localStorage), Wishlist page

### Phase 16: Hero Carousel + Ratings + Recommendations
- [x] Auto-rotating hero carousel (5s)
- [x] Star ratings on Home bike cards
- [x] "You Might Also Like" on BikeDetails

### Phase 17: Enhanced Search + Bottom Nav + WhatsApp
- [x] Price range quick buttons, filter pills
- [x] BottomNav.jsx (mobile)
- [x] WhatsAppButton.jsx

### Phase 18: Lightbox + Rebook + Testimonials
- [x] Lightbox.jsx (fullscreen gallery, keyboard nav, zoom)
- [x] "Rebook This Vehicle" on completed bookings
- [x] Testimonials section on Home

### Phase 19: Admin Analytics Upgrade
- [x] Fixed `$totalAmount` → `$totalPrice` bug (analytics was returning 0)
- [x] Fixed `days` query param bug (time period selector was broken)
- [x] New: Zone analytics, rental duration, financial summary endpoints
- [x] New: ZoneAnalytics, RentalDurationChart, FinancialSummary, HourlyDistribution components
- [x] Improved: RevenueChart, BookingTrendChart, CategoryPerformance, TopBikes, CustomerInsights
- [x] AnalyticsDashboard rewrite (shared API, 9 components, refresh)
- [x] Admin Dashboard "View Full Analytics" link

### Phase 20: Admin Dashboard Architecture Fix
- [x] Fixed `fetchDashboard` caching — admin stats update after bike/category/policy edits
- [x] TabErrorBoundary — isolates tab crashes so one broken tab doesn't break whole dashboard
- [x] Scrollable tab content (overflow-x-auto)
- [x] Light theme contrast fix on Reports tab

### Phase 21: GPS Live Tracking
- [x] LocationHistory model (GeoJSON Point, speed, heading, battery, accuracy, 7-day TTL)
- [x] trackingController (POST IoT, GET live, GET stats, GET history, GET by bike)
- [x] LiveFleetMap (Leaflet map, category icons, trails, clustering, telemetry panel, filter)
- [x] seedTracking.js — realistic GPS trail data for all demo bikes
- [x] IOT_API_KEY env var for ESP32/GSM devices
- [x] Bike model: added currentLocation (GeoJSON), currentRenter, lastActive

### Phase 22: Reports Overhaul
- [x] 18 report types (was 8) — renter-earnings, vehicle-utilization, category-performance, zone-analytics, daily-summary, monthly-financial, tax-vat, customer-insights, peak-hours, refunds
- [x] 4 formats: CSV, JSON, PDF (pdfkit), XLSX (xlsx)
- [x] pdfGenerator.js — A4 PDF with header, styled table, dynamic row height + truncation
- [x] xlsxGenerator.js — Excel workbook with auto-width columns
- [x] ReportHistory model (reportType, format, dateRange, fileSize, rowCount)
- [x] Report history API (GET last 10, DELETE)
- [x] ReportsTab rewrite — 18 reports in 4 color-coded categories, format dropdown, preview modal, history section
- [x] Total: 157 tests (131 backend + 26 frontend)

---

## Remaining / Future Work

| Feature | Priority | Notes |
|---------|----------|-------|
| WebSocket real-time updates | Medium | Polling works for now |
| SMS notifications | Low | No SMS service |
| httpOnly cookie auth flow | Medium | Would replace localStorage |
| Multi-image upload reorder | Low | Static gallery order |
| Vehicle specifications form | Low | Text description only |
| Bengali (bn) i18n | Low | All UI in English |
| 2FA authentication | Low | Acceptable for current scale |
