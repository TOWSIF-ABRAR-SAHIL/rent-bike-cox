const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Bike = require('../models/Bike');
const {
  createAdminUser, createRenterUser, createRegularUser,
  createCategory, createBike, createSettings, getToken,
} = require('./helpers/seed');

process.env.JWT_SECRET = 'test-secret';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
  await createSettings();
});

afterAll(async () => {
  await mongoose.disconnect();
});

let renter, admin, category, token;

beforeEach(async () => {
  await Bike.deleteMany({});
  await mongoose.model('Category').deleteMany({});
  await mongoose.model('User').deleteMany({});
  category = await createCategory();
  renter = await createRenterUser();
  admin = await createAdminUser();
  token = getToken(admin);
});

describe('GET /api/dashboard/admin/bikes', () => {
  it('admin can list all bikes', async () => {
    await Bike.create({ model: 'Bike A', brand: 'Brand', description: 'Desc', pricePerHour: 100, category: category._id, renter: renter._id, images: [] });

    const res = await request(app)
      .get('/api/dashboard/admin/bikes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/dashboard/bikes/available', () => {
  it('returns public available bikes', async () => {
    await Bike.create({ model: 'Bike A', brand: 'Brand', description: 'Desc', pricePerHour: 100, category: category._id, renter: renter._id, images: [] });

    const res = await request(app).get('/api/dashboard/bikes/available');
    expect(res.status).toBe(200);
  });
});
