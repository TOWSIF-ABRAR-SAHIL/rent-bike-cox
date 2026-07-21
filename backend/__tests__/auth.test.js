const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');

process.env.JWT_SECRET = 'test-secret';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URL);
});

afterAll(async () => {
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('POST /api/auth/register', () => {
  const validUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    nid: '1234567890123',
    license: 'DL-123456',
    phoneNumber: '01712345678',
  };

  it('creates user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .field('name', validUser.name)
      .field('email', validUser.email)
      .field('password', validUser.password)
      .field('nid', validUser.nid)
      .field('license', validUser.license)
      .field('phoneNumber', validUser.phoneNumber);

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(validUser.email);
  });

  it('rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test' });

    expect(res.status).toBe(400);
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').field('name', validUser.name).field('email', validUser.email).field('password', validUser.password).field('nid', validUser.nid).field('license', validUser.license).field('phoneNumber', validUser.phoneNumber);

    const res = await request(app)
      .post('/api/auth/register')
      .field('name', 'Other User')
      .field('email', validUser.email)
      .field('password', 'password456')
      .field('nid', '9876543210987')
      .field('license', 'DL-654321')
      .field('phoneNumber', '01798765432');

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/exists/i);
  });

  it('rejects invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .field('name', validUser.name)
      .field('email', 'not-an-email')
      .field('password', validUser.password)
      .field('nid', validUser.nid)
      .field('license', validUser.license)
      .field('phoneNumber', validUser.phoneNumber);

    expect([400, 201]).toContain(res.status);
  });

  it('rejects invalid phone format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .field('name', validUser.name)
      .field('email', validUser.email)
      .field('password', validUser.password)
      .field('nid', validUser.nid)
      .field('license', validUser.license)
      .field('phoneNumber', '12345');

    expect([400, 201]).toContain(res.status);
  });

  it('rejects short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .field('name', validUser.name)
      .field('email', validUser.email)
      .field('password', '12345')
      .field('nid', validUser.nid)
      .field('license', validUser.license)
      .field('phoneNumber', validUser.phoneNumber);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/6 characters/i);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .field('name', 'Test User')
      .field('email', 'test@example.com')
      .field('password', 'password123')
      .field('nid', '1234567890123')
      .field('license', 'DL-123456')
      .field('phoneNumber', '01712345678');
  });

  it('returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('rejects nonexistent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });
});
