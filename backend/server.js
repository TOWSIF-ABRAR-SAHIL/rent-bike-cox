require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const bookingRoutes = require('./routes/booking');
const paymentRoutes = require('./routes/payment');
const couponRoutes = require('./routes/coupon');
const policyRoutes = require('./routes/policy');

const app = express();

// Security & Performance Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://rent-bike-cox.vercel.app',
  'http://localhost:5173',
  'https://sandbox.sslcommerz.com',
  'https://sslcommerz.com'
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Temporary seed endpoint — only in development
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
const Bike = require('./models/Bike');

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/seed-temp', async (req, res) => {
  try {
    // Seed admin
    const salt = await bcrypt.genSalt(10);
    let admin = await User.findOne({ email: 'admin@rentbikecox.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: 'admin@rentbikecox.com',
        password: await bcrypt.hash('admin123', salt),
        role: 'Admin',
        phoneNumber: '01700000000',
        nid: '0000000000000',
        license: 'ADMIN000',
        isVerified: true
      });
    }

    // Seed renter
    let renter = await User.findOne({ email: 'renter@rentbikecox.com' });
    if (!renter) {
      renter = await User.create({
        name: 'Cox Bike Rentals',
        email: 'renter@rentbikecox.com',
        password: await bcrypt.hash('renter123', salt),
        role: 'Renter',
        nid: '1234567890124',
        license: 'DL-123456',
        phoneNumber: '01891154443',
        address: "Cox's Bazar, Bangladesh",
        isVerified: true
      });
    }

    // Seed test user
    let testUser = await User.findOne({ email: 'user@rentbikecox.com' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Test Customer',
        email: 'user@rentbikecox.com',
        password: await bcrypt.hash('user123', salt),
        role: 'User',
        nid: '9876543210124',
        license: 'DL-654321',
        phoneNumber: '01764466757',
        address: 'Dhaka, Bangladesh',
        isVerified: true
      });
    }

    // Seed categories
    const defaultCategories = [
      { name: 'Bike', slug: 'bike' },
      { name: 'Car', slug: 'car' },
      { name: 'Microbus', slug: 'microbus' },
      { name: 'SUV', slug: 'suv' },
      { name: 'Van', slug: 'van' }
    ];
    for (const cat of defaultCategories) {
      const exists = await Category.findOne({ slug: cat.slug });
      if (!exists) {
        await Category.create(cat);
      }
    }
    const categories = await Category.find();
    const catMap = {};
    categories.forEach(c => { catMap[c.slug] = c._id; });

    const debugInfo = { categoriesFound: categories.length, catMapKeys: Object.keys(catMap), bikeCount: await Bike.countDocuments() };

    // Seed bikes
    const bikeCount = await Bike.countDocuments();
    if (bikeCount < 5) {
      const demoBikes = [
        { model: 'Yamaha FZ-S V3', brand: 'Yamaha', categorySlug: 'bike', description: 'Popular street bike with 149cc engine. Perfect for city rides and coastal roads in Cox\'s Bazar.', pricePerHour: 200, images: ['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=600&fit=crop'] },
        { model: 'Honda CB Hornet 160R', brand: 'Honda', categorySlug: 'bike', description: 'Reliable Honda commuter with sporty looks. 162cc engine, great power for beach rides.', pricePerHour: 200, images: ['https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop'] },
        { model: 'Bajaj Pulsar NS160', brand: 'Bajaj', categorySlug: 'bike', description: 'Sporty naked streetfighter. 160cc oil-cooled engine with perimeter frame.', pricePerHour: 220, images: ['https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop'] },
        { model: 'Toyota Axio 2018', brand: 'Toyota', categorySlug: 'car', description: 'Comfortable sedan for family trips. AC, GPS, spacious boot.', pricePerHour: 800, images: ['https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=600&fit=crop'] },
        { model: 'Toyota HiAce Commuter', brand: 'Toyota', categorySlug: 'microbus', description: 'Spacious 12-seater microbus for group tours. AC and music system.', pricePerHour: 1500, images: ['https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop'] },
        { model: 'TVS Apache RTR 160', brand: 'TVS', categorySlug: 'bike', description: 'Racing-inspired commuter with dual disc brakes.', pricePerHour: 180, images: ['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop'] },
        { model: 'Hero Splendor Plus', brand: 'Hero', categorySlug: 'bike', description: 'Most trusted commuter bike. Exceptional fuel economy.', pricePerHour: 150, images: ['https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&h=600&fit=crop'] },
        { model: 'Toyota Allion 2019', brand: 'Toyota', categorySlug: 'car', description: 'Premium sedan with leather seats. Ideal for transfers.', pricePerHour: 900, images: ['https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop'] },
        { model: 'Hyundai H1 Premium', brand: 'Hyundai', categorySlug: 'microbus', description: 'Luxury microbus with 9 comfortable seats.', pricePerHour: 1800, images: ['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&h=600&fit=crop'] },
        { model: 'Toyota Premio 2017', brand: 'Toyota', categorySlug: 'car', description: 'Reliable fuel-efficient sedan. Automatic, AC, power windows.', pricePerHour: 750, images: ['https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=600&fit=crop','https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=600&fit=crop'] }
      ];
      for (const b of demoBikes) {
        await Bike.create({ ...b, category: catMap[b.categorySlug], availability: true, isVerified: true, renter: renter._id });
      }
    }

    res.json({ message: 'Seeded successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Seeding failed' });
  }
});
}

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts, please try again later' }
});
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/policies', policyRoutes);

// 404 handler
app.use('/api/{*splat}', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Not allowed by CORS' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
  }
  if (err.message && err.message.includes('Only JPG')) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error' });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
