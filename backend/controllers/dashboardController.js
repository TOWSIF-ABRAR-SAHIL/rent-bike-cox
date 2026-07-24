const Bike = require('../models/Bike');
const User = require('../models/User');
const Settings = require('../models/Settings');
const Category = require('../models/Category');
const { sanitize } = require('../utils/sanitize');

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
    const { model, brand, category, description, pricePerHour, videoUrl } = req.body;
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

    const bike = new Bike({
      model: cleanModel,
      brand: cleanBrand,
      category,
      description: cleanDescription,
      pricePerHour: price,
      images,
      videoUrl: cleanVideoUrl || undefined,
      renter: req.user.id
    });
    await bike.save();
    res.status(201).json(bike);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add bike' });
  }
};

exports.getRenterBikes = async (req, res) => {
  try {
    if (req.user.role !== 'Renter' && req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const bikes = await Bike.find({ renter: req.user.id }).populate('category', 'name slug');
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Public Actions ---

exports.getAvailableBikes = async (req, res) => {
  try {
    await seedCategories();
    const { search, category } = req.query;
    const filter = { availability: true, isVerified: true };

    if (category) {
      const cat = await Category.findOne({ slug: category });
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
      .populate('category', 'name slug');
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBikeById = async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=120');
    const bike = await Bike.findById(req.params.id)
      .populate('renter', 'name')
      .populate('category', 'name slug');
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    res.json(bike);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Category Actions ---

exports.getCategories = async (req, res) => {
  try {
    await seedCategories();
    res.set('Cache-Control', 'public, max-age=300');
    const categories = await Category.find({ isActive: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    await seedCategories();
    const categories = await Category.find().sort({ createdAt: 1 });
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// --- Admin Actions ---

exports.getGlobalSettings = async (req, res) => {
  try {
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
    res.set('Cache-Control', 'public, max-age=600');
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateGlobalSettings = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { basePricePerHour, packages } = req.body;
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
      settings = await Settings.create({ ...defaultSettings, ...newSettings });
    } else {
      if (basePricePerHour !== undefined) settings.basePricePerHour = basePricePerHour;
      if (packages !== undefined) settings.packages = packages;
      await settings.save();
    }
    res.json(settings);
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
    const bikes = await Bike.find().skip((page - 1) * limit).limit(limit).populate('renter', 'name email').populate('category', 'name');
    res.json(bikes);
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
    const users = await User.find().skip((page - 1) * limit).limit(limit).select('-password -nid -license');
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
    const bike = await Bike.findById(req.params.id);
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    if (req.user.role !== 'Admin' && !(req.user.role === 'Renter' && bike.renter.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized to delete this bike' });
    }
    await Bike.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bike deleted' });
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
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
