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
const financialRoutes = require('./routes/financial');
const documentRoutes = require('./routes/documents');
const pricingRoutes = require('./routes/pricing');
const { startCleanupScheduler } = require('./utils/checkoutCleanup');
const correlationId = require('./middleware/correlationId');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const healthRoutes = require('./routes/health');
const auditRoutes = require('./routes/audit');
const fraudRoutes = require('./routes/fraud');
const payoutRoutes = require('./routes/payout');
const maintenanceRoutes = require('./routes/maintenance');
const availabilityRoutes = require('./routes/availability');
const zoneRoutes = require('./routes/zone');
const fleetRoutes = require('./routes/fleet');
const bulkRoutes = require('./routes/bulk');
const vehicleHistoryRoutes = require('./routes/vehicleHistory');
const searchRoutes = require('./routes/search');
const analyticsRoutes = require('./routes/analytics');
const engagementRoutes = require('./routes/engagement');
const seasonalRoutes = require('./routes/seasonal');
const vehicleDocRoutes = require('./routes/vehicleDoc');
const notificationPrefRoutes = require('./routes/notificationPref');
const pushRoutes = require('./routes/push');
const contentRoutes = require('./routes/content');
const adminContentRoutes = require('./routes/adminContent');
const notificationTemplateRoutes = require('./routes/notificationTemplates');
const announcementRoutes = require('./routes/announcements');
const faqRoutes = require('./routes/faqs');
const contactRoutes = require('./routes/contact');
const adminNotificationRoutes = require('./routes/adminNotifications');
const campaignRoutes = require('./routes/campaigns');
const systemHealthRoutes = require('./routes/systemHealth');
const reportRoutes = require('./routes/reports');
const disputeRoutes = require('./routes/dispute');
const logRoutes = require('./routes/logs');
const cacheRoutes = require('./routes/cache');
const rateLimitRoutes = require('./routes/rateLimit');
const { registerLimiter } = require('./controllers/rateLimitController');
const { getMetrics } = require('./utils/metrics');
const { startExpiredIntentCleanup } = require('./jobs/expiredIntentCleanup');
const { startBookingStateTransition } = require('./jobs/bookingStateTransition');
const { startDataRetention } = require('./jobs/dataRetention');
const { startMaintenanceReminder } = require('./jobs/maintenanceReminder');
const { startAutoHeal } = require('./jobs/autoHeal');
const { startCleanupScheduler } = require('./jobs/cleanupScheduler');
const { startScheduledMaintenance } = require('./jobs/scheduledMaintenance');
const { startEmailCampaignSender } = require('./jobs/emailCampaignSender');
const mongoSanitize = require('./middleware/sanitize');
const hpp = require('hpp');
const securityHeaders = require('./security/middleware/securityHeaders');
const authMiddleware = require('./middleware/authMiddleware');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Register gateways
const gatewayRegistry = require('./gateways/GatewayRegistry');
const SSLCommerzGateway = require('./gateways/SSLCommerzGateway');
gatewayRegistry.register(new SSLCommerzGateway());

const app = express();

// Trust proxy (required for rate limiting behind Render's reverse proxy)
app.set('trust proxy', 1);

// Request timeout (30s)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ message: 'Request timeout' });
    }
  });
  res.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(503).json({ message: 'Service temporarily unavailable' });
    }
  });
  next();
});

// Correlation ID + request logging — before all routes
app.use(correlationId);
app.use(requestLogger);

// Additional security middleware
app.use(securityHeaders);
app.use(mongoSanitize());
app.use(hpp());

// Security & Performance Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL, "https://sandbox.sslcommerz.com"].filter(Boolean),
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.vimeo.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    }
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use(compression());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://rent-bike-cox.vercel.app',
  process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : null,
  'https://sandbox.sslcommerz.com',
  'https://sslcommerz.com',
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

// Swagger API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Rent Bike API Docs',
}));

// Health check
app.use('/api/health', healthRoutes);
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metrics (admin only)
app.get('/api/metrics', authMiddleware, (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  res.json(getMetrics());
});

// Temporary seed endpoint — only in non-production, requires secret query param
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
const Bike = require('./models/Bike');

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/seed-temp', (req, res, next) => {
    if (!process.env.SEED_SECRET) {
      return res.status(404).json({ message: 'Not found' });
    }
    if (req.query.secret !== process.env.SEED_SECRET) {
      return res.status(404).json({ message: 'Invalid secret' });
    }
    next();
  }, async (req, res) => {
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
        const pph = b.pricePerHour;
        const packages = [
          { label: '1-2 Hours', minHours: 1, maxHours: 2, hourlyRate: pph },
          { label: '3-4 Hours', minHours: 3, maxHours: 4, hourlyRate: Math.round(pph * 0.9) },
          { label: '5+ Hours', minHours: 5, maxHours: null, hourlyRate: Math.max(150, Math.round(pph * 0.75)) },
        ];
        await Bike.create({ ...b, category: catMap[b.categorySlug], availability: true, isVerified: true, renter: renter._id, packages });
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
  max: 5,
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);
registerLimiter('auth', authLimiter);

// Rate limiting on booking/payment routes (prevent abuse)
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: 'Too many booking requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/booking', bookingLimiter);
registerLimiter('booking', bookingLimiter);

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many payment requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/payment', paymentLimiter);
registerLimiter('payment', paymentLimiter);

const financialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/financial', financialLimiter);
registerLimiter('financial', financialLimiter);

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many file uploads, please try again later' },
});
registerLimiter('upload', uploadLimiter);

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later' },
});

app.use('/api', globalLimiter);
registerLimiter('global', globalLimiter);

// Additional targeted rate limiters
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many search requests, please try again later' },
});
app.use('/api/search', searchLimiter);
registerLimiter('search', searchLimiter);

const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many dashboard requests, please try again later' },
});
app.use('/api/dashboard', dashboardLimiter);
registerLimiter('dashboard', dashboardLimiter);

const fleetLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many fleet requests, please try again later' },
});
app.use('/api/fleet', fleetLimiter);
registerLimiter('fleet', fleetLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/booking', bookingRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/fraud', fraudRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/bulk', bulkRoutes);
app.use('/api/vehicle-history', vehicleHistoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', engagementRoutes);
app.use('/api', seasonalRoutes);
app.use('/api', vehicleDocRoutes);
app.use('/api', notificationPrefRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin/content', adminContentRoutes);
app.use('/api/admin/notification-templates', notificationTemplateRoutes);
app.use('/api', announcementRoutes);
app.use('/api', faqRoutes);
app.use('/api', contactRoutes);
app.use('/api', adminNotificationRoutes);
app.use('/api', campaignRoutes);
app.use('/api', systemHealthRoutes);
app.use('/api', reportRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api', logRoutes);
app.use('/api', cacheRoutes);
app.use('/api', rateLimitRoutes);

// 404 handler
app.use('/api/{*splat}', notFoundHandler);

// Error handler
app.use(errorHandler);

// MongoDB Connection
const logger = require('./utils/logger');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike')
  .then(async () => {
    logger.info('Connected to MongoDB');
    // Seed default data on first boot (idempotent)
    try {
      await require('./controllers/dashboardController').seedSettings();
      await require('./controllers/notificationTemplateController').seedTemplates();
      await require('./controllers/faqController').seedFaqs();
      await require('./controllers/announcementController').seedAnnouncements();
      await require('./controllers/siteContentController').seedContent();
      logger.info('Default data seeded');
    } catch (seedErr) {
      logger.warn('Seed skipped (non-blocking)', { error: seedErr.message });
    }
  })
  .catch(err => logger.error('MongoDB connection error', { error: err.message }));

const gracefulShutdown = require('./utils/gracefulShutdown');

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV });
  startCleanupScheduler();
  startExpiredIntentCleanup();
  startBookingStateTransition();
  startDataRetention();
  startMaintenanceReminder();
  startAutoHeal();
  startScheduledMaintenance();
  startEmailCampaignSender();
});

gracefulShutdown(server, mongoose);
