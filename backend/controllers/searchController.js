const Bike = require('../models/Bike');
const Category = require('../models/Category');
const Zone = require('../models/Zone');
const logger = require('../utils/logger');

exports.advancedSearch = async (req, res) => {
  try {
    const {
      q, category, zone, minPrice, maxPrice,
      availability, condition, sort, page = 1, limit = 12,
    } = req.query;

    const filter = { isVerified: true };

    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { model: { $regex: escaped, $options: 'i' } },
        { brand: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    if (category) {
      const cat = await Category.findOne({ slug: category }).lean();
      if (cat) filter.category = cat._id;
    }

    if (zone) {
      filter.zone = zone;
    }

    if (minPrice || maxPrice) {
      filter.pricePerHour = {};
      if (minPrice) filter.pricePerHour.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerHour.$lte = Number(maxPrice);
    }

    if (availability === 'true') {
      filter.availability = true;
      filter.isUnderMaintenance = false;
    } else if (availability === 'false') {
      filter.$or = [{ availability: false }, { isUnderMaintenance: true }];
    }

    if (condition && condition !== 'all') {
      filter.condition = condition;
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { pricePerHour: 1 };
    else if (sort === 'price_desc') sortObj = { pricePerHour: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'oldest') sortObj = { createdAt: 1 };
    else if (sort === 'mileage') sortObj = { currentMileage: -1 };

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const total = await Bike.countDocuments(filter);

    const bikes = await Bike.find(filter)
      .populate('renter', 'name')
      .populate('category', 'name slug')
      .populate('zone', 'name color')
      .sort(sortObj)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const categories = await Category.find({ isActive: true }).sort('name').lean();
    const zones = await Zone.find({ isActive: true }).sort('name').lean();

    const priceRange = await Bike.aggregate([
      { $match: { isVerified: true } },
      { $group: { _id: null, min: { $min: '$pricePerHour' }, max: { $max: '$pricePerHour' } } },
    ]);

    res.json({
      bikes,
      categories,
      zones,
      priceRange: priceRange[0] || { min: 0, max: 1000 },
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('advancedSearch error', { message: error.message });
    res.status(500).json({ message: 'Search failed' });
  }
};

exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const bikes = await Bike.find({
      isVerified: true,
      $or: [
        { model: { $regex: escaped, $options: 'i' } },
        { brand: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('model brand pricePerHour images')
      .limit(6)
      .lean();

    const categories = await Category.find({
      name: { $regex: escaped, $options: 'i' },
      isActive: true,
    }).select('name slug').limit(3).lean();

    const suggestions = [
      ...bikes.map(b => ({
        type: 'vehicle',
        id: b._id,
        label: `${b.brand} ${b.model}`,
        sublabel: `${b.pricePerHour} TK/hr`,
        image: b.images?.[0],
      })),
      ...categories.map(c => ({
        type: 'category',
        slug: c.slug,
        label: c.name,
        sublabel: 'Category',
      })),
    ];

    res.json(suggestions);
  } catch (error) {
    logger.error('getSearchSuggestions error', { message: error.message });
    res.json([]);
  }
};
