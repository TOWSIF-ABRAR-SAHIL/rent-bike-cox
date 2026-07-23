# Security — Configurations & Gaps

## Applied Security Measures

### Authentication
- JWT tokens with 1-day expiry
- Password hashing with bcryptjs (salt rounds: 10)
- Password `select: false` in User model (not returned in queries)
- Token transmitted via `Authorization: Bearer <token>` header
- Frontend stores in localStorage (XSS risk — see gaps)

### Authorization
- Role-based access: Admin > Renter > User
- Ownership checks on booking details, confirm payment, bike operations
- `ProtectedRoute` component with `roles` prop for frontend routing
- Inline role checks in controllers (no middleware layer)

### Input Validation
- Registration: required fields enforced (name, email, password, nid, license)
- Password minimum 6 characters
- Name maximum 100 characters
- `pricePerHour` range: 1–100,000 TK
- Regex special chars escaped in search (ReDoS prevention)

### Rate Limiting
- Auth routes: 20 requests per 15 minutes
- Applied via `express-rate-limit`

### File Upload Security
- Maximum size: 5MB
- Allowed types: JPG, JPEG, PNG only
- Multer memory storage (no disk write)
- Cloudinary upload (external storage, not served from Express)
- Folders: `rent-bike-cox/nids/`, `rent-bike-cox/licenses/`, `rent-bike-cox/bikes/`

### HTTP Security Headers
```js
helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })
```
Sets: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, etc.

### CORS
- Exact-match whitelist (no `origin.includes()`)
- Origins: `FRONTEND_URL`, `rent-bike-cox.vercel.app`, `localhost:5173`, SSLCommerz domains
- `credentials: true`
- CORS errors return 403

### Body Size Limits
- `express.json({ limit: '1mb' })`
- `express.urlencoded({ limit: '1mb' })`

### Error Handling
- No stack traces in production responses
- Generic "Internal server error" message
- CORS errors return 403 with specific message
- File size/type errors return 400

### Seed Endpoint Protection
- `GET /api/seed-temp` guarded by `NODE_ENV !== 'production'`
- Returns 404 in production

### Mass Assignment Prevention
- Registration ignores `role` field from request body → forced to `'User'`
- Settings update whitelists only `basePricePerHour` and `packages`
- Policy update whitelists: `title`, `content`, `type`, `sortOrder`, `isActive`
- Booking confirmation: server calculates `advanceAmount` (not from client)

## Remaining Security Gaps

### HIGH Priority

| Gap | Location | Risk | Mitigation |
|-----|----------|------|------------|
| Token in localStorage | `frontend/src/api/axios.js` | XSS can steal JWT | Use httpOnly cookies + refresh token flow |
| No httpOnly refresh flow | — | — | Implement token rotation |
| No helmet CSP policy | `server.js:18` | No Content-Security-Policy | Add CSP headers |
| No request ID/logging | — | Hard to trace attacks | Add request ID middleware |
| No account lockout | `authController.js` | Brute force after rate limit reset | Implement lockout after N failed attempts |

### MEDIUM Priority

| Gap | Location | Risk | Mitigation |
|-----|----------|------|------------|
| No email verification | User model | Fake emails accepted | Add email verification flow |
| No password reset | — | Lost accounts unrecoverable | Add forgot-password flow |
| No CORS preflight logging | — | Can't monitor blocked origins | Log rejected CORS requests |
| Coupon usage not tracked | Coupon model | maxUses never enforced | Increment usedCount on apply |
| No booking date overlap check | `bookingController.js` | Same bike double-booked | Check date ranges before creation |
| No admin role check on coupon routes | `coupon.js` | Any authenticated user can CRUD coupons | Add `role: 'Admin'` check |

### LOW Priority

| Gap | Location | Risk | Mitigation |
|-----|----------|------|------------|
| No MongoDB connection encryption | `.env` | Atlas handles this | Ensure `ssl=true` in URI |
| No request timeout | — | Slow clients tie up server | Add `connect-timeout` |
| No API versioning | — | Breaking changes possible | Add `/api/v1/` prefix |
| No HTTPS enforcement | Render/Vercel | MitM | Both platforms auto-HTTPS |
| No audit log | — | Can't track admin actions | Add audit collection |

## Middleware Stack Order

```js
1. helmet()              // Security headers
2. compression()         // Gzip responses
3. cors()               // Origin check (403 on failure)
4. express.json(1mb)    // Body parsing
5. express.urlencoded(1mb)  // Form parsing
6. rateLimit(auth only) // Brute force protection
7. Routes              // Business logic
8. 404 handler         // Unknown endpoints
9. Error handler       // Sanitized responses
```

## Environment Variable Security

| Variable | Sensitivity | In .gitignore |
|----------|------------|---------------|
| `MONGODB_URI` | HIGH | Yes |
| `JWT_SECRET` | HIGH | Yes |
| `CLOUDINARY_*` | HIGH | Yes |
| `SSL_STORE_ID` | MEDIUM | Yes |
| `SSL_STORE_PASS` | MEDIUM | Yes |
| `VITE_API_URL` | LOW | No (Vite prefix) |

All secrets are in `.env` files which are gitignored. `CREDENTIALS.md` created separately with all values (also gitignored).
