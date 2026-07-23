# Phases — Implementation Status

## Completed (Phase A through D9)

### Phase A: Project Setup
- [x] Monorepo structure (backend + frontend)
- [x] Express 5 backend with MongoDB
- [x] React 19 + Vite 8 frontend
- [x] Tailwind CSS 4 configuration
- [x] Git hooks (commit-msg convention enforcer)
- [x] ESLint strict rules

### Phase B: Core Models & Auth
- [x] User model (NID, license, isVerified, role enum)
- [x] Bike model (images, category ref, renter ref, pricePerHour)
- [x] Booking model (dates, status, invoiceNumber, tranId, advanceAmount)
- [x] Counter model (auto-increment RBC-YYYY-XXXXXX)
- [x] Category model (slug, isActive)
- [x] Settings model (singleton, basePricePerHour, packages)
- [x] Policy model (title, content, type, sortOrder)
- [x] Coupon model (unique code, discountPercent, expiryDate)
- [x] JWT auth (register/login, 1-day expiry)
- [x] Password hashing (bcryptjs, salt 10)
- [x] Role-based access (Admin/Renter/User)

### Phase C: Frontend Pages
- [x] Home (hero, stats bar, category filter, bike grid)
- [x] BikeDetails (gallery, specs, booking CTA)
- [x] Checkout (booking form + SSLCommerz payment)
- [x] Invoice (printable, invoice number)
- [x] AdminDashboard (users, bikes, bookings, settings, categories, policies, coupons)
- [x] RenterDashboard (bikes, bookings, availability toggle)
- [x] Login / Signup (NID + license upload)
- [x] PolicyList (public policies)
- [x] PaymentFailed / PaymentCancelled
- [x] 404 page
- [x] ProtectedRoute component (role gating)

### Phase D: UI/UX Redesign (Dark + Gradient)
- [x] D1: Design system (index.css — colors, glass, gradients, animations)
- [x] D2: Layout (Navbar, Footer)
- [x] D3: Auth pages (Login, Signup)
- [x] D4: Home page (hero, stats, categories, bike grid)
- [x] D5: BikeDetails page
- [x] D6: Checkout + Payment pages
- [x] D7: Invoice page
- [x] D8: Admin + Renter dashboards
- [x] D9: Responsive breakpoints

### Phase E: Security Hardening
- [x] Mass assignment fix (register: forced role='User')
- [x] Confirm payment ownership check
- [x] Settings update whitelist (basePricePerHour, packages only)
- [x] Policy update whitelist (title, content, type, sortOrder, isActive)
- [x] ReDoS prevention (regex escape in search)
- [x] Seed endpoint guarded by NODE_ENV !== production
- [x] CORS exact-match (no loose includes)
- [x] Body size limits (1mb)
- [x] File upload limits (5MB, JPG/JPEG/PNG only)
- [x] Error message sanitization (no leaks)
- [x] Input validation (registration fields, pricePerHour range)
- [x] Rate limiting (20 req/15min on auth routes)

### Phase F: Operational
- [x] Delete bike API (Admin)
- [x] Category cleanup (Microbus/SUV/Van removed)
- [x] Duplicate bike cleanup (8 → 4)
- [x] Real vehicle images (TVS Access 125, Honda Dio 110, TVS Jupiter 110)
- [x] Image fallback (onError → placeholder)
- [x] Category card overlap fix
- [x] Jeep icon fix (Tent → Truck)

## Partially Implemented

### Database Seeding
- `seedDemo.js` — creates renter + user + categories + 10 demo bikes (but runs process.exit, not reusable)
- `seedAdmin.js` — creates admin only
- `GET /api/seed-temp` — full seed (dev only)
- **TODO:** No single "seed all" script that works reliably

### Booking System
- Booking creation, payment flow, cancellation — working
- **TODO:** No booking status lifecycle (Pending → Confirmed → Active → Completed/Cancelled)
- **TODO:** No fine calculation logic (mentioned in RULES.md but not implemented)
- **TODO:** No date conflict checking (same bike could be double-booked)

### Vehicle Management
- CRUD for bikes, categories — working
- **TODO:** No vehicle photo gallery ordering
- **TODO:** No vehicle specifications (engine, mileage, etc.) beyond description

## Not Started

| Feature | Priority | Notes |
|---------|----------|-------|
| Rating/review system | High | Mentioned in REDESIGN_PLAN.md |
| Real-time availability (WebSocket) | Medium | User chose polling instead |
| Email notifications | Medium | No email service configured |
| SMS notifications | Low | No SMS service |
| Booking history/export | Low | Admin has basic list view |
| Multi-image upload reorder | Low | Static gallery order |
| Vehicle specifications form | Low | Only text description |
| Dashboard analytics/charts | Low | Basic counts only |

## Known Bugs / Gaps

| Issue | Location | Impact |
|-------|----------|--------|
| `role` has `default: 'User'` but no `enum` constraint | `backend/models/User.js:39` | Any string could be set as role |
| `categoryId` cast to ObjectId but `create` route uses `express.urlencoded()` | `dashboardController.js:267` | Form data may not parse correctly |
| `user` variable cast but never used in `getBookingDetails` | `bookingController.js:463` | Dead code |
| No date overlap check for bookings | `bookingController.js:createBooking` | Double-booking possible |
| `seedDemo.js` calls `process.exit()` — not reusable | `scripts/seedDemo.js` | Must restart after seeding |
| No test suites | `backend/package.json` | `npm test` is a stub |
| Token always from localStorage, no httpOnly cookie flow | `frontend/src/api/axios.js` | XSS vulnerability |
| No booking cancellation logic (RULES.md mentions it) | — | Feature gap |
