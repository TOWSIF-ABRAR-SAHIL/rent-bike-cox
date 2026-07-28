# Database — Schemas & Relations

## Connection

- **Production:** MongoDB Atlas (`mongodb+srv://rentbike:RentBike2026!@rentbike.jcglevo.mongodb.net/rentbike`)
- **Local fallback:** `mongodb://localhost:27017/rentbike`
- **Driver:** Mongoose 9.6.1

## Collections (28 models)

### User
```js
{
  name:           { type: String, required: true, trim: true, maxlength: 100 },
  email:          { type: String, required: true, unique: true, lowercase: true },
  password:       { type: String, required: true, minlength: 6, select: false },
  role:           { type: String, enum: ['Admin', 'Renter', 'User'], default: 'User' },
  phoneNumber:    { type: String },
  nid:            { type: String, required: true, unique: true },
  nidImage:       { type: String },  // Cloudinary URL
  license:        { type: String, required: true, unique: true },
  licenseImage:   { type: String },  // Cloudinary URL
  address:        { type: String },
  isVerified:     { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}
```
- Indexes: unique on email, nid, license
- Referenced by: Bike (renter), Booking (user, renter)

### Bike
```js
{
  model:          { type: String, required: true },
  brand:          { type: String, required: true },
  category:       { type: ObjectId, ref: 'Category', required: true },
  description:    { type: String },
  pricePerHour:   { type: Number, required: true, min: 1, max: 100000 },
  images:         [{ type: String }],  // Cloudinary URLs
  availability:   { type: Boolean, default: true },
  isVerified:     { type: Boolean, default: false },
  renter:         { type: ObjectId, ref: 'User', required: true },
  zone:           { type: ObjectId, ref: 'Zone', default: null },
  tierPricing:    [{ minHours: Number, maxHours: Number, pricePerHour: Number }],
  condition:      { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
  currentMileage: { type: Number, default: 0 },
  lastServiceDate:{ type: Date },
  nextServiceDue: { type: Date },
  isUnderMaintenance: { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}
```
- Indexes: unique compound (model, brand, category, renter), zone, category+availability
- References: Category, User (renter), Zone. Referenced by Booking.

### Booking
```js
{
  user:           { type: ObjectId, ref: 'User', required: true },
  bike:           { type: ObjectId, ref: 'Bike', required: true },
  startTime:      { type: Date, required: true },
  endTime:        { type: Date, required: true },
  totalPrice:     { type: Number, required: true },
  advancePaid:    { type: Number, default: 0 },
  remainingBalance:{ type: Number, default: 0 },
  advancePercent: { type: Number },
  status:         { type: String, enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Expired'] },
  state:          { type: String, enum: ['DRAFT', 'PAYMENT_PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'] },
  stateHistory:   [{ from: String, to: String, at: Date, actor: String, reason: String }],
  paymentStatus:  { type: String, enum: ['Unpaid', 'Partial', 'Paid', 'Refunded'] },
  invoiceNumber:  { type: String, unique: true },
  serialNumber:   { type: Number },
  tranId:         { type: String },
  paymentMethod:  { type: String },
  securityDeposit:{ type: Number, default: 2000 },
  securityDepositPaid: { type: Boolean, default: false },
  securityDepositRefunded: { type: Boolean, default: false },
  destination:    { type: String },
  pickupLocation: { type: String },
  packageName:    { type: String },
  couponApplied:  { type: ObjectId, ref: 'Coupon' },
  fraudScore:     { type: Number, default: 0 },
  fraudFlags:     [{ type: String }],
  isWalkIn:       { type: Boolean, default: false },
  customerName:   { type: String },
  customerPhone:  { type: String },
  customerNid:    { type: String },
  bookingCode:    { type: String },
  refundIds:      [{ type: ObjectId, ref: 'Refund' }],
  refundAmount:   { type: Number, default: 0 },
  cancellationAt: { type: Date },
  cancellationReason: { type: String },
  lockedAt:       { type: Date },
  expiresAt:      { type: Date },
  createdAt:      { type: Date, default: Date.now }
}
```
- Indexes: bike+status+startTime+endTime, invoiceNumber, serialNumber, paymentStatus, createdAt

### Counter
```js
{
  _id:            { type: String },  // e.g., 'invoice'
  seq:            { type: Number, default: 0 }
}
```
- Purpose: Auto-increment for invoice numbers (RBC-YYYY-XXXXXX). Singleton document per counter type.

### Category
```js
{
  name:           { type: String, required: true, unique: true, trim: true },
  slug:           { type: String, required: true, unique: true, lowercase: true, trim: true },
  isActive:       { type: Boolean, default: true }
}
```
- Referenced by: Bike. Deletion blocked while bikes reference it.

### Settings
```js
{
  basePricePerHour: { type: Number, default: 200 },
  packages: [{
    name:         { type: String, required: true },
    duration:     { type: String, required: true },
    price:        { type: Number, required: true },
    description:  { type: String }
  }]
}
```
- Singleton: one document stores global pricing. Seeded on-demand if missing.
- Default packages: 1-Day(2000), 2-Day(3500), 1-Week(10000), Monthly(35000)

### Policy
```js
{
  title:          { type: String, required: true, trim: true },
  content:        { type: String, required: true },
  type:           { type: String, enum: ['general', 'cancellation', 'damage', 'rental', 'payment'], default: 'general' },
  sortOrder:      { type: Number, default: 0 },
  isActive:       { type: Boolean, default: true },
  createdAt:      { type: Date, default: Date.now },
  updatedAt:      { type: Date, default: Date.now }
}
```
- Displayed on public `/policies` page. Admin manages via CRUD.

### Coupon
```js
{
  code:           { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountPercent:{ type: Number, required: true, min: 1, max: 100 },
  expiryDate:     { type: Date, required: true },
  isActive:       { type: Boolean, default: true },
  maxUses:        { type: Number, default: 0 },  // 0 = unlimited
  usedCount:      { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now }
}
```
- Discount codes applied at checkout. Admin CRUD only.

### Zone
```js
{
  name:           { type: String, required: true, trim: true },
  slug:           { type: String, required: true, unique: true, lowercase: true },
  description:    { type: String },
  polygon:        [{ lat: Number, lng: Number }],  // GeoJSON-like boundary
  center:         { lat: Number, lng: Number },
  bounds:         { north: Number, south: Number, east: Number, west: Number },
  color:          { type: String, default: '#f59e0b' },
  highlights:     [{ type: String }],
  distanceFromCenter: { type: Number },
  typicalRentPrice:  { type: Number },
  isActive:       { type: Boolean, default: true }
}
```
- Seeded with 8 Cox's Bazar zones. Referenced by Bike.

### PaymentIntent
```js
{
  booking:        { type: ObjectId, ref: 'Booking', required: true },
  user:           { type: ObjectId, ref: 'User', required: true },
  amount:         { type: Number, required: true },
  currency:       { type: String, default: 'BDT' },
  status:         { type: String, enum: ['pending', 'completed', 'failed', 'expired'] },
  tranId:         { type: String },
  gatewayResponse: { type: Object },
  createdAt:      { type: Date, default: Date.now }
}
```
- Tracks SSLCommerz payment session lifecycle.

### Refund
```js
{
  booking:        { type: ObjectId, ref: 'Booking', required: true },
  amount:         { type: Number, required: true },
  reason:         { type: String },
  status:         { type: String, enum: ['pending', 'approved', 'rejected', 'processed'] },
  adminNote:      { type: String },
  processedAt:    { type: Date },
  createdAt:      { type: Date, default: Date.now }
}
```

### AuditLog
```js
{
  actor:          { type: ObjectId, ref: 'User', required: true },
  action:         { type: String, required: true },
  resource:       { type: String },
  resourceId:     { type: String },
  details:        { type: Object },
  createdAt:      { type: Date, default: Date.now }
}
```

### LedgerEntry
```js
{
  booking:        { type: ObjectId, ref: 'Booking' },
  type:           { type: String, enum: ['income', 'expense', 'refund', 'payout'] },
  amount:         { type: Number, required: true },
  description:    { type: String },
  createdAt:      { type: Date, default: Date.now }
}
```

### Payout
```js
{
  renter:         { type: ObjectId, ref: 'User', required: true },
  amount:         { type: Number, required: true },
  status:         { type: String, enum: ['pending', 'approved', 'paid', 'rejected'] },
  method:         { type: String },
  createdAt:      { type: Date, default: Date.now }
}
```

### FraudEvent
```js
{
  user:           { type: ObjectId, ref: 'User', required: true },
  booking:        { type: ObjectId, ref: 'Booking' },
  type:           { type: String, required: true },
  severity:       { type: String, enum: ['low', 'medium', 'high'] },
  details:        { type: Object },
  createdAt:      { type: Date, default: Date.now }
}
```

### RefreshToken
```js
{
  user:           { type: ObjectId, ref: 'User', required: true },
  token:          { type: String, required: true },
  expiresAt:      { type: Date, required: true },
  createdAt:      { type: Date, default: Date.now }
}
```

### BlacklistedToken
```js
{
  token:          { type: String, required: true },
  expiresAt:      { type: Date, required: true },
  createdAt:      { type: Date, default: Date.now }
}
```

### LoginAttempt
```js
{
  email:          { type: String, required: true },
  ip:             { type: String },
  success:        { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}
```

### PasswordReset
```js
{
  email:          { type: String, required: true },
  otp:            { type: String, required: true },
  expiresAt:      { type: Date, required: true },
  used:           { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}
```

### IdempotencyKey
```js
{
  key:            { type: String, required: true, unique: true },
  response:       { type: Object },
  expiresAt:      { type: Date, required: true },
  createdAt:      { type: Date, default: Date.now }
}
```

### CircuitBreaker
```js
{
  service:        { type: String, required: true },
  state:          { type: String, enum: ['closed', 'open', 'half-open'] },
  failureCount:   { type: Number, default: 0 },
  lastFailureAt:  { type: Date },
  createdAt:      { type: Date, default: Date.now }
}
```

### MaintenanceLog
```js
{
  bike:           { type: ObjectId, ref: 'Bike', required: true },
  type:           { type: String, required: true },
  description:    { type: String },
  cost:           { type: Number },
  performedBy:    { type: String },
  nextDue:        { type: Date },
  createdAt:      { type: Date, default: Date.now }
}
```

### MaintenanceNotification
```js
{
  bike:           { type: ObjectId, ref: 'Bike', required: true },
  message:        { type: String, required: true },
  type:           { type: String },
  read:           { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}
```

### Notification
```js
{
  user:           { type: ObjectId, ref: 'User', required: true },
  title:          { type: String, required: true },
  message:        { type: String, required: true },
  type:           { type: String },
  read:           { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}
```

### NotificationPreference
```js
{
  user:           { type: ObjectId, ref: 'User', required: true, unique: true },
  email:          { type: Boolean, default: true },
  push:           { type: Boolean, default: true },
  inApp:          { type: Boolean, default: true }
}
```

### Review
```js
{
  user:           { type: ObjectId, ref: 'User', required: true },
  bike:           { type: ObjectId, ref: 'Bike', required: true },
  booking:        { type: ObjectId, ref: 'Booking' },
  rating:         { type: Number, required: true, min: 1, max: 5 },
  comment:        { type: String },
  response:       { type: String },
  respondedAt:    { type: Date },
  createdAt:      { type: Date, default: Date.now }
}
```

### SeasonalRate
```js
{
  name:           { type: String, required: true },
  category:       { type: ObjectId, ref: 'Category' },
  multiplier:     { type: Number, required: true, min: 0.5, max: 3 },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  type:           { type: String, enum: ['peak', 'off-peak', 'holiday'] },
  isActive:       { type: Boolean, default: true }
}
```

### VehicleDocument
```js
{
  bike:           { type: ObjectId, ref: 'Bike', required: true },
  type:           { type: String, enum: ['registration', 'insurance', 'fitness', 'other'] },
  fileUrl:        { type: String },
  expiryDate:     { type: Date },
  isVerified:     { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now }
}
```

### PushSubscription
```js
{
  user:           { type: ObjectId, ref: 'User', required: true },
  endpoint:       { type: String, required: true },
  keys:           { p256dh: String, auth: String },
  createdAt:      { type: Date, default: Date.now }
}
```

## Entity Relationship Diagram

```
User (1) ──────< (N) Bike              [renter owns bikes]
User (1) ──────< (N) Booking           [user makes bookings]
Bike  (1) ──────< (N) Booking          [bike is booked]
Bike  (N) >───── (1) Category          [bike has category]
Bike  (N) >───── (1) Zone              [bike in zone]
Booking (1) ────< (N) Refund           [booking refunds]
Booking (1) ────< (N) PaymentIntent    [payment session]
Booking (1) ────< (N) LedgerEntry      [financial records]
Booking (1) ────< (N) AuditLog         [audit trail]
User (1) ──────< (N) Notification      [in-app notifications]
User (1) ──────< (1) NotificationPreference [push/email/inApp toggles]
User (1) ──────< (N) Review            [bike reviews]
User (1) ──────< (N) PushSubscription  [web push endpoints]
Bike  (1) ──────< (N) MaintenanceLog   [maintenance history]
Bike  (1) ──────< (N) VehicleDocument  [registration/insurance]
Bike  (1) ──────< (N) Review           [bike ratings]
Category (1) ───< (N) SeasonalRate     [seasonal pricing]

Settings:  singleton (global pricing)
Counter:   singleton per type (invoice)
Policy:    independent collection
Coupon:    independent collection
Zone:      independent collection (seeded with Cox's Bazar zones)
PasswordReset: OTP tokens (15-min expiry)
RefreshToken:  JWT refresh tokens
BlacklistedToken: logged-out tokens
LoginAttempt:  security tracking
CircuitBreaker: payment gateway state
IdempotencyKey: duplicate prevention
FraudEvent:    suspicious activity
Payout:        renter payouts
```

## Current Database State

| Collection | Count | Notes |
|------------|-------|-------|
| users | 3+ | admin, renter, test user |
| bikes | 3 | TVS Scooty, Honda Dio 110, TVS Jupiter 110 |
| categories | 3 | Bike, Car, Jeep |
| zones | 8 | Cox's Bazar zones (seeded) |
| bookings | 0 | Empty (clean DB) |
| settings | 1 | Base: 175 TK/hr, 4 packages |
| policies | 0 | Empty |
| coupons | 0 | Empty |
