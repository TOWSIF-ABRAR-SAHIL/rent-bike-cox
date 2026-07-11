# Project Plan: Rent Bike Cox's Bazar

Single source of truth for all remaining work. Each task is a checkbox. Work through phases in order.

---

## Phase 1 — Critical Bugs & Broken Integrations

These things are broken or non-functional right now.

- [ ] **1.1 Add public bike listing endpoint**
  - File: `backend/controllers/dashboardController.js`, `backend/routes/dashboard.js`
  - Add `GET /api/dashboard/bikes/available` — returns all bikes with `availability: true` and populated renter name. No auth required.

- [ ] **1.2 Add single bike detail endpoint**
  - File: `backend/controllers/dashboardController.js`, `backend/routes/dashboard.js`
  - Add `GET /api/dashboard/bikes/:id` — returns a single bike with populated renter (name only).

- [ ] **1.3 Home.jsx: Fetch real bikes**
  - File: `frontend/src/pages/Home.jsx`
  - Replace mock data with `api.get('/dashboard/bikes/available')`. Show empty state ("No bikes available yet") when list is empty.

- [ ] **1.4 BikeDetails.jsx: Fetch real bike**
  - File: `frontend/src/pages/BikeDetails.jsx`
  - Replace mock data with `api.get('/dashboard/bikes/${id}')`. Fetch packages from global settings (`GET /api/dashboard/settings`).

- [ ] **1.5 Checkout.jsx: User-selectable duration**
  - File: `frontend/src/pages/Checkout.jsx`
  - Add date/time pickers for `startTime` and `endTime` instead of hardcoding 5 hours. Show duration breakdown (hours x rate = total).

- [ ] **1.6 Fix payment amount inconsistency**
  - File: `backend/controllers/paymentController.js`
  - Currently hardcodes `totalPrice * 0.5`. Should match the `minAdvance` logic from `bookingController` (50% for <=24h, 30% for >24h). Store `minAdvance` on the Booking model or recalculate.

- [ ] **1.7 Replace hardcoded localhost URLs**
  - File: `backend/controllers/paymentController.js`
  - Use `process.env.BACKEND_URL` and `process.env.FRONTEND_URL` for all success/fail/cancel redirect URLs. Add these to `backend/.env.example`.

- [ ] **1.8 Persist global settings in DB**
  - Files: New `backend/models/Settings.js`, `backend/controllers/dashboardController.js`
  - Replace in-memory `globalSettings` object with a `Settings` Mongoose model (singleton: one document). Seed defaults (`basePricePerHour: 200`, packages array) on first read if none exist.

- [ ] **1.9 Add bike availability check before booking**
  - File: `backend/controllers/bookingController.js`
  - Before creating a booking, verify `bike.availability === true`. Return 409 if already booked.

---

## Phase 2 — Missing Core Features

These features are required by the business rules but don't exist yet.

- [ ] **2.1 Create AuthContext**
  - File: New `frontend/src/context/AuthContext.jsx`, update `frontend/src/App.jsx`
  - React Context storing token + user (decoded from JWT). Wrap app in `<AuthProvider>`. All components read from context instead of raw `localStorage`.

- [ ] **2.2 Create ProtectedRoute wrapper**
  - File: New `frontend/src/components/ProtectedRoute.jsx`, update `frontend/src/App.jsx`
  - If no token, redirect to `/login`. Wrap routes: `/checkout`, `/invoice`, `/renter-dashboard`, `/admin-dashboard`. Add role check for admin-only routes.

- [ ] **2.3 Navbar reactivity**
  - File: `frontend/src/components/Navbar.jsx`
  - Read auth state from `AuthContext` instead of `localStorage`. Navbar auto-updates on login/logout without page reload.

- [ ] **2.4 Admin: Verify/unverify bikes**
  - Files: `backend/models/Bike.js` (add `isVerified` field), `backend/controllers/dashboardController.js`, `backend/routes/dashboard.js`, `frontend/src/pages/AdminDashboard.jsx`
  - Add `PUT /api/dashboard/admin/bikes/:id/verify` — toggles `isVerified`. Show verification status in admin table. Only verified bikes appear in public listing (`GET /bikes/available`).

- [ ] **2.5 Admin: User verification**
  - Files: `backend/models/User.js` (add `isVerified` field), `backend/controllers/dashboardController.js`, `backend/routes/dashboard.js`, `frontend/src/pages/AdminDashboard.jsx`
  - Add `GET /api/dashboard/admin/users` and `PUT /api/dashboard/admin/users/:id/verify`. Users must be verified before they can book.

- [ ] **2.6 Admin: Coupons management**
  - Files: New `backend/models/Coupon.js`, `backend/controllers/couponController.js`, `backend/routes/coupon.js`, `frontend/src/pages/AdminDashboard.jsx`
  - Backend: CRUD for coupons (code, discount %, active flag). Frontend: table + add/edit form in the Coupons tab.

- [ ] **2.7 Booking cancellation**
  - Files: `backend/controllers/bookingController.js`, `backend/routes/booking.js`, `frontend/src/pages/Invoice.jsx`
  - Add `PUT /api/booking/:id/cancel` — sets status to Cancelled, re-enables bike availability. Add cancel button on invoice page (only if status is Pending or Confirmed).

- [ ] **2.8 Package pricing in booking**
  - Files: `backend/controllers/bookingController.js`, `frontend/src/pages/Checkout.jsx`
  - Allow selecting a package (1 Day, 2 Days, 1 Week) instead of only hourly. Backend calculates total from package price. Fetch available packages from global settings.

- [ ] **2.9 Booking verification restriction**
  - File: `backend/controllers/bookingController.js`
  - Before creating a booking, check that the user's NID and license are verified (`user.isVerified === true`). Return 403 if not.

---

## Phase 3 — UI/UX Polish

- [ ] **3.1 Checkout: Terms & Conditions checkbox**
  - File: `frontend/src/pages/Checkout.jsx`
  - Add "I agree to Terms" checkbox listing: petrol cost, 1,000 TK sand fine, 2,000 TK helmet fine, 5,000 TK boundary fine, damage liability. Disable "Proceed to Payment" until checked.

- [ ] **3.2 Toast notifications**
  - Files: New `frontend/src/components/Toast.jsx`, update all pages with `alert()`
  - Replace every `alert()` call with a simple toast component (success/error variants, auto-dismiss after 3s).

- [ ] **3.3 Better loading states**
  - Files: All frontend pages
  - Replace "Loading..." text with a spinner component. Add skeleton loaders for bike cards on Home page.

- [ ] **3.4 Payment failed/cancelled pages**
  - Files: New `frontend/src/pages/PaymentFailed.jsx`, `frontend/src/pages/PaymentCancelled.jsx`, update `frontend/src/App.jsx`
  - Add routes `/payment-failed` and `/payment-cancelled`. Show friendly message with "Try Again" link back to home.

- [ ] **3.5 Mobile responsive audit**
  - Files: All frontend components
  - Test at 320px, 375px, 768px, 1024px widths. Fix overflow on tables, form fields, bike cards. Ensure touch-friendly tap targets (min 44px).

- [ ] **3.6 Dead code cleanup**
  - Files: `frontend/src/App.css`, `frontend/src/assets/`
  - Delete `App.css` (unused Vite boilerplate). Delete unused assets (`hero.png`, `vite.svg`, `react.svg`).

- [ ] **3.7 RenterDashboard: Availability toggle**
  - Files: `frontend/src/pages/RenterDashboard.jsx`, `backend/controllers/dashboardController.js`, `backend/routes/dashboard.js`
  - Add `PUT /api/dashboard/bikes/:id/availability` to toggle availability (for when a bike is returned). Add toggle button in renter dashboard.

---

## Phase 4 — Production Deployment

- [ ] **4.1 Environment variables audit**
  - Ensure every hardcoded value in code uses env vars. Update both `.env.example` files with all required variables.

- [ ] **4.2 Backend URLs in env**
  - Add `BACKEND_URL` and `FRONTEND_URL` to `backend/.env`. Update `paymentController.js` to use them for all redirect URLs.

- [ ] **4.3 MongoDB Atlas**
  - Create cluster, whitelist IPs, get connection string. Set `MONGODB_URI` in `backend/.env`.

- [ ] **4.4 Cloudinary account**
  - Create account at cloudinary.com. Get cloud name, API key, API secret. Set `CLOUDINARY_*` env vars.

- [ ] **4.5 Local SSLCommerz testing**
  - Run `ngrok http 5000` (or Cloudflare Tunnel). Set `BACKEND_URL` to the tunnel URL. Test full payment flow end-to-end.

- [ ] **4.6 SSLCommerz live mode**
  - Switch `SSLCOMMERZ_IS_LIVE=true`. Update store credentials to production values.

- [ ] **4.7 SSL certificate**
  - Set up HTTPS on production server. Required for SSLCommerz live callbacks.

- [ ] **4.8 Deploy backend**
  - Deploy to Render or Railway. Add all env vars to provider dashboard. Ensure `PORT` env var is respected.

- [ ] **4.9 Deploy frontend**
  - Deploy to Vercel. Set `VITE_API_URL` to production backend URL (e.g., `https://your-app.onrender.com/api`).

- [ ] **4.10 Final URL update**
  - After deployment, update success/fail/cancel URLs in backend env to point to production frontend domain.

---

## Phase 5 — Testing & QA

Run these after each phase is complete.

### Authentication
- [ ] 5.1 Register as User with valid NID + license images. Verify token stored, navbar shows Logout.
- [ ] 5.2 Try registering without NID/license files. Should fail with error.
- [ ] 5.3 Login with valid credentials. Verify redirect to home.
- [ ] 5.4 Login with wrong password. Should show error.

### Fleet Management
- [ ] 5.5 Sign up as Renter, add bike with 3+ photos. Verify it appears in "My Bikes".
- [ ] 5.6 Refresh Home page. Verify new bike appears (if verified by admin).
- [ ] 5.7 Admin verifies bike. Confirm it shows on Home page with "Active" status.

### Booking & Payment
- [ ] 5.8 Select bike, choose custom duration. Verify price = hours x rate.
- [ ] 5.9 Apply coupon `WELCOME10`. Verify 10% discount on total.
- [ ] 5.10 Verify "Proceed to Payment" is disabled until Terms checkbox is checked.
- [ ] 5.11 Complete SSLCommerz sandbox payment. Verify redirect to invoice page.
- [ ] 5.12 Verify booking status is "Confirmed" and bike is marked unavailable.

### Invoice
- [ ] 5.13 Invoice shows: customer name, NID, license, phone, address.
- [ ] 5.14 Invoice shows: bike model, brand, start/end times, total, advance paid, due.
- [ ] 5.15 Invoice includes all 5 fine policies with correct amounts.
- [ ] 5.16 Invoice has Owner and Renter signature lines.
- [ ] 5.17 Print invoice. Verify clean layout (no navbar, no buttons).

### Cancellation
- [ ] 5.18 Cancel a Pending booking. Verify status changes to Cancelled.
- [ ] 5.19 After cancellation, verify bike becomes available again on Home page.

### Role Guards
- [ ] 5.20 Access `/admin-dashboard` as User role. Should be blocked/redirected.
- [ ] 5.21 Access `/renter-dashboard` as User role. Should be blocked/redirected.
- [ ] 5.22 Access `/checkout` without login. Should redirect to `/login`.

### Mobile
- [ ] 5.23 Test Home, BikeDetails, Checkout, Invoice on 375px width. No horizontal scroll.
- [ ] 5.24 Test RenterDashboard and AdminDashboard on tablet (768px).

---

## Appendix: Environment Variables

### Backend (`backend/.env`)

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentbike
JWT_SECRET=<random-secure-string>

# Cloudinary
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# SSLCommerz
SSLCOMMERZ_STORE_ID=<your-store-id>
SSLCOMMERZ_STORE_PASS=<your-store-password>
SSLCOMMERZ_IS_LIVE=false

# URLs (use ngrok tunnel for local testing)
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:5000/api
```
