# Security — Configurations & Measures

## Applied Security Measures

### Authentication
- JWT tokens with 1-day expiry, secret from env
- Password hashing with bcryptjs (salt rounds: 10)
- Password `select: false` in User model (never returned in queries by default)
- Token transmitted via `Authorization: Bearer <token>` header
- Refresh token system (RefreshToken model)
- Blacklisted tokens for logout (BlacklistedToken model)
- Login attempt tracking (LoginAttempt model)

### Password Policy
- Minimum 8 characters
- Requires uppercase letter, number, and special character
- Common password dictionary check
- Password reuse prevention (last 5 passwords)
- Implementation: `security/utils/passwordPolicy.js`

### Authorization
- 3-role system: Admin > Renter > User
- Role-based middleware: `security/middleware/authorize.js`
- Ownership checks: `security/middleware/checkOwnership.js`
- `ProtectedRoute` component with `roles` prop for frontend routing

### Input Validation
- Express-validator on all routes (`security/validators/`)
- Registration: name, email, password, NID (10-17 chars), license (3-30 chars), BD phone
- Price range: 1–100,000 TK
- Regex special chars escaped in search (ReDoS prevention)
- Body size limit: 1MB
- File upload: 5MB max, JPG/JPEG/PNG only

### Sanitization
- Custom `middleware/sanitize.js` (replaced express-mongo-sanitize due to Express 5 incompatibility)
- DOMPurify + jsdom for XSS prevention (`security/sanitizers/domSanitizer.js`)
- `sanitizeFields` helper strips dangerous HTML from user input
- `sanitizeFields` applied on registration, review creation, and settings update

### Rate Limiting
- Auth: 20 requests / 15 minutes
- Booking: 20 requests / 15 minutes
- Payment: 10 requests / 15 minutes
- Financial: 20 requests / 15 minutes
- Search: 30 requests / 1 minute
- Dashboard: 60 requests / 1 minute
- Fleet: 40 requests / 1 minute

### HTTP Security Headers (Helmet)
- `Content-Security-Policy` — strict policy, no `unsafe-inline` scripts
- `Strict-Transport-Security` — 63072000 seconds + preload
- `X-Frame-Options` — DENY
- `X-Content-Type-Options` — nosniff
- `X-XSS-Protection` — 1; mode=block
- `Cross-Origin-Opener-Policy` — same-origin
- `Cross-Origin-Resource-Policy` — cross-origin (for Cloudinary images)
- `Referrer-Policy` — strict-origin-when-cross-origin
- `Permissions-Policy` — camera=(), microphone=(), geolocation=()
- `Cache-Control` — no-store for API responses

### CORS
- Exact-match whitelist only (no loose `origin.includes()`)
- Allowed origins: `FRONTEND_URL`, `https://rent-bike-cox.vercel.app`, SSLCommerz domains
- `http://localhost:5173` only in development
- CORS errors return 403

### Payment Security
- SSLCommerz IPN verification (validates with gateway before confirming)
- Idempotency keys prevent duplicate transactions
- Circuit breaker for payment gateway (prevents cascading failures)
- Atomic booking lock (MongoDB sessions with CAS fallback for Atlas M0)
- Advance payment: 50% for ≤24h, 30% for >24h

### Audit Logging
- `AuditLog` model records all significant actions
- Actor, action, resource, timestamp, IP address
- Queriable by admin via `/api/audit` endpoints

### Fraud Detection
- `FraudEvent` model tracks suspicious activities
- `CircuitBreaker` model for payment gateway failure tracking
- `Fraud.js` service analyzes patterns

### Data Protection
- `.env` files gitignored
- `CREDENTIALS.md` gitignored with security warning
- No secrets in code or logs
- Winston logger redacts sensitive fields (passwords, tokens, NIDs)
- `dataRetention.js` job auto-deletes old data (2-year policy)

### Account Security
- Forgot password OTP flow (PasswordReset model, 15-min expiry)
- Data export (GDPR compliance)
- Soft account deletion
- Account deactivation

### File Upload Security
- Multer → Cloudinary (if credentials configured) or memory fallback
- Max 5MB, JPG/JPEG/PNG only
- Folders: `rent-bike-cox/nids/`, `rent-bike-cox/licenses/`, `rent-bike-cox/bikes/`
- File size/type validation before upload

## Security Headers Verification

All verified on deployed backend:
- HSTS with preload ✅
- X-Frame-Options: DENY ✅
- Permissions-Policy ✅
- Cross-Origin-Opener-Policy ✅
- Cross-Origin-Resource-Policy ✅
- Cache-Control: no-store ✅
- Referrer-Policy ✅

## Known Gaps

| Issue | Risk | Mitigation |
|-------|------|-----------|
| Token in localStorage | XSS vulnerability | Helmet CSP + DOMPurify sanitization reduce XSS surface |
| No httpOnly cookie flow | Token theft via XSS | Would require significant auth refactor |
| No automated tests | Regression risk | Manual testing + smoke test script |
| No HTTPS enforcement on Render | MitM risk | Render provides HTTPS by default |
| No 2FA | Account compromise risk | Acceptable for current scale |
