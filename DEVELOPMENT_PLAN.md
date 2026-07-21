# Rent Bike Cox's Bazar — Development Plan

Complete guide for building, learning, and scaling this project.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Current Status](#2-current-status)
3. [Phase 1 — Foundation Fixes](#3-phase-1--foundation-fixes)
4. [Phase 2 — Core Features](#4-phase-2--core-features)
5. [Phase 3 — UI/UX Polish](#5-phase-3--uiux-polish)
6. [Phase 4 — Production Deployment](#6-phase-4--production-deployment)
7. [Phase 5 — Testing & QA](#7-phase-5--testing--qa)
8. [Scalability Roadmap](#8-scalability-roadmap)
9. [Learning Path](#9-learning-path)
10. [Commit Rules](#10-commit-rules)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB running locally or MongoDB Atlas account
- Cloudinary account (free tier works)
- SSLCommerz sandbox account
- Git configured with your GitHub account

### Step-by-step Setup

```bash
# 1. Clone the repo
git clone https://github.com/zaheen4/rent-bike-cox.git
cd rent-bike-cox

# 2. Backend setup
cd backend
cp .env.example .env        # Edit this file with your credentials
npm install
node scripts/seedAdmin.js    # Creates admin@rentbikecox.com / admin123
npm run dev                  # Runs on http://localhost:5000

# 3. Frontend setup (new terminal)
cd frontend
cp .env.example .env         # Edit VITE_API_URL if needed
npm install
npm run dev                  # Runs on http://localhost:5173
```

### Environment Variables

#### Backend `.env`

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/rentbike
JWT_SECRET=your-random-secret-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
SSLCOMMERZ_STORE_ID=your-store-id
SSLCOMMERZ_STORE_PASS=your-store-password
SSLCOMMERZ_IS_LIVE=false
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

#### Frontend `.env`

```
VITE_API_URL=http://localhost:5000/api
```

---

## 2. Current Status

### What's Built (Working)

| Component | Status |
|-----------|--------|
| Auth (register/login) | Done |
| JWT middleware | Done |
| Bike CRUD (add/list/detail) | Done |
| Booking creation + price calc | Done |
| SSLCommerz payment integration | Done |
| Settings model (singleton) | Done |
| Cloudinary file uploads | Done |
| Home page (real API data) | Done |
| BikeDetails page | Done |
| Checkout with datetime pickers | Done |
| Invoice page (printable) | Done |
| Admin dashboard (basic) | Done |
| Renter dashboard (add bikes) | Done |

### What's Missing

| Feature | Priority | Status |
|---------|----------|--------|
| AuthContext (React Context for auth) | High | ✅ Done |
| Protected routes (role-based) | High | ✅ Done |
| Navbar reactivity (login/logout state) | High | ✅ Done |
| Admin bike verification toggle | High | ✅ Done |
| Admin user verification | Medium | ✅ Done |
| Coupon system (model + CRUD + UI) | Medium | ✅ Done |
| Booking cancellation | Medium | ✅ Done |
| Package pricing in checkout | Medium | ✅ Done |
| Booking verification restriction | Medium | ✅ Done |
| T&C checkbox on checkout | Medium | ✅ Done |
| Toast notifications (replace alert()) | Medium | ✅ Done |
| Loading spinners | Medium | ✅ Done |
| Payment failed/cancelled pages | Low | ✅ Done |
| Mobile responsive audit | Low | ✅ Done |
| Dead code cleanup | Low | ✅ Done |
| Admin-managed vehicle categories | High | 🔲 Phase 6 |
| Dedicated /policies page | High | 🔲 Phase 6 |
| Optional video upload for bikes | Medium | 🔲 Phase 6 |
| Enhanced default packages (Monthly) | Medium | 🔲 Phase 6 |
| Invoice format update | High | 🔲 Phase 6 |
| Search + category filter on Home | High | 🔲 Phase 6 |
| Security & performance hardening | Medium | 🔲 Phase 6 |

---

## 3. Phase 1 — Foundation Fixes

These are already mostly done in the current code. Verify each:

### 1.1 Public bike listing endpoint
- File: `backend/controllers/dashboardController.js`
- Endpoint: `GET /api/dashboard/bikes/available`
- Check: Returns bikes with `availability: true` AND `isVerified: true`

### 1.2 Single bike detail endpoint
- File: `backend/controllers/dashboardController.js`
- Endpoint: `GET /api/dashboard/bikes/:id`
- Check: Returns bike with populated renter name

### 1.3 Home.jsx fetches real bikes
- File: `frontend/src/pages/Home.jsx`
- Check: Uses `api.get('/dashboard/bikes/available')`, not mock data

### 1.4 BikeDetails.jsx fetches real bike
- File: `frontend/src/pages/BikeDetails.jsx`
- Check: Uses `api.get('/dashboard/bikes/${id}')`, fetches settings for packages

### 1.5 Checkout duration picker
- File: `frontend/src/pages/Checkout.jsx`
- Check: Has datetime-local pickers, calculates hours and price

### 1.6 Fix payment amount
- File: `backend/controllers/paymentController.js`
- Check: Uses same 50%/30% logic as bookingController

### 1.7 Replace hardcoded URLs
- File: `backend/controllers/paymentController.js`
- Check: Uses `process.env.BACKEND_URL` and `process.env.FRONTEND_URL`

### 1.8 Settings in DB
- File: `backend/models/Settings.js`
- Check: Mongoose model exists, seeds defaults on first read

### 1.9 Bike availability check
- File: `backend/controllers/bookingController.js`
- Check: Returns 409 if bike already booked

**Action: Test each endpoint and page. Mark as verified or fix issues.**

---

## 4. Phase 2 — Core Features

### Task 2.1: Create AuthContext

**Goal:** Store auth state (token + user) in React Context instead of raw localStorage.

**Files to create:**
- `frontend/src/context/AuthContext.jsx`

**Files to update:**
- `frontend/src/App.jsx` (wrap in `<AuthProvider>`)
- `frontend/src/components/Navbar.jsx` (read from context)
- `frontend/src/components/Login.jsx` (update token storage)
- `frontend/src/components/Signup.jsx` (update token storage)

**Implementation:**

```jsx
// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUser(decoded);
      } catch {
        localStorage.removeItem('token');
        setToken(null);
      }
    }
  }, [token]);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Why this matters:** Centralized auth state. Navbar updates instantly on login/logout without page reload.

---

### Task 2.2: Protected Routes

**Goal:** Redirect unauthenticated users to `/login`. Block wrong roles.

**Files to create:**
- `frontend/src/components/ProtectedRoute.jsx`

**Files to update:**
- `frontend/src/App.jsx` (wrap routes)

**Implementation:**

```jsx
// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, token } = useAuth();

  if (!token) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return children;
}
```

**Usage in App.jsx:**

```jsx
<ProtectedRoute roles={['User', 'Renter', 'Admin']}>
  <Checkout />
</ProtectedRoute>

<ProtectedRoute roles={['Admin']}>
  <AdminDashboard />
</ProtectedRoute>
```

---

### Task 2.3: Navbar Reactivity

**Goal:** Navbar reads from AuthContext, updates on login/logout.

**File:** `frontend/src/components/Navbar.jsx`

**Changes:**
- Replace `localStorage.getItem('token')` with `useAuth()`
- Use `logout()` from context instead of manual localStorage clear

---

### Task 2.4: Admin Bike Verification

**Goal:** Admin can toggle bike verification status. Only verified bikes appear publicly.

**Backend changes:**
- `backend/routes/dashboard.js` — Add: `PUT /admin/bikes/:id/verify`
- `backend/controllers/dashboardController.js` — Add: `toggleBikeVerification` handler

**Frontend changes:**
- `frontend/src/pages/AdminDashboard.jsx` — Add verify/unverify button in bikes table

---

### Task 2.5: Admin User Verification

**Goal:** Admin can verify users (NID + license checked).

**Backend changes:**
- `backend/models/User.js` — Add: `isVerified: Boolean` field
- `backend/routes/dashboard.js` — Add: `GET /admin/users`, `PUT /admin/users/:id/verify`
- `backend/controllers/dashboardController.js` — Add handlers

**Frontend changes:**
- `frontend/src/pages/AdminDashboard.jsx` — Add Users tab with verify button

---

### Task 2.6: Coupon System

**Goal:** Admin can create/edit/delete coupons. Users can apply at checkout.

**New files:**
- `backend/models/Coupon.js`
- `backend/controllers/couponController.js`
- `backend/routes/coupon.js`

**Files to update:**
- `backend/server.js` (mount coupon routes)
- `frontend/src/pages/Checkout.jsx` (apply coupon)
- `frontend/src/pages/AdminDashboard.jsx` (coupon management)

**Coupon model:**

```js
const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountPercent: { type: Number, required: true, min: 1, max: 100 },
  isActive: { type: Boolean, default: true },
  maxUses: { type: Number, default: 0 },      // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  expiresAt: Date,
}, { timestamps: true });
```

---

### Task 2.7: Booking Cancellation

**Goal:** Users can cancel Pending/Confirmed bookings. Bike becomes available again.

**Backend:**
- `backend/controllers/bookingController.js` — Add: `cancelBooking` handler
- `backend/routes/booking.js` — Add: `PUT /:id/cancel`

**Frontend:**
- `frontend/src/pages/Invoice.jsx` — Add cancel button (only if status is Pending or Confirmed)

---

### Task 2.8: Package Pricing

**Goal:** Allow booking by packages (1 Day, 2 Days, 1 Week) instead of only hourly.

**Files:**
- `backend/controllers/bookingController.js` — Handle package selection
- `frontend/src/pages/Checkout.jsx` — Show package options from settings

---

### Task 2.9: Booking Verification Restriction

**Goal:** Only verified users can book bikes.

**File:** `backend/controllers/bookingController.js`

**Add check before creating booking:**

```js
const user = await User.findById(req.user.id);
if (!user.isVerified) {
  return res.status(403).json({ message: 'Account not verified. Upload NID and license first.' });
}
```

---

## 5. Phase 3 — UI/UX Polish

### 3.1 Terms & Conditions Checkbox (Checkout.jsx)
Add checkbox listing fine policies. Disable payment button until checked.

### 3.2 Toast Notifications (Replace alert())
- Create: `frontend/src/components/Toast.jsx`
- Replace all `alert()` calls across pages
- Auto-dismiss after 3 seconds

### 3.3 Loading Spinners
- Create: `frontend/src/components/Spinner.jsx`
- Replace "Loading..." text in all pages
- Add skeleton loaders for bike cards on Home page

### 3.4 Payment Pages
- Create: `frontend/src/pages/PaymentFailed.jsx`
- Create: `frontend/src/pages/PaymentCancelled.jsx`
- Add routes in App.jsx

### 3.5 Mobile Responsive Audit
Test at: 320px, 375px, 768px, 1024px. Fix overflow, ensure touch targets (min 44px).

### 3.6 Dead Code Cleanup
- Delete `frontend/src/App.css` (unused Vite boilerplate)
- Delete unused assets from `frontend/src/assets/`

### 3.7 Renter Availability Toggle
- Add `PUT /api/dashboard/bikes/:id/availability` endpoint
- Add toggle button in RenterDashboard

---

## 6. Phase 6 — Enhancements & Polish

### Task 6.1: Admin-Managed Vehicle Categories

**Goal:** Replace hardcoded `['Bike', 'Car']` enum with a dynamic Category collection managed by admin.

**New files:**
- `backend/models/Category.js`

**Files to update:**
- `backend/models/Bike.js` (category field → ObjectId ref)
- `backend/controllers/dashboardController.js` (add Category CRUD + seed)
- `backend/routes/dashboard.js` (add category routes)
- `frontend/src/pages/AdminDashboard.jsx` (new Categories tab)
- `frontend/src/pages/RenterDashboard.jsx` (dynamic dropdown)
- `frontend/src/pages/Home.jsx` (category filter tabs)
- `frontend/src/pages/Checkout.jsx` (show category)

**Category model:**
```js
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

**Bike model change:**
```js
// Before
category: { type: String, enum: ['Bike', 'Car'], required: true }
// After
category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }
```

**Default categories to seed:** Bike, Car, Microbus, SUV, Van

**API endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/categories` | No | List active categories |
| GET | `/api/dashboard/admin/categories` | Admin | List all categories |
| POST | `/api/dashboard/admin/categories` | Admin | Create category |
| PUT | `/api/dashboard/admin/categories/:id` | Admin | Update category |
| DELETE | `/api/dashboard/admin/categories/:id` | Admin | Delete category |

---

### Task 6.2: Dedicated Policies Page

**Goal:** Standalone public page with full legal terms, fine policies, accident procedures, and refund policy.

**New files:**
- `frontend/src/pages/Policies.jsx`

**Files to update:**
- `frontend/src/App.jsx` (add `/policies` route)
- `frontend/src/components/Navbar.jsx` (add Policies link)
- `frontend/src/pages/Checkout.jsx` (add "Read full policies" link)

**Content sections:**
1. Rental agreement overview
2. Fine policies (beach sand 1000, helmet 2000, boundary 5000, speed limit 50km/h)
3. Accident procedures & liability
4. Legal complications & compensation
5. Petrol cost policy
6. Refund & cancellation policy
7. Insurance disclaimer
8. Contact information

---

### Task 6.3: Optional Video Upload for Bikes

**Goal:** Renters can optionally upload a video for their bike listing.

**Files to update:**
- `backend/models/Bike.js` — add `videoUrl: { type: String }` field
- `frontend/src/pages/RenterDashboard.jsx` — add optional video file input
- `frontend/src/pages/BikeDetails.jsx` — show video player if `bike.videoUrl` exists

**Note:** Videos upload to Cloudinary folder `rent-bike-cox/videos/`. Limit to 50MB. Video is optional — bike works fine without it.

---

### Task 6.4: Enhanced Default Packages

**Goal:** Add Monthly package to defaults. Admin can always customize.

**File:** `backend/controllers/dashboardController.js`

**Update defaultSettings:**
```js
const defaultSettings = {
  basePricePerHour: 200,
  packages: [
    { name: '1 Day', price: 2000 },
    { name: '2 Days', price: 3500 },
    { name: '1 Week', price: 10000 },
    { name: 'Monthly', price: 35000 }
  ]
};
```

---

### Task 6.5: Invoice Format Update

**Goal:** Match invoice to the demo format with serial number, destination, security deposit.

**Files to update:**
- `backend/models/Booking.js` — add `destination: String`, `securityDeposit: Number`
- `frontend/src/pages/Checkout.jsx` — add destination input
- `frontend/src/pages/Invoice.jsx` — restructure layout to match demo:
  - Organization header with mobile + date + serial no
  - Renter & Trip Details section (name, mobile, destination, rental date, hourly rate)
  - Payment & Vehicle Details section (bike model, total amount, security deposit)
  - Terms & Conditions summary (8 items matching demo)
  - Signature lines

---

### Task 6.6: Search & Category Filter on Home

**Goal:** Users can search bikes by name/brand and filter by category.

**Files to update:**
- `backend/controllers/dashboardController.js` — `getAvailableBikes` accepts `search` and `category` query params
- `frontend/src/pages/Home.jsx` — add search bar + category filter tabs

**Backend query:**
```js
exports.getAvailableBikes = async (req, res) => {
  const { search, category } = req.query;
  const filter = { availability: true, isVerified: true };
  if (category) filter.category = category;
  if (search) filter.$or = [
    { model: { $regex: search, $options: 'i' } },
    { brand: { $regex: search, $options: 'i' } }
  ];
  const bikes = await Bike.find(filter).populate('renter', 'name').populate('category');
  res.json(bikes);
};
```

**Frontend:** Debounced search (300ms), category tabs fetched from `/api/dashboard/categories`.

---

### Task 6.7: Security & Performance Hardening

**Goal:** Add production-ready security headers, rate limiting, compression, and performance optimizations.

**Backend changes (`backend/server.js`):**
```js
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(compression());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: { message: 'Too many attempts, try again later' }
});
app.use('/api/auth', authLimiter);
```

**New npm packages:** `helmet`, `compression`, `express-rate-limit`

**Frontend changes:**
- `frontend/src/App.jsx` — React.lazy() for route-based code splitting
- `frontend/src/pages/Home.jsx` — `loading="lazy"` on images
- All pages — skeleton loaders instead of "Loading..." text

**Database indexes:**
```js
// Bike.js
bikeSchema.index({ availability: 1, isVerified: 1 });
bikeSchema.index({ renter: 1 });
bikeSchema.index({ category: 1 });

// Booking.js
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ bike: 1, status: 1 });

// User.js
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
```

---

## 6. Phase 4 — Production Deployment

### Recommended Stack

| Service | Provider | Free Tier |
|---------|----------|-----------|
| Frontend | Vercel | Yes |
| Backend | Render | Yes |
| Database | MongoDB Atlas | Yes (512MB) |
| File Upload | Cloudinary | Yes (25GB) |

### Steps

1. **MongoDB Atlas** — Create cluster, whitelist IPs, get connection string
2. **Cloudinary** — Get cloud name, API key, API secret
3. **Backend on Render** — Connect GitHub repo, set env vars, deploy
4. **Frontend on Vercel** — Connect repo, set `VITE_API_URL` to production backend
5. **SSLCommerz** — Switch to live mode with production credentials
6. **Update URLs** — Set `BACKEND_URL` and `FRONTEND_URL` to production domains

### Environment Variables for Production

```
BACKEND_URL=https://your-app.onrender.com
FRONTEND_URL=https://your-app.vercel.app
MONGODB_URI=mongodb+srv://... (Atlas connection string)
SSLCOMMERZ_IS_LIVE=true
```

---

## 7. Phase 5 — Testing & QA

### Manual Testing Checklist

#### Authentication
- [ ] Register as User with NID + license images
- [ ] Try registering without NID/license — should fail
- [ ] Login with valid credentials — redirect to home
- [ ] Login with wrong password — show error

#### Fleet Management
- [ ] Sign up as Renter, add bike with 3+ photos
- [ ] Refresh Home — bike appears (if verified)
- [ ] Admin verifies bike — shows on Home

#### Booking & Payment
- [ ] Select bike, choose duration — price = hours x rate
- [ ] Apply coupon — discount applied
- [ ] T&C checkbox — payment disabled until checked
- [ ] Complete SSLCommerz sandbox payment — redirect to invoice
- [ ] Booking status Confirmed, bike unavailable

#### Invoice
- [ ] Shows: customer name, NID, license, phone, address
- [ ] Shows: bike model, times, total, advance, due
- [ ] Includes all 5 fine policies
- [ ] Has signature lines
- [ ] Print — clean layout

#### Cancellation
- [ ] Cancel Pending booking — status changes to Cancelled
- [ ] Bike becomes available again

#### Role Guards
- [ ] Access /admin-dashboard as User — blocked
- [ ] Access /renter-dashboard as User — blocked
- [ ] Access /checkout without login — redirect to /login

#### Mobile
- [ ] Home, BikeDetails, Checkout, Invoice on 375px width
- [ ] RenterDashboard, AdminDashboard on 768px

---

## 8. Scalability Roadmap

When the app grows, implement these in order:

### Level 1 — Basic Optimization (1K-10K users)
| What | How |
|------|-----|
| Database indexing | Add indexes on ` Bike.availability`, `Booking.user`, `Booking.bike`, `User.email` |
| Response compression | Add `compression` middleware in Express |
| Input validation | Add `express-validator` or `zod` for all endpoints |
| Error handling | Global error handler middleware |

### Level 2 — Caching (10K-100K users)
| What | How |
|------|-----|
| Redis caching | Cache popular bike listings (5 min TTL) |
| Session store | Move JWT blacklist to Redis |
| Static asset CDN | Serve images via Cloudinary CDN |
| Rate limiting | `express-rate-limit` on auth endpoints |

### Level 3 — Infrastructure (100K-1M users)
| What | How |
|------|-----|
| Load balancing | Nginx or cloud load balancer |
| Multiple server instances | PM2 cluster mode or Docker |
| Database read replicas | MongoDB Atlas multi-region |
| Queue system | Bull/BullMQ for email, notifications |
| Logging | Winston or Pino for structured logs |

### Level 4 — Enterprise (1M+ users)
| What | How |
|------|-----|
| Microservices | Split auth, booking, payment into separate services |
| GraphQL | Apollo Server for flexible queries |
| Real-time | Socket.io for live bike availability |
| Search engine | Elasticsearch for bike search |
| Monitoring | Prometheus + Grafana dashboards |
| CI/CD | GitHub Actions for automated testing + deployment |
| Auto-scaling | Kubernetes or serverless (AWS Lambda) |

### Database Indexes (Add These Early)

```js
// In each model file, add these indexes:

// Bike.js
bikeSchema.index({ availability: 1, isVerified: 1 });
bikeSchema.index({ renter: 1 });

// Booking.js
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ bike: 1, status: 1 });

// User.js
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
```

---

## 9. Learning Path

### Month 1: JavaScript & React Basics
- [ ] JavaScript ES6+ (arrow functions, destructuring, promises, async/await)
- [ ] React components, props, state (useState)
- [ ] React effects (useEffect)
- [ ] React Router (routes, params, navigation)
- [ ] Forms and controlled components

### Month 2: Backend & Database
- [ ] Node.js basics (modules, fs, http)
- [ ] Express.js (routes, middleware, error handling)
- [ ] MongoDB + Mongoose (schemas, queries, CRUD)
- [ ] REST API design (GET, POST, PUT, DELETE)
- [ ] Authentication (JWT, bcrypt, middleware)

### Month 3: Full Stack Integration
- [ ] Axios (API calls, interceptors)
- [ ] File uploads (multer, Cloudinary)
- [ ] Payment gateway integration (SSLCommerz)
- [ ] Environment variables and config management
- [ ] Git branching and collaboration

### Month 4: Production & Scale
- [ ] Deployment (Vercel, Render, MongoDB Atlas)
- [ ] Performance optimization (caching, compression)
- [ ] Security (helmet, rate limiting, input validation)
- [ ] Monitoring and logging
- [ ] Docker basics

---

## 10. Commit Rules

This repo enforces commit message format via git hooks.

**Format:** `type: description`

**Allowed types:**
- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation only
- `refactor` — code restructuring (no feature change)
- `chore` — maintenance tasks
- `test` — adding tests
- `style` — formatting, whitespace

**Examples:**

```bash
git commit -m "feat: add coupon system with admin CRUD"
git commit -m "fix: correct payment amount calculation"
git commit -m "docs: update development plan"
git commit -m "refactor: extract auth into context"
```

**Rules:**
- Description starts lowercase
- Max 72 characters per line
- No period at the end

---

## 11. Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `MONGODB_URI` connection error | Check MongoDB is running, or Atlas IP whitelist |
| `CLOUDINARY` upload fails | Verify env vars, check folder permissions |
| SSLCommerz callback fails | Ensure `BACKEND_URL` is accessible (use ngrok locally) |
| Frontend can't reach backend | Check `VITE_API_URL`, ensure CORS is enabled |
| `jwt malformed` error | Token not sent in `Authorization: Bearer <token>` header |
| Bike not showing on Home | Check `isVerified: true` and `availability: true` |
| `alert()` in console | Replace with toast component (Phase 3) |

### Useful Commands

```bash
# Check if MongoDB is running
mongosh  (or mongo)

# View backend logs
cd backend && npm run dev

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json && npm install

# Check port usage
netstat -ano | findstr :5000  (Windows)
lsof -i :5000  (Mac/Linux)

# Reset git hooks
git config --unset core.hooksPath
```

---

## Quick Reference

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/dashboard/settings` | No | Get pricing |
| GET | `/api/dashboard/bikes/available` | No | List bikes |
| GET | `/api/dashboard/bikes/:id` | No | Bike detail |
| GET | `/api/dashboard/categories` | No | List active categories |
| POST | `/api/dashboard/bikes` | Renter | Add bike |
| GET | `/api/dashboard/my-bikes` | Renter | My bikes |
| POST | `/api/booking` | User | Create booking |
| POST | `/api/booking/confirm` | User | Confirm payment |
| GET | `/api/booking/:id` | User | Booking detail |
| POST | `/api/payment/init` | User | Start payment |
| POST | `/api/payment/success/:id/:tranId` | No | Payment callback |
| GET | `/api/dashboard/admin/bikes` | Admin | All bikes |
| PUT | `/api/dashboard/admin/settings` | Admin | Update pricing |
| GET | `/api/dashboard/admin/categories` | Admin | All categories |
| POST | `/api/dashboard/admin/categories` | Admin | Create category |
| PUT | `/api/dashboard/admin/categories/:id` | Admin | Update category |
| DELETE | `/api/dashboard/admin/categories/:id` | Admin | Delete category |

### Frontend Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Home | Public |
| `/bike/:id` | Bike Details | Public |
| `/policies` | Policies | Public |
| `/checkout/:bikeId` | Checkout | User |
| `/invoice/:bookingId` | Invoice | User |
| `/login` | Login | Public |
| `/signup` | Signup | Public |
| `/renter-dashboard` | Renter Dashboard | Renter |
| `/admin-dashboard` | Admin Dashboard | Admin |

---

*Last updated: July 2026*
*For questions, ask in the project GitHub repo.*
