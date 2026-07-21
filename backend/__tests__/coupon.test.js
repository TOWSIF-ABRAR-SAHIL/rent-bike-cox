const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Coupon = require('../models/Coupon');
const {
  createAdminUser, getToken, createSettings,
} = require('./helpers/seed');

process.env.JWT_SECRET = 'test-secret';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  await createSettings();
});

afterAll(async () => {
  await mongoose.disconnect();
});

let admin;
let adminToken;

beforeEach(async () => {
  await Coupon.deleteMany({});
  await mongoose.model('User').deleteMany({});
  admin = await createAdminUser();
  adminToken = getToken(admin);
});

describe('POST /api/coupons', () => {
  it('admin creates coupon', async () => {
    const res = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'WELCOME10',
        discountPercent: 10,
        maxUses: 50,
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe('WELCOME10');
  });

  it('rejects non-admin', async () => {
    const user = await require('./helpers/seed').createRegularUser();
    const res = await request(app)
      .post('/api/coupons')
      .set('Authorization', `Bearer ${getToken(user)}`)
      .send({ code: 'NOPE', discountPercent: 10, maxUses: 10, expiresAt: new Date().toISOString() });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/coupons', () => {
  it('lists coupons', async () => {
    await Coupon.create({ code: 'DISCOUNT', discountPercent: 10, maxUses: 10, expiresAt: new Date(Date.now() + 86400000) });

    const res = await request(app)
      .get('/api/coupons')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
  });
});

describe('PUT /api/coupons/:id', () => {
  it('admin updates coupon', async () => {
    const coupon = await Coupon.create({ code: 'OLD', discountPercent: 5, maxUses: 10, expiresAt: new Date(Date.now() + 86400000) });

    const res = await request(app)
      .put(`/api/coupons/${coupon._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discountPercent: 15 });

    expect(res.status).toBe(200);
    expect(res.body.discountPercent).toBe(15);
  });
});

describe('DELETE /api/coupons/:id', () => {
  it('admin deletes coupon', async () => {
    const coupon = await Coupon.create({ code: 'DELETEME', discountPercent: 10, maxUses: 1, expiresAt: new Date(Date.now() + 86400000) });

    const res = await request(app)
      .delete(`/api/coupons/${coupon._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
