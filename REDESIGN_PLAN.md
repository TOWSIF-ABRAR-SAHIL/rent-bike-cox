# REDESIGN PLAN — Rent Bike Cox's Bazar

## Overview

**Scope:** Full UI/UX redesign (dark + gradient theme) + major feature additions + backend enhancements
**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Express 5, Mongoose 9
**Design Direction:** Dark mode default, vibrant gradients (blue→cyan), glassmorphism cards, micro-animations
**Payment:** SSLCommerz only (bKash, Nagad, Bank, Card all via gateway)
**Real-time:** Auto-refresh polling every 30 seconds
**Contact Numbers:** 01891154443, 01764466757

---

## User Requirements Summary

1. Guest browsing without login, login required for booking only
2. Vehicle categories: Bike, Car, Microbus (only bikes now, ready for future)
3. Packages: Hourly 200TK, 1-Day 2000TK, 2-Day 3500TK, 1-Week 10000TK, 1-Month 35000TK (admin editable)
4. Rich bike details: multiple images from different angles, optional videos
5. Separate policies page with all rental rules, fine schedules, legal/accident terms
6. Detailed invoice: serial number (RBC-2026-000001), all policies, signatures
7. 3 roles: Admin (can also rent bikes), Renter (bike owners), User (customers)
8. Renter verification with NID and driving license
9. Coupon system (admin managed)
10. Admin controls all pricing, packages, fees, policies
11. Customer bears petrol cost (never owner)
12. No insurance — renter pays for accidents/damage
13. Advance payment required (50% for short term ≤24h, 30% for longer)
14. bKash/Nagad/bank via SSLCommerz gateway
15. Dynamic, high-speed, smooth website
16. React + most popular technologies worldwide
17. Dark + gradient modern UI (2026 design trends)
18. Mobile responsive with hamburger nav
19. Real-time changes shown on website via polling

---

## Invoice Format (Per Customer Request)

```
## Bike Rental Registration Form

Organization Name: Rent Bike Cox's Bazar
Mobile No: 01891-154443, 01764-466757
Date: [DD/MM/YYYY]
Serial No: RBC-2026-000001

---

### Renter & Trip Details
- Rider Name: [Name]
- Mobile No: [Number]
- NID No: [Number]
- Driving License: [Number]
- Destination: [Location]
- Rental Date: [Start] to [End]
- Package: [Selected Package]
- Additional Hourly Rate: [Price] TK

---

### Payment & Vehicle Details
- Bike Model/Brand: [Model] ([Brand])
- Category: [Bike/Car/Microbus]
- Total Rental Amount: [Amount]/-
- Advance Paid: [Amount]/-
- Security Deposit: [Amount]/-
- Payment Method: [bKash/Nagad/Bank/Card]
- Transaction ID: [TranID]

---

### Policies (Full Text from Policies API)
1. Beach sand prohibition — fine 1,000/-
2. Valid driving license required
3. Helmet provided, max 2 persons, helmet fine 2,000/-
4. Speed limit 50 km/h
5. Renter responsible for all accidents, theft, damage
6. Boundary violation (Teknaf Marine Drive Zero Point) — fine 5,000/-
7. All traffic laws must be followed
8. Petrol cost borne by customer
9. [All other policies from database]

---

### Fine Schedule
| Offense | Fine Amount |
|---|---|
| Beach sand violation | 1,000/- |
| Lost helmet | 2,000/- |
| Helmet damage | 500/- |
| Boundary violation | 5,000/- |
| Speed limit violation | As assessed |

---

### Signatures
Owner Signature: _______________
Renter Signature: _______________
```

---

## PHASE A: Design System Foundation

### A1. Tailwind Theme + CSS Variables

**Files:** `frontend/src/index.css`, `frontend/tailwind.config.js`, `frontend/index.html`

- Add Google Font `Inter` (weights 400-900) in `index.html`
- Define CSS custom properties in `index.css`:
  ```
  --bg-primary: #0a0a0f
  --bg-card: #111118
  --bg-elevated: #1a1a24
  --gradient-primary: linear-gradient(135deg, #2563eb, #06b6d4)  /* blue→cyan */
  --gradient-accent: linear-gradient(135deg, #8b5cf6, #ec4899)   /* purple→pink */
  --text-primary: #f0f0f5
  --text-secondary: #9ca3af
  --text-muted: #6b7280
  --border-subtle: rgba(255,255,255,0.06)
  --border-active: rgba(255,255,255,0.12)
  ```
- Extend `tailwind.config.js` with custom colors, gradients, border-radius, animations
- Add CSS `@keyframes` for: `slide-in`, `fade-in-up`, `shimmer` (skeleton), `glow-pulse`
- Add `animate-slide-in` (fix broken toast animation)
- Root `<html>` gets `class="dark"` by default

### A2. Reusable UI Components

**Files:** New `frontend/src/components/ui/` directory

| Component | Description |
|---|---|
| `Button.jsx` | Variants: `primary` (gradient bg + hover glow), `ghost`, `danger`, `outline`, `outline-light`. Sizes: `sm`, `md`, `lg`. Includes `loading` state with spinner |
| `Card.jsx` | Glassmorphism: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl`. Optional `hover` glow effect |
| `Input.jsx` | Dark input `bg-white/5 border-white/10`, glowing focus ring with gradient border |
| `Badge.jsx` | Status pills with optional subtle glow. Variants: `success`, `warning`, `danger`, `info`, `purple` |
| `Modal.jsx` | Centered overlay with `backdrop-blur-md`, slide-in animation |
| `Spinner.jsx` | Gradient ring spinner (animated gradient border) |
| `Skeleton.jsx` | Shimmer placeholder shapes: `SkeletonCard`, `SkeletonText`, `SkeletonTable` |
| `EmptyState.jsx` | Centered icon + message + optional CTA for empty lists |

---

## PHASE B: Layout & Navigation

### B1. New Navbar

**File:** Rewrite `frontend/src/components/Navbar.jsx`

- **Glassmorphism bar:** `bg-black/60 backdrop-blur-xl border-b border-white/5`, fixed top
- **Brand:** Gradient text "Rent Bike Cox's Bazar" with `Bike` icon
- **Desktop nav links:** Home, Browse, Categories, Policies, Contact
- **Auth section:** Login (ghost button), Sign Up (gradient button)
- **Logged in:** User avatar/name dropdown (glassmorphism card), Dashboard link, Logout
- **Mobile hamburger:** `Menu` icon → slide-in glassmorphism drawer from right with all links + auth
- **Close on route change** via `useLocation` effect

### B2. New Footer

**File:** New `frontend/src/components/Footer.jsx`

- Dark background `bg-[#0a0a0f]` with gradient accent line at top
- 3-column grid (stacked on mobile):
  - Col 1: Brand name, logo, brief description
  - Col 2: Quick links (Home, Browse, Categories, Policies, Terms)
  - Col 3: Contact info — **01891-154443, 01764-466757**, email, address
- Bottom row: Copyright "© 2026 Rent Bike Cox's Bazar", social icons
- Add `<Footer />` to `App.jsx` layout

### B3. App Layout Wrapper

**File:** Modify `frontend/src/App.jsx`

```jsx
<Router>
  <AuthProvider>
    <ToastProvider>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <main className="pt-16">
          <Routes>...</Routes>
        </main>
        <Footer />
      </div>
    </ToastProvider>
  </AuthProvider>
</Router>
```

### B4. 404 Not Found Page

**File:** New `frontend/src/pages/NotFound.jsx`

- Dark card centered, "404" large gradient text, "Page not found" message, "Go Home" button

---

## PHASE C: Backend Enhancements

### C1. Extend Bike Model

**File:** `backend/models/Bike.js`

Add fields:
- `category` enum → `['Bike', 'Car', 'Microbus']`
- `videos: [{ url: String, caption: String }]`
- `seats: Number` (for cars/microbuses)
- `fuelType: String` (Petrol/Diesel/Electric)
- `transmission: String` (Manual/Automatic)
- `year: Number` (manufacturing year)
- `registrationNumber: String`
- `location: String` (pickup location in Cox's Bazar)
- `mileage: String`
- `primaryImageIndex: Number` (default 0)
- `petrolPolicy: { included: Boolean, description: String }`

### C2. Extend Settings Model

**File:** `backend/models/Settings.js`

Add fields:
- `packages[]` → add `durationDays: Number` to each subdoc
- Default packages with durations:
  - Hourly: 200TK, durationDays: 0.042 (1hr)
  - 1-Day: 2000TK, durationDays: 1
  - 2-Day: 3500TK, durationDays: 2
  - 1-Week: 10000TK, durationDays: 7
  - 1-Month: 35000TK, durationDays: 30
- `adminCommissionPercent: Number` (default 10)
- `serviceCharge: Number` (default 0)
- `categoryPricing: [{ category: String, basePricePerHour: Number }]`
- `fines: [{ name: String, amount: Number, description: String, isActive: Boolean }]`
  - Pre-seeded: Beach sand (1000), Lost helmet (2000), Boundary violation (5000), Helmet damage (500)
- `petrolPolicyDefault: String` (default "Customer must bear petrol cost")
- `contactNumbers: [String]` (default: ["01891154443", "01764466757"])
- `siteName: String` (default: "Rent Bike Cox's Bazar")

### C3. Extend Booking Model

**File:** `backend/models/Booking.js`

Add fields:
- `invoiceNumber: String` (unique, format: `RBC-YYYY-NNNNNN`)
- `packageName: String` (store which package was used)
- `pickupLocation: String`
- `petrolPolicyAccepted: Boolean`
- `termsAccepted: Boolean`
- `termsAcceptedAt: Date`
- `advancePercent: Number` (30 or 50)
- `tranId: String` (SSLCommerz transaction ID)
- `paymentMethod: String` (bKash/Nagad/Card/Bank)
- `adminFee: Number`
- `serviceCharge: Number`
- `serialNumber: Number` (auto-incrementing integer)

### C4. Invoice Number Generator

**File:** New `backend/utils/invoiceNumber.js`

- Create a counter collection or use atomic `findOneAndUpdate` on a `Counter` model
- Format: `RBC-2026-000001` (year + 6-digit zero-padded sequential)
- Auto-generate when booking status changes to "Confirmed"

**File:** New `backend/models/Counter.js`
- Fields: `{ name: String, seq: Number }` (name: "invoice", starts at 0)

### C5. Policy Model + CRUD

**Files:**
- New `backend/models/Policy.js`
- New `backend/controllers/policyController.js`
- New `backend/routes/policy.js`

- **Policy model:** `{ title, content (rich text), type: enum ['terms', 'fine', 'safety', 'petrol', 'refund', 'legal'], sortOrder, isActive, version }`
- **Controller:** Admin CRUD (create, read, update, delete, reorder) + public read (GET active policies)
- **Routes:** `/api/policies` (public GET), `/api/admin/policies` (admin CRUD)
- **Seed default policies** on first access:
  1. Rental Terms & Conditions
  2. Fine Policies (beach sand, helmet, boundary, speed)
  3. Safety Rules (max 2 persons, helmet mandatory, speed limit 50km/h)
  4. Petrol Policy (customer bears cost, owner never pays)
  5. Accident/Legal Policy (renter responsible, no insurance, full compensation required)
  6. Refund Policy (advance refund rules, cancellation policy)

### C6. Extend Upload Middleware for Video

**File:** `backend/middleware/uploadMiddleware.js`

- Add video formats: `mp4`, `webm`, `quicktime` to allowed formats
- Add file size limits: images 5MB, videos 50MB
- Add video-specific Cloudinary folder: `rent-bike-cox/bike-videos/`
- Separate multer upload functions: `uploadBikeImages`, `uploadBikeVideos`

### C7. New Backend Endpoints

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/dashboard/bikes` (GET) | GET | Public | Add `?category=` filter, `?search=` text search, `?sort=` option |
| `/api/dashboard/bikes/:id` (PUT) | PUT | Renter/Admin | Update bike details + images |
| `/api/dashboard/bikes/:id` (DELETE) | DELETE | Renter/Admin | Delete bike |
| `/api/policies` | GET | Public | Get all active policies |
| `/api/admin/policies` | POST/PUT/DELETE | Admin | Manage policies |
| `/api/booking/my-bookings` | GET | User | Get user's own bookings |
| `/api/booking/renter-bookings` | GET | Renter | Get bookings for renter's bikes |
| `/api/admin/bookings` | GET | Admin | Get all bookings |
| `/api/booking/:id/complete` | PUT | Renter/Admin | Mark booking as completed |
| `/api/payment/remaining` | POST | User | Pay remaining balance |
| `/api/settings/packages` | GET | Public | Get packages with pricing |

### C8. Search & Filter Backend

**File:** Modify `backend/controllers/dashboardController.js` → `getAvailableBikes`

- Add query params: `?category=`, `?search=` (text search on model+brand), `?minPrice=`, `?maxPrice=`, `?sort=price_asc|price_desc|newest`
- Use MongoDB `$regex` for text search, `$gte/$lte` for price range
- Add pagination: `?page=1&limit=12`

### C9. Security Enhancements

**Files:** `backend/server.js`, `backend/middleware/`

- Install + configure `helmet` (security headers)
- Install + configure `express-rate-limit` (100 req/15min general, 10 req/15min for auth)
- Add role-based middleware: `authorize('Admin')`, `authorize('Renter')`, `authorize('Admin', 'Renter')`
- Restrict CORS to `FRONTEND_URL` only
- Add input validation with `express-validator` on auth and booking routes

---

## PHASE D: Frontend Page Redesigns

### D1. Home Page (Complete Rewrite)

**File:** Rewrite `frontend/src/pages/Home.jsx`

Sections:
1. **Hero Section:** Full-width gradient background with animated gradient orbs, large heading "Explore Cox's Bazar on Two Wheels", subtitle about bike/car/microbus rental, CTA buttons "Browse Vehicles" + "Learn More"
2. **Category Section:** 3 glassmorphism cards (Bike, Car, Microbus) with icons, vehicle counts, click to filter
3. **Search Bar:** Full-width dark input with search icon, real-time search with debounce
4. **Filter Tabs:** Category pills (All, Bikes, Cars, Microbuses) + sort dropdown + price range
5. **Bike Grid:** Responsive grid (1 col mobile, 2 tablet, 3 desktop) of glassmorphism cards:
   - Image with gradient overlay at bottom
   - Hover: scale 1.02, glow border, shadow deepens
   - Model name, brand, category badge, price pill (gradient bg)
   - "View Details" link
   - Staggered fade-in-up animation on scroll (framer-motion)
6. **Features Section:** "Why Choose Us" — 3-4 feature cards (Verified Vehicles, Secure Payment, 24/7 Support, Affordable Rates)
7. **How It Works:** 3-step visual (Browse → Book → Ride)
8. **Skeleton loading:** Shimmer cards while data loads

### D2. Bike Details Page (Enhanced)

**File:** Rewrite `frontend/src/pages/BikeDetails.jsx`

- **Image Gallery:** Main image with click-to-switch thumbnails + lightbox modal (full-screen view)
- **Video Section:** If videos exist, embedded `<video>` player below gallery
- **Details Card:** Glassmorphism card with:
  - Model name (large gradient text), brand, category badge
  - Price per hour (gradient highlight)
  - Specs grid: Seats, Fuel Type, Transmission, Year, Mileage, Location
  - Description
  - Packages table from Settings (glassmorphism rows)
- **Renter Info:** Renter name + verification badge
- **Requirements Box:** What you need (NID, license, advance payment)
- **Petrol Policy:** "Customer bears petrol cost" notice
- **Book Now CTA:** Large gradient button, disabled if not available, shows "Login to Book" for guests
- **Related Vehicles:** Similar vehicles from same category (3 cards)

### D3. Checkout Page (Enhanced)

**File:** Rewrite `frontend/src/pages/Checkout.jsx`

- **Step indicator:** Visual progress (1. Select Package → 2. Schedule → 3. Payment)
- **Package selection:** Cards with gradient border on selected
- **Duration picker:** Improved datetime pickers with dark theme
- **Coupon section:** Input with apply button, shows discount amount
- **Price breakdown:** Glassmorphism card with line items (base price, package discount, coupon discount, admin fee, service charge, total, advance required)
- **Terms & Conditions:** Full text preview from Policies API, checkbox to accept
- **Payment method selector:** Cards for bKash, Nagad, Bank, Card (all via SSLCommerz)
- **Proceed to Payment:** Gradient button, disabled until terms accepted + advance calculated

### D4. Invoice Page (Redesigned)

**File:** Rewrite `frontend/src/pages/Invoice.jsx`

- **Header:** Organization name, serial number `RBC-2026-000001`, date, contact numbers (01891154443, 01764466757)
- **Renter & Trip Details:** Name, mobile, NID, license, destination, rental date, package, hourly rate
- **Payment & Vehicle Details:** Bike model/brand, total amount, advance paid, remaining, payment method, transaction ID
- **Full Policies Section:** All policies from Policies API listed in detail
- **Fine Schedule Table:** Table format with offense + fine amount
- **Signatures Area:** Owner + Renter signature lines
- **Print button:** Optimized `@media print` styles
- **Status badges:** Color-coded with glassmorphism

### D5. Policies Page (New)

**File:** New `frontend/src/pages/Policies.jsx`

- Full page with sections fetched from `/api/policies`
- Sections: Terms & Conditions, Fine Policies, Safety Rules, Petrol Policy, Accident/Legal, Refund Policy
- Each section collapsible/expandable (accordion)
- Glassmorphism cards for each section
- Print-friendly layout

### D6. Login/Signup (Redesigned)

**Files:** Rewrite `frontend/src/components/Login.jsx`, `frontend/src/components/Signup.jsx`

- **Login:** Glassmorphism card on dark gradient background, email + password inputs with glowing focus, gradient submit button, link to signup
- **Signup:** Multi-step form (1. Account → 2. Documents → 3. Review):
  - Step 1: Name, email, password, role (User/Renter), phone
  - Step 2: NID number, NID image upload, license number, license image upload, address
  - Step 3: Confirmation + submit
  - File uploads with drag-and-drop style UI, preview thumbnails

### D7. Admin Dashboard (Redesigned)

**File:** Rewrite `frontend/src/pages/AdminDashboard.jsx`

- **Stats overview:** 4 glassmorphism stat cards (Total Bookings, Revenue, Active Vehicles, Pending Verifications)
- **Tab navigation:** Glassmorphism tabs with icons
  - Settings: Pricing, packages, fines, commission, petrol policy — all editable
  - Vehicles: Table with search, filter, verify/unverify, edit, delete
  - Users: Table with search, verify/reject with reason, role management
  - Bookings: All bookings table with status management
  - Coupons: CRUD table
  - Policies: Edit policies inline
- **Auto-refresh:** Data refreshes every 30 seconds via polling
- **Responsive tables:** Horizontal scroll on mobile

### D8. Renter Dashboard (Redesigned)

**File:** Rewrite `frontend/src/pages/RenterDashboard.jsx`

- **Stats overview:** My Bikes, Active Bookings, Total Earnings
- **Add Bike form:** Multi-section glassmorphism form:
  - Vehicle info: Model, brand, category, year, seats, fuel type, transmission
  - Pricing: Base hourly rate
  - Media: Multi-image upload (drag-and-drop, preview grid, reorder), video upload (optional)
  - Description: Rich text area
  - Location: Pickup location in Cox's Bazar
  - Petrol policy: Included or customer-bears checkbox
- **My Bikes grid:** Glassmorphism cards with:
  - Primary image, model, category badge
  - Availability toggle (gradient toggle switch)
  - Edit / Delete buttons
  - Booking count badge
- **Bookings for my bikes:** Table with booking details, customer info, status

### D9. Payment Failed / Cancelled (Redesigned)

**Files:** Rewrite `frontend/src/pages/PaymentFailed.jsx`, `frontend/src/pages/PaymentCancelled.jsx`

- Dark gradient background, centered glassmorphism card
- Large animated icon (XCircle / AlertCircle with glow)
- Clear message + suggestion
- "Try Again" and "Go Home" buttons (gradient)

---

## PHASE E: Animations & Polish

### E1. Install Dependencies

```bash
cd frontend
npm install framer-motion react-helmet-async react-intersection-observer
```

### E2. Scroll Animations

- Wrap page sections in `<motion.div>` with `whileInView` fade-in-up
- Staggered entrance for card grids (each card delays 0.1s)
- Hero section: parallax gradient orbs
- Button hover: subtle scale + glow
- Card hover: scale 1.02 + border glow + shadow shift

### E3. Skeleton Loading

- Every data-fetching page shows skeleton placeholders while loading
- `SkeletonCard` for bike grid (3-col shimmer)
- `SkeletonTable` for admin tables
- `SkeletonText` for detail pages
- Shimmer animation: gradient moving left-to-right

### E4. Page Transitions

- Smooth fade between routes using framer-motion `AnimatePresence`

---

## PHASE F: SEO & Performance

### F1. Dynamic Page Titles

- Install `react-helmet-async`
- Set title per page:
  - Home: "Rent Bike Cox's Bazar | Browse Vehicles"
  - Bike Details: "[Model Name] | Rent Bike Cox's Bazar"
  - Checkout: "Book Your Ride | Rent Bike Cox's Bazar"
  - Invoice: "Invoice #[Number] | Rent Bike Cox's Bazar"
  - Policies: "Rental Policies | Rent Bike Cox's Bazar"
  - Login/Signup: respective titles

### F2. Performance

- Lazy load images: `loading="lazy"` on all `<img>` tags
- Lazy load route components: `React.lazy()` + `<Suspense>` for pages
- Image placeholders: blur-up or skeleton while loading

---

## PHASE G: Database Seed Data

### G1. Default Admin

**File:** Update `backend/seed.js`

- Email: `admin@rentbikecox.com`, Password: `admin123`
- Role: Admin, isVerified: true

### G2. Default Settings

Auto-seeded on first API call:
- Base price: 200 TK/hour
- 5 packages (Hourly, 1-Day, 2-Day, 1-Week, 1-Month)
- 4 fine types (Beach sand, Helmet, Boundary, Helmet damage)
- Admin commission: 10%
- Contact numbers: 01891154443, 01764466757
- Petrol policy: "Customer must bear petrol cost"

### G3. Default Policies

6 policies seeded on first access:
1. Terms & Conditions
2. Fine Policies
3. Safety Rules
4. Petrol Policy
5. Accident & Legal Policy
6. Refund Policy

---

## Implementation Order

| Step | Phase | Description | Estimated Files |
|---|---|---|---|
| 1 | A1-A2 | Design system + UI components | 10 new files |
| 2 | B1-B4 | Navbar, Footer, Layout, 404 | 5 files |
| 3 | C1-C3 | Backend model extensions | 3 models modified |
| 4 | C4-C6 | Invoice generator, policies, uploads | 8 new backend files |
| 5 | C7-C9 | New endpoints, search, security | 5 files modified |
| 6 | D1-D2 | Home + BikeDetails redesign | 2 pages rewritten |
| 7 | D3-D4 | Checkout + Invoice redesign | 2 pages rewritten |
| 8 | D5 | Policies page | 1 new page |
| 9 | D6 | Login/Signup redesign | 2 components rewritten |
| 10 | D7-D8 | Admin + Renter dashboard redesign | 2 pages rewritten |
| 11 | D9 | Payment failed/cancelled redesign | 2 pages rewritten |
| 12 | E1-E4 | Animations + skeletons + polish | CSS + component updates |
| 13 | F1-F2 | SEO + performance | Config updates |
| 14 | G1-G3 | Seed data | Seed script updates |

---

## Summary of New/Modified Files

| Action | Count | Files |
|---|---|---|
| **New frontend files** | ~15 | UI components (8), Footer, Layout, NotFound, Policies, Skeleton helpers |
| **Rewritten frontend** | 11 | Home, BikeDetails, Checkout, Invoice, Login, Signup, AdminDashboard, RenterDashboard, Navbar, PaymentFailed, PaymentCancelled |
| **Modified backend** | 5 | Bike model, Settings model, Booking model, dashboardController, server.js |
| **New backend files** | 8 | Policy model, policyController, policy routes, invoiceNumber util, Counter model, role middleware |
| **Modified frontend config** | 3 | index.css, App.jsx, package.json (new deps) |

**Total: ~42 files touched, ~23 new files created**

---

## Technologies Used

| Category | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.2.5 |
| Build Tool | Vite | 8.0.10 |
| CSS Framework | Tailwind CSS | 4.2.4 |
| Routing | React Router DOM | 7.15.0 |
| HTTP Client | Axios | 1.16.0 |
| Auth Tokens | jwt-decode | 4.0.0 |
| Icons | Lucide React | 1.14.0 |
| Animation | Framer Motion | latest |
| SEO | React Helmet Async | latest |
| Scroll Detection | React Intersection Observer | latest |
| Backend Framework | Express | 5.2.1 |
| Database | MongoDB + Mongoose | 9.6.1 |
| Auth | JWT + bcryptjs | 9.0.3 / 3.0.3 |
| File Upload | Multer + Cloudinary | 2.1.1 / 1.41.3 |
| Payment | SSLCommerz | 1.2.0 |
| Security | Helmet | latest |
| Rate Limiting | express-rate-limit | latest |
| Validation | express-validator | latest |
| Language | JavaScript (ES6+) | — |
| Package Manager | npm | — |
