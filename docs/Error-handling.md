# Error Handling — Status Codes, Responses & Patterns

## HTTP Status Codes Used

| Code | Meaning | Where Used |
|------|---------|------------|
| 200 | OK | Successful GET, PUT, POST responses |
| 201 | Created | Resource created (not consistently used) |
| 400 | Bad Request | Validation errors, file size/type, missing fields |
| 401 | Unauthorized | No token, invalid token, expired token |
| 403 | Forbidden | CORS violation, wrong role |
| 404 | Not Found | Unknown API endpoint, missing resource |
| 409 | Conflict | Duplicate email/nid/license on registration; Mongo duplicate key (`code: 11000`); a refund/payout already in another state |
| 429 | Too Many Requests | Rate limit exceeded (auth routes) |
| 500 | Internal Server Error | Unhandled errors, DB connection failures |

## Response Formats

### Success Response
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "message": "Human-readable error description"
}
```

### 500 Response
```json
{
  "message": "Internal server error",
  "correlationId": "9f1c…"
}
```
The `correlationId` is the one on the matching log line, so a user's report can be traced to the
stack trace without the trace leaving the server.

### Validation Error (Registration)
```json
{
  "message": "Name, email, and password are required"
}
```

### Rate Limit Exceeded
```json
{
  "message": "Too many attempts, please try again later"
}
```

### CORS Error
```json
{
  "message": "Not allowed by CORS"
}
```
Status: 403

### File Upload Error
All of these are **400**. A rejected file is the caller's mistake, never a 500. The declared
mimetype is checked in multer's `fileFilter`; the file **content** (magic bytes) is checked in
`middleware/fileContentGuard.js` before the bytes are written or uploaded, so a rejected upload
never reaches Cloudinary. If the guard cannot read the stream's head (it needs to hand the storage
back the bytes it inspected), it **refuses the upload** with a generic 500 rather than forwarding
content it could not check — a security control fails closed.
```json
{ "message": "File too large. Maximum size is 5MB." }
```
```json
{ "message": "Only JPG, JPEG, and PNG files are allowed" }
```
```json
{ "message": "Unable to determine file type from content" }
```
```json
{ "message": "File content is \"image/gif\", only JPEG and PNG are allowed" }
```
```json
{ "message": "File extension \".php\" is not allowed" }
```

### Duplicate Key
```json
{ "message": "A record with that value already exists" }
```
Mongo quotes the collection, the index and the duplicated value in its own message; that is both
an internal detail and an account-existence oracle, so it is never forwarded.

### 404 Not Found
```json
{
  "message": "API endpoint not found"
}
```

## Backend Error Handler

`middleware/errorHandler.js`, mounted last in `server.js`. The rule it exists to enforce: **a
message reaches a response body only when we wrote it.**

```js
// utils/httpError.js
const CLIENT_FACING = Symbol('rentbike.clientFacingError');
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; this[CLIENT_FACING] = true; }
}
const isClientFacing = (err) => Boolean(err && err[CLIENT_FACING] === true);

// middleware/errorHandler.js (order matters)
if (err.message === 'Not allowed by CORS')            → 403 'Not allowed by CORS'
if (UPLOAD_ERRORS[err.code])                          → 400 (multer limit codes, our wording)
if (err.code === 'EBADCSRFTOKEN')                     → 403 'Invalid CSRF token'
if (isClientFacing(err) && typeof err.status === 'number')
                                                      → that status, that message
if (err.name === 'CastError' || 'ValidationError')    → 400 schema message, else 'Invalid request data'
if (err.name === 'JsonWebTokenError' || 'TokenExpiredError') → 401
if (err.code === 11000)                               → 409 'A record with that value already exists'
if (400 <= err.status < 500)                          → that status, canned text for it
otherwise                                             → 500 'Internal server error' + correlationId
```

Gating on a **symbol** rather than an `expose` boolean is deliberate: `http-errors` — the package
behind body-parser and express's own 4xx errors — sets `expose: true` on every client error it
builds, so an `expose` check forwards body-parser's raw parse text to the client.

### What a controller may send

```js
const { HttpError, clientMessage, clientStatus } = require('../utils/httpError');

try {
  const doc = await Model.findById(req.params.id);
  if (!doc) throw new HttpError(404, 'Document not found');   // we wrote this → caller sees it
  res.json(doc);
} catch (err) {
  logger.error('getDocument error', { documentId: req.params.id, error: err.message });
  res.status(clientStatus(err, 400)).json({ message: clientMessage(err, 'Could not load the document') });
}
```

`clientMessage` returns, in order: the `HttpError` message, a mongoose **schema** validation
message (`Path \`expiryDate\` is required.` — our words, naming a field and its constraint), or
the fallback. Never a driver's, a gateway's or a library's message. Every catch logs the real
message first, or the failure disappears from the logs entirely.

`clientStatus(err, fallback)` mirrors the handler's first branches rather than the fallback: an
`HttpError` keeps its own 4xx status, and a `CastError` or schema `ValidationError` answers **400**
— the same mapping the central handler applies. So a catch that wraps a `findById(req.params.id)`
must use it, not a hard-coded `500`: `Model.findById('not-an-id')` throws a `CastError` while
casting the path parameter, and answering 500 for it reports the caller's typo as a server fault.
For the same reason `clientMessage` returns the handler's canned `'Invalid request data'` for those
two error names instead of the fallback. Regression coverage: `test/malformedId.test.mjs` (I4).


## Per-Controller Error Patterns

### Auth Controller
| Scenario | Status | Message |
|----------|--------|---------|
| Missing required fields | 400 | "Name, email, and password are required" |
| Password < 6 chars | 400 | "Password must be at least 6 characters" |
| Name > 100 chars | 400 | "Name cannot exceed 100 characters" |
| Duplicate email | 409 | "Email already registered" |
| Duplicate NID | 409 | "NID already registered" |
| Duplicate license | 409 | "License already registered" |
| Invalid credentials | 401 | "Invalid credentials" |
| Server error | 500 | "Server error during registration" / "Server error during login" |

### Booking Controller
| Scenario | Status | Message |
|----------|--------|---------|
| Missing fields | 400 | "Missing required booking fields" |
| Bike not found | 404 | "Bike not found" |
| Bike unavailable | 400 | "Bike is not available" |
| End date before start | 400 | "End date must be after start date" |
| Booking not found | 404 | "Booking not found" |
| Not authorized | 403 | "Not authorized" |
| Already confirmed | 400 | "Booking already confirmed" |
| Already cancelled | 400 | "Booking already cancelled" |
| Cancel window passed | 400 | "Cannot cancel within 12 hours of start" |
| Confirmation mismatch | 400 | "Invalid booking or payment details" |

### Dashboard Controller
| Scenario | Status | Message |
|----------|--------|---------|
| Missing bike fields | 400 | "Model, brand, category, and price are required" |
| Invalid price | 400 | "Price must be a positive number" |
| Category not found | 404 | "Category not found" |
| Bike not found | 404 | "Bike not found" |
| Category has bikes | 400 | "Cannot delete category with associated bikes" |
| Category in use | 400 | "Category is in use by bikes" |
| Settings update fail | 500 | "Failed to update settings" |
| Category update fail | 500 | "Failed to update category" |

### Payment Controller
| Scenario | Status | Message |
|----------|--------|---------|
| Booking not found | 404 | "Booking not found" |
| Already confirmed | 400 | "Booking already confirmed" |
| Payment initiation fail | 500 | "Failed to initiate payment" |
| SSLCommerz validation fail | 400 | "Payment verification failed" |
| Success page error | 500 | "Failed to load booking details" |

## Client-Side Error Handling

### Toast Notifications
- Success: green toast (`bg-emerald-500/10 border-emerald-500/30`)
- Error: red toast (`bg-red-500/10 border-red-500/30`)
- Auto-dismiss: 5 seconds (3s for errors)

### Axios Interceptor
```js
// api/axios.js
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Image Fallback
```jsx
// onError on all <img> tags
onError={(e) => {
  e.target.src = '/placeholder-bike.jpg';
}}
```

### Loading States
- Skeleton loaders on Home, BikeDetails, AdminDashboard
- Spinner component on form submissions
- Button loading state (`loading` prop)

### Empty States
- `EmptyState` component with icon, title, description
- Used when: no bikes, no bookings, no categories, no policies

## Debugging Tips

1. **Rate limit hit:** Restart backend server (clears in-memory counter)
2. **CORS error:** Check if frontend URL matches whitelist exactly
3. **401 on valid token:** Check JWT_SECRET matches between login and verification
4. **File upload fails:** Check Cloudinary credentials, file size < 5MB, type is JPG/PNG
5. **Seed data missing:** Call `GET /api/seed-temp` (dev only, NODE_ENV !== production)
