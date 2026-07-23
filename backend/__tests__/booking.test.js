const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const {
  createAdminUser, createRenterUser, createRegularUser, createUnverifiedUser,
  createCategory, createBike, createCoupon, createSettings, getToken,
} = require('./helpers/seed');

process.env.JWT_SECRET = 'test-secret';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  await createSettings();
});

afterAll(async () => {
  await mongoose.disconnect();
});

let user, renter, admin, unverified, bike, category, token;

beforeEach(async () => {
  await Booking.deleteMany({});
  await Bike.deleteMany({});
  await mongoose.model('Category').deleteMany({});
  await mongoose.model('User').deleteMany({});
  category = await createCategory();
  renter = await createRenterUser();
  user = await createRegularUser();
  admin = await createAdminUser();
  unverified = await createUnverifiedUser();
  bike = await createBike(renter._id, category._id);
  token = getToken(user);
});

describe('POST /api/booking', () => {
  const baseBooking = () => ({
    bikeId: null,
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 14400000).toISOString(),
  });

  it('creates booking as Pending', async () => {
    const payload = baseBooking();
    payload.bikeId = bike._id.toString();

    const res = await request(app)
      .post('/api/booking')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.booking.status).toBe('Pending');
    expect(res.body.minAdvance).toBeGreaterThan(0);
  });

  it('rejects unverified user', async () => {
    const unverifiedToken = getToken(unverified);
    const res = await request(app)
      .post('/api/booking')
      .set('Authorization', `Bearer ${unverifiedToken}`)
      .send({ bikeId: bike._id.toString(), startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verified/i);
  });

  it('rejects unavailable bike', async () => {
    bike.availability = false;
    await bike.save();

    const res = await request(app)
      .post('/api/booking')
      .set('Authorization', `Bearer ${token}`)
      .send({ bikeId: bike._id.toString(), startTime: new Date().toISOString(), endTime: new Date(Date.now() + 3600000).toISOString() });

    expect(res.status).toBe(409);
  });

  it('ignores overlapping booking (gap: no overlap check implemented yet)', async () => {
    const start = new Date(Date.now() + 3600000);
    const end = new Date(Date.now() + 14400000);

    await Booking.create({
      user: user._id, bike: bike._id, startTime: start, endTime: end,
      totalPrice: 600, status: 'Confirmed',
    });

    const res = await request(app)
      .post('/api/booking')
      .set('Authorization', `Bearer ${token}`)
      .send({ bikeId: bike._id.toString(), startTime: start.toISOString(), endTime: end.toISOString() });

    expect(res.status).toBe(201);
  });

  it('rejects past endTime', async () => {
    const res = await request(app)
      .post('/api/booking')
      .set('Authorization', `Bearer ${token}`)
      .send({ bikeId: bike._id.toString(), startTime: new Date().toISOString(), endTime: new Date(Date.now() - 3600000).toISOString() });

    expect(res.status).toBe(400);
  });

  it('applies coupon atomically', async () => {
    const coupon = await createCoupon({ maxUses: 1, usedCount: 0 });
    const payload = baseBooking();
    payload.bikeId = bike._id.toString();
    payload.couponCode = coupon.code;

    const res = await request(app)
      .post('/api/booking')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.status).toBe(201);

    const { default: Coupon } = await import('../models/Coupon');
    const updated = await Coupon.findById(coupon._id);
    expect(updated.usedCount).toBe(1);

    const res2 = await request(app)
      .post('/api/booking')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...payload, startTime: new Date(Date.now() + 86400000).toISOString(), endTime: new Date(Date.now() + 90000000).toISOString() });

    expect(res2.status).toBe(201);
    expect(res2.body.booking.totalPrice).toBe(bike.pricePerHour * 1);
  });
});

describe('POST /api/booking/confirm', () => {
  it('allows owner to confirm', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Pending',
    });

    const res = await request(app)
      .post('/api/booking/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking._id.toString() });

    expect(res.status).toBe(200);
  });

  it('restricts non-owner non-admin', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Pending',
    });

    const stranger = await mongoose.model('User').create({
      name: 'Stranger', email: 'stranger@test.com', password: 'hashed',
      role: 'User', phoneNumber: '01766666666', nid: '6666666666666',
      license: 'STR001', isVerified: true,
    });
    const strangerToken = getToken(stranger);

    const res = await request(app)
      .post('/api/booking/confirm')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ bookingId: booking._id.toString() });

    expect(res.status).toBe(403);
  });

  it('admin can confirm', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Pending',
    });

    const res = await request(app)
      .post('/api/booking/confirm')
      .set('Authorization', `Bearer ${getToken(admin)}`)
      .send({ bookingId: booking._id.toString() });

    expect(res.status).toBe(200);
  });
});

describe('GET /api/booking/:id', () => {
  it('any authenticated user can view (gap: no ownership check)', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Confirmed',
    });

    const stranger = await mongoose.model('User').create({
      name: 'Stranger', email: 'stranger2@test.com', password: 'hashed',
      role: 'User', phoneNumber: '01777777777', nid: '7777777777777',
      license: 'STR002', isVerified: true,
    });

    const res = await request(app)
      .get(`/api/booking/${booking._id}`)
      .set('Authorization', `Bearer ${getToken(stranger)}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(booking._id.toString());
  });
});

describe('PUT /api/booking/:id/cancel', () => {
  it('owner can cancel own booking', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Confirmed',
    });

    const res = await request(app)
      .put(`/api/booking/${booking._id}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

describe('PUT /api/booking/:id/complete', () => {
  it('admin can complete confirmed booking', async () => {
    await Bike.findByIdAndUpdate(bike._id, { availability: false });
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Confirmed',
    });

    const res = await request(app)
      .put(`/api/booking/${booking._id}/complete`)
      .set('Authorization', `Bearer ${getToken(admin)}`);

    expect(res.status).toBe(200);
  });
});
