const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Booking = require('../models/Booking');
const Bike = require('../models/Bike');
const { setValidationResult } = require('./helpers/mockSslCommerz');
const {
  createAdminUser, createRenterUser, createRegularUser,
  createCategory, createBike, createSettings, getToken,
} = require('./helpers/seed');
const User = require('../models/User');

setValidationResult({ status: 'VALID' });

process.env.JWT_SECRET = 'test-secret';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  await createSettings();
});

afterAll(async () => {
  await mongoose.disconnect();
});

let user, renter, bike, category, token;

beforeEach(async () => {
  await Booking.deleteMany({});
  await Bike.deleteMany({});
  await mongoose.model('Category').deleteMany({});
  await mongoose.model('User').deleteMany({});
  category = await createCategory();
  renter = await createRenterUser();
  user = await createRegularUser();
  bike = await createBike(renter._id, category._id);
  token = getToken(user);
});

describe('POST /api/payment/init', () => {
  it('rejects non-owner', async () => {
    const User = require('../models/User');
    const otherUser = await User.create({
      name: 'Other User', email: 'other@test.com', password: 'hashed',
      role: 'User', phoneNumber: '01755555555', nid: '5555555555555',
      license: 'OTH001', isVerified: true,
    });
    const otherToken = getToken(otherUser);
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Pending',
    });

    const res = await request(app)
      .post('/api/payment/init')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ bookingId: booking._id.toString() });

    expect(res.status).toBe(403);
  });

  it('rejects already-paid booking', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Confirmed',
    });

    const res = await request(app)
      .post('/api/payment/init')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking._id.toString() });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/payment/success/:bookingId/:tranId', () => {
  it('confirms booking and redirects to invoice', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Pending', tranId: 'test-tran-123',
    });

    const res = await request(app)
      .get(`/api/payment/success/${booking._id}/test-tran-123`);

    expect(res.status).toBe(302);
    const updated = await Booking.findById(booking._id);
    expect(updated.status).toBe('Confirmed');
  });

  it('is idempotent on retry', async () => {
    const booking = await Booking.create({
      user: user._id, bike: bike._id,
      startTime: new Date(), endTime: new Date(Date.now() + 3600000),
      totalPrice: 400, status: 'Confirmed',
    });

    const res = await request(app)
      .get(`/api/payment/success/${booking._id}/some-tran`);

    expect(res.status).toBe(302);
  });
});

describe('POST /api/payment/fail', () => {
  it('redirects to payment-failed', async () => {
    const res = await request(app).post('/api/payment/fail');
    expect(res.status).toBe(302);
    expect(res.headers.location).toMatch(/payment-failed/i);
  });
});
