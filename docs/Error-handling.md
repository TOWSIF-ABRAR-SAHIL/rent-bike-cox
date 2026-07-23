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
| 409 | Conflict | Duplicate email/nid/license on registration |
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
```json
{
  "message": "File too large. Maximum size is 5MB."
}
```
or
```json
{
  "message": "Only JPG, JPEG, and PNG files are allowed"
}
```

### 404 Not Found
```json
{
  "message": "API endpoint not found"
}
```

## Backend Error Handler

```js
// server.js — global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);  // Log only, not exposed

  if (err.message === 'Not allowed by CORS') → 403
  if (err.code === 'LIMIT_FILE_SIZE') → 400
  if (err.message.includes('Only JPG')) → 400

  // Default: sanitized
  res.status(500).json({ message: 'Internal server error' });
});
```

**Key:** `err.message` is NEVER sent to client in the 500 case.

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
| Invalid credentials | 401 | "Invalid email or password" |
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
