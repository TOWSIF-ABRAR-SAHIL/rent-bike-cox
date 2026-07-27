# REDESIGN PLAN — Rent Bike Cox's Bazar

## Overview

**Status:** COMPLETE — All phases implemented and deployed.

**Live URLs:**
- Frontend: https://rent-bike-cox.vercel.app
- Backend: https://rent-bike-backend.onrender.com

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4, Express 5, Mongoose 9
**Design Direction:** Dark mode default, vibrant gradients (amber/orange), glassmorphism cards, micro-animations
**Payment:** SSLCommerz (bKash, Nagad, Bank, Card via gateway)
**Contact Numbers:** 0189154443, 01764466757

---

## User Requirements — ALL FULFILLED

1. ✅ Guest browsing without login, login required for booking only
2. ✅ Vehicle categories: Bike, Car, Jeep
3. ✅ Tier-based pricing (renter-defined hourly tiers per vehicle)
4. ✅ Rich bike details: multiple images, specs
5. ✅ Separate policies page with all rental rules
6. ✅ SSLCommerz payment integration
7. ✅ Printable rental invoices
8. ✅ Admin dashboard (users, bikes, bookings, settings, categories, coupons)
9. ✅ Renter dashboard (bikes, bookings, availability)
10. ✅ Dark/Light/System theme switcher
11. ✅ Contact info in footer: 0189154443, 01764466757
12. ✅ Insurance: None — renter pays for all accidents/damage
13. ✅ Petrol cost: Always by customer

---

## Pricing Model — IMPLEMENTED

### Tier-Based Pricing
- Renter defines hourly tiers per vehicle
- Example: 1-2h: 200 TK/hr, 3-4h: 175 TK/hr, 5+h: 150 TK/hr
- Minimum floor: 150 TK/hr (absolute minimum)
- Admin can edit any renter's tiers

### Seasonal Pricing
- Peak, Off-peak, Holiday, Weekend, Custom types
- Priority-based matching
- 5-minute cache for performance

### Advance Payment
- 50% for rentals ≤24 hours
- 30% for rentals >24 hours

### Cancellation Refund
- >24h: 100% refund
- 12-24h: 50% refund
- <12h: 0% refund
- No-show: 0% refund

---

## Design System

### Light Mode
- Lavender base: `#e8e4f0`
- Cards: `#f3f0f8`
- Glass: semi-transparent
- Hero: lavender gradient
- Footer: `#3d3550` (dark purple)

### Dark Mode
- Base: `#0a0a0f`
- Cards: `#0d0d14`
- Hero: dark gradient
- Footer: `#0a0a0f`

### Accent
- Primary: Amber/Orange (`amber-500`/`orange-500`)
- 18 CSS variables for accent, success, warning, danger, info, purple

### Components
- Glassmorphism (`.glass`, `.glass-light`, `.glass-dark`)
- Gradients (`.gradient-primary`, etc.)
- Animations (fadeIn, slideUp, slideIn, float, glowPulse, shimmer)
- Print stylesheet for invoices

### Z-Index Hierarchy
- Content: z-10
- Navbar: z-50
- Dropdown: z-[100]
- Modal: z-[200]
- Toast: z-[300]

---

## Pages (18 total)

| Page | Route | Access |
|------|-------|--------|
| Home | `/` | Public |
| Bike Details | `/bike/:id` | Public |
| Checkout | `/checkout/:bikeId` | Auth |
| Invoice | `/invoice/:bookingId` | Auth |
| Login | `/login` | Public |
| Signup | `/signup` | Public |
| Forgot Password | `/forgot-password` | Public |
| Admin Dashboard | `/admin-dashboard` | Admin |
| Renter Dashboard | `/renter-dashboard` | Renter/Admin |
| Fleet Dashboard | `/fleet` | Renter/Admin |
| Analytics Dashboard | `/analytics` | Admin |
| Advanced Search | `/search` | Public |
| Vehicle History | `/vehicle-history/:bikeId` | Renter/Admin |
| Notifications | `/notifications` | Auth |
| Notification Settings | `/notification-settings` | Auth |
| Seasonal Pricing | `/seasonal-pricing` | Admin |
| Vehicle Documents | `/vehicle-docs` | Renter/Admin |
| Policies | `/policies` | Public |

---

## Components (40+)

### Layout & Navigation
Navbar, Footer, ThemeToggle, ProtectedRoute, ErrorBoundary, PageSpinner, LoadingSkeleton

### Fleet Management
FleetOverview, FleetSummary, FleetFilter, FleetBikeRow, FleetHealthChart, FleetUtilizationChart

### Maintenance
MaintenanceSchedule, MaintenanceLogForm, MaintenanceHistory, VehicleHealthCard

### Search & History
SearchFilters, SearchResults, SearchAutocomplete, HistoryTimeline, HistoryFilter, HistoryStats

### Analytics
RevenueChart, BookingTrendChart, CategoryPerformance, TopBikes, CustomerInsights

### Engagement
NotificationBell, ReviewForm, ReviewList, SeasonalBadge

### Documents
DocumentUpload, DocumentViewer, BulkOperations, ZoneCard

### Availability
AvailabilityCalendar

---

## Features Added Since Original Plan

1. **Tier-based pricing** (replaced flat rate)
2. **Fleet management** (zones, maintenance, availability, bulk ops)
3. **Analytics dashboard** (5 charts)
4. **In-app notifications** with per-user preferences
5. **Reviews and ratings**
6. **Seasonal pricing**
7. **Vehicle document management**
8. **Email service** (Nodemailer)
9. **Audit logging**
10. **Fraud detection**
11. **Circuit breaker** for payment gateway
12. **Graceful shutdown**
13. **Docker support**
14. **CI/CD pipelines**
15. **Full production deployment**
