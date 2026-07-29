const Bike = require('../models/Bike');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Category = require('../models/Category');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');
const { defaultCache } = require('../utils/cache');

const defaultCategories = [
  { name: 'Bike', slug: 'bike' },
  { name: 'Car', slug: 'car' },
  { name: 'Jeep', slug: 'jeep' }
];

const defaultSettings = {
  basePricePerHour: 200,
  packages: [
    { name: '1 Day', price: 2000 },
    { name: '2 Days', price: 3500 },
    { name: '1 Week', price: 10000 },
    { name: 'Monthly', price: 35000 }
  ]
};

let settingsSeeded = false;

const seedSettings = async () => {
  if (settingsSeeded) return;
  try {
    let s = await Settings.findOne();
    if (!s) {
      s = await Settings.create(defaultSettings);
    }
    const br = s.businessRules || {};
    if (!br.booking) br.booking = {};
    if (!br.payment) br.payment = {};
    if (!br.cancellation) br.cancellation = {};
    if (!br.lateReturn) br.lateReturn = {};
    if (!br.verification) br.verification = {};
    if (!br.registration) br.registration = {};
    if (!br.vehicles) br.vehicles = {};
    if (!br.fines || br.fines.length === 0) {
      br.fines = [
        { name: 'Beach Sand in Vehicle', amount: 1000, description: 'Fine for sand or dirt found in vehicle after return', isActive: true },
        { name: 'Helmet Missing/Damaged', amount: 2000, description: 'Fine for missing or damaged helmet', isActive: true },
        { name: 'Boundary Violation', amount: 5000, description: 'Vehicle taken outside permitted zone', isActive: true },
        { name: 'Speed Violation', amount: 3000, description: 'Excessive speed / traffic violation fine', isActive: true },
      ];
    }
    s.businessRules = br;
    if (!s.branding) s.branding = {};
    await s.save();
    settingsSeeded = true;
    logger.info('Settings seeded');
  } catch (error) {
    logger.warn('Settings seed skipped', { error: error.message });
  }
};
exports.seedSettings = seedSettings;

let categoriesSeeded = false;
const seedCategories = async () => {
  if (categoriesSeeded) return;
  const count = await Category.countDocuments();
  if (count === 0) {
    await Category.insertMany(defaultCategories);
  }
  categoriesSeeded = true;
};

// --- Renter Actions ---

exports.addBike = async (req, res) => {
  try {
    const { model, brand, category, description, pricePerHour, videoUrl, packages } = req.body;
    const cleanModel = sanitize(model);
    const cleanBrand = sanitize(brand);
    const cleanDescription = sanitize(description);
    const cleanVideoUrl = sanitize(videoUrl);
    if (!cleanModel || !cleanBrand || !category || !pricePerHour) {
      return res.status(400).json({ message: 'Model, brand, category, and pricePerHour are required' });
    }
    const price = Number(pricePerHour);
    if (isNaN(price) || price <= 0 || price > 100000) {
      return res.status(400).json({ message: 'Price must be between 1 and 100,000 TK/hour' });
    }
    const images = req.files ? req.files.map(file => file.path) : [];

    let parsedPackages = [];
    if (packages) {
      try {
        const raw = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (Array.isArray(raw)) {
          parsedPackages = raw.filter(p =>
            p.label && p.minHours &&
            Number(p.minHours) >= 1 && Number(p.hourlyRate) >= 0
          ).map(p => ({
            label: String(p.label).slice(0, 50),
            minHours: Number(p.minHours),
            maxHours: p.maxHours != null ? Number(p.maxHours) : null,
            hourlyRate: Number(p.hourlyRate)
          }));
        }
      } catch { /* invalid JSON, skip */ }
    }

    const bike = new Bike({
      model: cleanModel,
      brand: cleanBrand,
      category,
      description: cleanDescription,
      pricePerHour: price,
      images,
      videoUrl: cleanVideoUrl || undefined,
      renter: req.user.id,
      packages: parsedPackages,
    });
    await bike.save();
    res.status(201).json(bike);
    defaultCache.del('bikes:available');
  } catch (error) {
    res.status(500).json({ message: 'Failed to add bike' });
  }
};

exports.getRenterBikes = async (req, res) => {
  try {
    if (req.user.role !== 'Renter' && req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const bikes = await Bike.find({ renter: req.user.id }).populate('category', 'name slug').lean();
    res.json(bikes);
  } catch (error) {
    logger.error('getRenterBikes error', { message: error.message });
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Public Actions ---

exports.getAvailableBikes = async (req, res) => {
  try {
    await seedCategories();
    const { search, category } = req.query;
    if (!search && !category) {
      const cached = defaultCache.get('bikes:available');
      if (cached) return res.json(cached);
    }
    const filter = { availability: true, isVerified: true };

    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) filter.category = cat._id;
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { model: { $regex: escapedSearch, $options: 'i' } },
        { brand: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    res.set('Cache-Control', 'public, max-age=60');
    const bikes = await Bike.find(filter)
      .populate('renter', 'name')
      .populate('category', 'name slug')
      .lean();
    res.json(bikes);
    if (!search && !category) {
      defaultCache.set('bikes:available', bikes, 120000);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBikeById = async (req, res) => {
  try {
    if (!req.params.id || !/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
      return res.status(400).json({ message: 'Invalid vehicle ID format' });
    }
    res.set('Cache-Control', 'public, max-age=120');
    const bike = await Bike.findById(req.params.id)
      .populate('renter', 'name')
      .populate('category', 'name slug')
      .lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    res.json(bike);
  } catch (error) {
    logger.error('getBikeById error', { tag: 'Dashboard', message: error.message });
    res.status(500).json({ message: 'Server error while fetching vehicle details' });
  }
};

exports.updateBike = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const { model, brand, category, description, pricePerHour, videoUrl, packages } = req.body;

    if (model !== undefined) bike.model = sanitize(model) || bike.model;
    if (brand !== undefined) bike.brand = sanitize(brand) || bike.brand;
    if (category !== undefined) bike.category = category;
    if (description !== undefined) bike.description = sanitize(description) || bike.description;
    if (videoUrl !== undefined) bike.videoUrl = sanitize(videoUrl);
    if (pricePerHour !== undefined) {
      const price = Number(pricePerHour);
      if (isNaN(price) || price <= 0 || price > 100000) {
        return res.status(400).json({ message: 'Price must be between 1 and 100,000 TK/hour' });
      }
      bike.pricePerHour = price;
    }

    if (req.files && req.files.length > 0) {
      bike.images = req.files.map(file => file.path);
    }

    if (packages !== undefined) {
      try {
        const raw = typeof packages === 'string' ? JSON.parse(packages) : packages;
        if (Array.isArray(raw)) {
          bike.packages = raw.filter(p =>
            p.label && p.minHours &&
            Number(p.minHours) >= 1 && Number(p.hourlyRate) >= 0
          ).map(p => ({
            label: String(p.label).slice(0, 50),
            minHours: Number(p.minHours),
            maxHours: p.maxHours != null ? Number(p.maxHours) : null,
            hourlyRate: Number(p.hourlyRate)
          }));
        } else {
          bike.packages = [];
        }
      } catch {
        bike.packages = [];
      }
    }

    await bike.save();
    res.json(bike);
    defaultCache.del('bikes:available');
  } catch (error) {
    res.status(500).json({ message: 'Failed to update bike' });
  }
};

// --- Category Actions ---

exports.getCategories = async (req, res) => {
  try {
    await seedCategories();
    const cached = defaultCache.get('categories');
    if (cached) return res.json(cached);
    res.set('Cache-Control', 'public, max-age=300');
    const categories = await Category.find({ isActive: true }).lean();
    defaultCache.set('categories', categories, 300000);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    await seedCategories();
    const categories = await Category.find().sort({ createdAt: 1 }).lean();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createCategory = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { name } = req.body;
    const cleanName = sanitize(name);
    if (!cleanName) return res.status(400).json({ message: 'Category name is required' });
    const slug = cleanName.toLowerCase().replace(/\s+/g, '-');
    const category = new Category({ name: cleanName, slug });
    await category.save();
    res.status(201).json(category);
    defaultCache.del('categories');
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { name, isActive } = req.body;
    const update = {};
    if (name !== undefined) {
      const cleanName = sanitize(name);
      if (!cleanName) return res.status(400).json({ message: 'Category name is required' });
      update.name = cleanName;
      update.slug = cleanName.toLowerCase().replace(/\s+/g, '-');
    }
    if (isActive !== undefined) update.isActive = isActive;
    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
    defaultCache.del('categories');
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const bikeCount = await Bike.countDocuments({ category: req.params.id });
    if (bikeCount > 0) {
      return res.status(400).json({ message: `Cannot delete: ${bikeCount} bike(s) use this category` });
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
    defaultCache.del('categories');
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Admin Actions ---

exports.getGlobalSettings = async (req, res) => {
  try {
    const cached = defaultCache.get('settings');
    if (cached) return res.json(cached);
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(defaultSettings);
    } else {
      const existingNames = settings.packages.map(p => p.name);
      const missing = defaultSettings.packages.filter(p => !existingNames.includes(p.name));
      if (missing.length > 0) {
        settings.packages.push(...missing);
        await settings.save();
      }
    }
    const data = settings.toObject ? settings.toObject() : settings;
    defaultCache.set('settings', data, 300000);
    res.set('Cache-Control', 'public, max-age=300');
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateGlobalSettings = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { basePricePerHour, packages, businessRules } = req.body;
    if (basePricePerHour !== undefined) {
      const price = Number(basePricePerHour);
      if (isNaN(price) || price <= 0 || price > 100000) {
        return res.status(400).json({ message: 'Base price must be between 1 and 100,000 TK/hour' });
      }
    }
    if (packages !== undefined && Array.isArray(packages)) {
      for (const pkg of packages) {
        if (typeof pkg.name === 'string') pkg.name = sanitize(pkg.name);
        if (!pkg.name || pkg.name.length > 50) {
          return res.status(400).json({ message: 'Invalid package name' });
        }
        if (typeof pkg.price !== 'number' || pkg.price <= 0 || pkg.price > 1000000) {
          return res.status(400).json({ message: 'Invalid package price' });
        }
      }
    }
    let settings = await Settings.findOne();
    if (!settings) {
      const newSettings = {};
      if (basePricePerHour !== undefined) newSettings.basePricePerHour = basePricePerHour;
      if (packages !== undefined) newSettings.packages = packages;
      if (businessRules !== undefined) newSettings.businessRules = businessRules;
      settings = await Settings.create({ ...defaultSettings, ...newSettings });
    } else {
      if (basePricePerHour !== undefined) settings.basePricePerHour = basePricePerHour;
      if (packages !== undefined) settings.packages = packages;
      if (businessRules !== undefined) settings.businessRules = businessRules;
      await settings.save();
    }
    res.json(settings);
    defaultCache.del('settings');
  } catch (error) {
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

exports.getAllBikes = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const total = await Bike.countDocuments();
    const bikes = await Bike.find().skip((page - 1) * limit).limit(limit).populate('renter', 'name email').populate('category', 'name').lean();
    res.json({ bikes, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleBikeVerification = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    bike.isVerified = !bike.isVerified;
    await bike.save();
    res.json({ message: `Bike ${bike.isVerified ? 'verified' : 'unverified'}`, bike });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const total = await User.countDocuments();
    const users = await User.find().skip((page - 1) * limit).limit(limit).select('-password -nid -license').lean();
    res.json({ users, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleUserVerification = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isVerified = !user.isVerified;
    await user.save();
    res.json({ message: `User ${user.isVerified ? 'verified' : 'unverified'}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBike = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id).lean();
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    if (req.user.role !== 'Admin' && !(req.user.role === 'Renter' && bike.renter.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to delete this bike' });
    }
    await Bike.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bike deleted' });
    defaultCache.del('bikes:available');
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.toggleBikeAvailability = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    if (bike.renter.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this bike' });
    }
    bike.availability = !bike.availability;
    await bike.save();
    res.json({ message: `Bike ${bike.availability ? 'available' : 'unavailable'}`, bike });
    defaultCache.del('bikes:available');
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Branding ---

exports.getBranding = async (req, res) => {
  try {
    const cached = defaultCache.get('branding');
    if (cached) {
      res.set('Cache-Control', 'public, max-age=300');
      return res.json(cached);
    }
    let settings = await Settings.findOne().lean();
    if (!settings) settings = await Settings.create(defaultSettings);
    const branding = settings.branding || {};
    defaultCache.set('branding', branding, 300000);
    res.set('Cache-Control', 'public, max-age=300');
    res.json(branding);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateBranding = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const allowedFields = [
      'logoUrl', 'logoDarkUrl', 'faviconUrl', 'ogImageUrl', 'primaryColor', 'secondaryColor',
      'accentColor', 'successColor', 'warningColor', 'dangerColor',
      'heroImageUrl', 'businessName', 'businessTagline',
      'businessAddress', 'contactNumbers', 'contactEmail', 'whatsappNumber',
      'socialLinks', 'metaTags', 'legal'
    ];
    const brandingUpdate = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        brandingUpdate[`branding.${field}`] = req.body[field];
      }
    }
    if (Object.keys(brandingUpdate).length === 0) {
      return res.status(400).json({ message: 'No valid branding fields provided' });
    }
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create(defaultSettings);
    Object.assign(settings, brandingUpdate);
    await settings.save();
    defaultCache.del('branding');
    res.json(settings.branding);
  } catch (error) {
    logger.error('updateBranding error:', error.message);
    res.status(500).json({ message: 'Failed to update branding' });
  }
};
