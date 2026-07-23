# Database — Schemas & Relations

## Connection

- **Production:** MongoDB Atlas (`mongodb+srv://rentbike:RentBike2026!@rentbike.jcglevo.mongodb.net/rentbike`)
- **Local fallback:** `mongodb://localhost:27017/rentbike`
- **Driver:** Mongoose 9.6.1

## Collections (9 models)

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
  createdAt:      { type: Date, default: Date.now }
}
```
- Indexes: unique compound (model, brand, category, renter)
- References: Category, User (renter). Referenced by Booking.

### Booking
```js
{
  user:           { type: ObjectId, ref: 'User', required: true },
  bike:           { type: ObjectId, ref: 'Bike', required: true },
  renter:         { type: ObjectId, ref: 'User', required: true },
  startDate:      { type: Date, required: true },
  endDate:        { type: Date, required: true },
  totalAmount:    { type: Number, required: true },
  advanceAmount:  { type: Number, required: true },
  status:         { type: String, enum: ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'], default: 'Pending' },
  invoiceNumber:  { type: String, unique: true },
  tranId:         { type: String },
  paymentMethod:  { type: String },
  createdAt:      { type: Date, default: Date.now }
}
```
- Indexes: unique on invoiceNumber, tranId
- References: User (user, renter), Bike. Consumed by Counter (invoice number generation).

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

## Entity Relationship Diagram

```
User (1) ──────< (N) Bike          [renter owns bikes]
User (1) ──────< (N) Booking       [user makes bookings]
User (1) ──────< (N) Booking       [renter receives bookings]
Bike  (1) ──────< (N) Booking      [bike is booked]
Bike  (N) >───── (1) Category      [bike has category]

Settings: singleton (1 document)
Counter:  singleton per type (invoice counter)
Policy:   independent collection
Coupon:   independent collection
```

## Current Database State

| Collection | Count | Notes |
|------------|-------|-------|
| users | 3+ | admin, renter, test user |
| bikes | 3 | TVS Access 125, Honda Dio 110, TVS Jupiter 110 |
| categories | 3 | Bike, Car, Jeep |
| bookings | 0 | Empty (clean DB) |
| settings | 1 | Base: 175 TK/hr, 4 packages |
| policies | 0 | Empty |
| coupons | 0 | Empty |
