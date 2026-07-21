const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const Bike = require('../../models/Bike');
const Category = require('../../models/Category');
const Coupon = require('../../models/Coupon');
const Settings = require('../../models/Settings');

async function createAdminUser() {
  const salt = await bcrypt.genSalt(10);
  return User.create({
    name: 'Admin User',
    email: 'admin@test.com',
    password: await bcrypt.hash('password123', salt),
    role: 'Admin',
    phoneNumber: '01711111111',
    nid: '1111111111111',
    license: 'ADMIN001',
    isVerified: true,
  });
}

async function createRenterUser() {
  const salt = await bcrypt.genSalt(10);
  return User.create({
    name: 'Renter User',
    email: 'renter@test.com',
    password: await bcrypt.hash('password123', salt),
    role: 'Renter',
    phoneNumber: '01722222222',
    nid: '2222222222222',
    license: 'RNT001',
    isVerified: true,
  });
}

async function createRegularUser() {
  const salt = await bcrypt.genSalt(10);
  return User.create({
    name: 'Regular User',
    email: 'user@test.com',
    password: await bcrypt.hash('password123', salt),
    role: 'User',
    phoneNumber: '01733333333',
    nid: '3333333333333',
    license: 'USR001',
    isVerified: true,
  });
}

async function createUnverifiedUser() {
  const salt = await bcrypt.genSalt(10);
  return User.create({
    name: 'Unverified User',
    email: 'unverified@test.com',
    password: await bcrypt.hash('password123', salt),
    role: 'User',
    phoneNumber: '01744444444',
    nid: '4444444444444',
    license: 'UNV001',
    isVerified: false,
  });
}

async function createCategory(name = 'Bike', slug = 'bike') {
  return Category.create({ name, slug });
}

async function createBike(renterId, categoryId, overrides = {}) {
  return Bike.create({
    model: 'Test Bike',
    brand: 'TestBrand',
    category: categoryId,
    description: 'A test bike',
    pricePerHour: 200,
    images: ['https://example.com/bike.jpg'],
    availability: true,
    isVerified: true,
    renter: renterId,
    ...overrides,
  });
}

async function createCoupon(overrides = {}) {
  return Coupon.create({
    code: 'TEST10',
    discountPercent: 10,
    isActive: true,
    maxUses: 10,
    usedCount: 0,
    ...overrides,
  });
}

async function createSettings() {
  const existing = await Settings.findOne();
  if (existing) return existing;
  return Settings.create({
    basePricePerHour: 200,
    packages: [
      { name: '1 Day', price: 1200, hours: 24 },
      { name: '2 Days', price: 2000, hours: 48 },
    ],
  });
}

function getToken(user) {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1d' });
}

module.exports = {
  createAdminUser,
  createRenterUser,
  createRegularUser,
  createUnverifiedUser,
  createCategory,
  createBike,
  createCoupon,
  createSettings,
  getToken,
};
