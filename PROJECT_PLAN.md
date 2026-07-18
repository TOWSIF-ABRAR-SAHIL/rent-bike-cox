# Project Plan: Rent Bike Cox's Bazar

Single source of truth for all remaining work. Each task is a checkbox. Work through phases in order.

---

## Phase 1 — Critical Bugs & Broken Integrations

- [x] **1.1 Add public bike listing endpoint**
- [x] **1.2 Add single bike detail endpoint**
- [x] **1.3 Home.jsx: Fetch real bikes**
- [x] **1.4 BikeDetails.jsx: Fetch real bike**
- [x] **1.5 Checkout.jsx: User-selectable duration**
- [x] **1.6 Fix payment amount inconsistency**
- [x] **1.7 Replace hardcoded localhost URLs**
- [x] **1.8 Persist global settings in DB**
- [x] **1.9 Add bike availability check before booking**

---

## Phase 2 — Missing Core Features

- [x] **2.1 Create AuthContext** — `frontend/src/context/AuthContext.jsx`
- [x] **2.2 Create ProtectedRoute wrapper** — `frontend/src/components/ProtectedRoute.jsx`
- [x] **2.3 Navbar reactivity** — Reads from AuthContext
- [x] **2.4 Admin: Verify/unverify bikes** — `PUT /admin/bikes/:id/verify`
- [x] **2.5 Admin: User verification** — `GET /admin/users`, `PUT /admin/users/:id/verify`
- [x] **2.6 Admin: Coupons management** — Full CRUD in `backend/models/Coupon.js`
- [x] **2.7 Booking cancellation** — `PUT /booking/:id/cancel`
- [x] **2.8 Package pricing in booking** — Select packages from settings
- [x] **2.9 Booking verification restriction** — Checks `user.isVerified` before booking

---

## Phase 3 — UI/UX Polish

- [x] **3.1 Checkout: Terms & Conditions checkbox**
- [x] **3.2 Toast notifications** — `frontend/src/components/Toast.jsx`
- [x] **3.3 Better loading states** — Spinner in Checkout, Invoice
- [x] **3.4 Payment failed/cancelled pages** — `/payment-failed`, `/payment-cancelled`
- [x] **3.5 Mobile responsive audit**
- [x] **3.6 Dead code cleanup** — Removed App.css, unused assets
- [x] **3.7 RenterDashboard: Availability toggle**

---

## Phase 4 — Production Deployment

- [ ] **4.1 Environment variables audit**
- [ ] **4.2 Backend URLs in env**
- [ ] **4.3 MongoDB Atlas**
- [ ] **4.4 Cloudinary account**
- [ ] **4.5 Local SSLCommerz testing**
- [ ] **4.6 SSLCommerz live mode**
- [ ] **4.7 SSL certificate**
- [ ] **4.8 Deploy backend**
- [ ] **4.9 Deploy frontend**
- [ ] **4.10 Final URL update**

---

## Phase 5 — Testing & QA

### Authentication
- [ ] 5.1 Register as User with valid NID + license images
- [ ] 5.2 Try registering without NID/license files
- [ ] 5.3 Login with valid credentials
- [ ] 5.4 Login with wrong password

### Fleet Management
- [ ] 5.5 Sign up as Renter, add bike with 3+ photos
- [ ] 5.6 Refresh Home page, verify new bike appears
- [ ] 5.7 Admin verifies bike

### Booking & Payment
- [ ] 5.8 Select bike, choose custom duration
- [ ] 5.9 Apply coupon
- [ ] 5.10 Verify T&C checkbox required
- [ ] 5.11 Complete SSLCommerz sandbox payment
- [ ] 5.12 Verify booking status Confirmed

### Invoice
- [ ] 5.13 Invoice shows customer details
- [ ] 5.14 Invoice shows rental details
- [ ] 5.15 Invoice includes fine policies
- [ ] 5.16 Invoice has signature lines
- [ ] 5.17 Print invoice layout

### Cancellation
- [ ] 5.18 Cancel a Pending booking
- [ ] 5.19 Verify bike becomes available

### Role Guards
- [ ] 5.20 Access admin as User
- [ ] 5.21 Access renter as User
- [ ] 5.22 Access checkout without login

### Mobile
- [ ] 5.23 Test responsive at 375px
- [ ] 5.24 Test responsive at 768px

---

## Phase 6 — Enhancements & Polish

### 6.1 Admin-Managed Vehicle Categories
- [x] Create `backend/models/Category.js` model (name, slug, isActive)
- [x] Add Category CRUD endpoints in `backend/controllers/dashboardController.js`
- [x] Add Category routes in `backend/routes/dashboard.js`
- [x] Update `Bike.category` from enum to ObjectId ref Category
- [x] Seed default categories on first load (Bike, Car, Microbus, SUV, Van)
- [x] Add "Categories" tab in `frontend/src/pages/AdminDashboard.jsx`
- [x] Update RenterDashboard category dropdown to fetch from API
- [x] Add category filter tabs on `frontend/src/pages/Home.jsx`
- [x] Add category filter to `getAvailableBikes` endpoint (query param)

### 6.2 Dedicated Policies Page
- [x] Create `frontend/src/pages/Policies.jsx` with full legal terms
- [x] Route: `/policies` (public)
- [x] Content: fine policies, accident procedures, legal complications, compensation, refund, petrol, insurance
- [x] Add Policies link in `frontend/src/components/Navbar.jsx`
- [x] Add "Read full policies" link in Checkout T&C section

### 6.3 Optional Video Upload for Bikes
- [x] Add `videoUrl` field to `backend/models/Bike.js`
- [x] Add optional video upload in `frontend/src/pages/RenterDashboard.jsx`
- [x] Show video player in `frontend/src/pages/BikeDetails.jsx` if video exists

### 6.4 Enhanced Default Packages
- [x] Add "Monthly" package to default seed in `backend/controllers/dashboardController.js`

### 6.5 Invoice Format Update
- [x] Add `destination` and `securityDeposit` fields to `backend/models/Booking.js`
- [x] Update `frontend/src/pages/Invoice.jsx` to match demo format (serial no, destination, security deposit)
- [x] Update Checkout.jsx to collect destination info

### 6.6 Search & Category Filter on Home
- [x] Add search bar (by model/brand) on `frontend/src/pages/Home.jsx`
- [x] Add debounced search input
- [x] Update `getAvailableBikes` to accept `search` and `category` query params

### 6.7 Security & Performance
- [x] Add `helmet` middleware in `backend/server.js`
- [x] Add `express-rate-limit` on auth routes
- [x] Add `compression` middleware in `backend/server.js`
- [x] Add React.lazy() route-based code splitting in `frontend/src/App.jsx`
- [x] Add `loading="lazy"` on bike images
- [x] Add database indexes on Bike, Booking, User models

---

## Phase 7 — UI/UX Redesign

- [x] **7.1 index.css** — Custom theme (indigo primary), glassmorphism utilities, gradient classes, card-hover, input-modern, btn-primary, skeleton, animations, print styles
- [x] **7.2 Navbar** — Fixed glass-dark navbar, mobile hamburger menu, backdrop blur
- [x] **7.3 Home** — Hero section with animated badge + heading, glass search bar, animated card grid with hover effects
- [x] **7.4 Login** — Full-page split layout with gradient hero background
- [x] **7.5 Signup** — Icon-adorned inputs, modern layout matching Login
- [x] **7.6 BikeDetails** — Image gallery with thumbnail selector, quick info cards, modern package display
- [x] **7.7 Checkout** — Modern layout with package selection cards, price breakdown, glass terms section
- [x] **7.8 Invoice** — Clean print-optimized layout with serial no, destination, security deposit
- [x] **7.9 PaymentFailed** — Gradient background, icon, suggestions
- [x] **7.10 PaymentCancelled** — Gradient background, retry link
- [x] **7.11 Policies** — 9-section icon cards with gradient backgrounds
- [x] **7.12 AdminDashboard** — Modern stat cards, tabbed navigation, rounded tables
- [x] **7.13 RenterDashboard** — Modern form layout, dynamic categories
- [x] **7.14 Lint + Build verification** — All pages compile clean

---

## Appendix: Environment Variables

### Backend (`backend/.env`)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentbike
JWT_SECRET=<random-secure-string>
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
SSLCOMMERZ_STORE_ID=<your-store-id>
SSLCOMMERZ_STORE_PASS=<your-store-password>
SSLCOMMERZ_IS_LIVE=false
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:5000/api
```
