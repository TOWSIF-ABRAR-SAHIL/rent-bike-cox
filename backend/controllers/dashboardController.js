const Bike = require('../models/Bike');
const User = require('../models/User');
const Settings = require('../models/Settings');

// --- Renter Actions ---

exports.addBike = async (req, res) => {
  try {
    const { model, brand, category, description, pricePerHour } = req.body;
    const images = req.files ? req.files.map(file => file.path) : [];
    
    const bike = new Bike({
      model,
      brand,
      category,
      description,
      pricePerHour,
      images,
      renter: req.user.id
    });
    await bike.save();
    res.status(201).json(bike);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getRenterBikes = async (req, res) => {
  try {
    const bikes = await Bike.find({ renter: req.user.id });
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Public Actions ---

exports.getAvailableBikes = async (req, res) => {
  try {
    const bikes = await Bike.find({ availability: true, isVerified: true })
      .populate('renter', 'name');
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getBikeById = async (req, res) => {
  try {
    const bike = await Bike.findById(req.params.id)
      .populate('renter', 'name');
    if (!bike) return res.status(404).json({ message: 'Bike not found' });
    res.json(bike);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Admin Actions ---

const defaultSettings = {
  basePricePerHour: 200,
  packages: [
    { name: '1 Day', price: 2000 },
    { name: '2 Days', price: 3500 },
    { name: '1 Week', price: 10000 }
  ]
};

exports.getGlobalSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(defaultSettings);
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateGlobalSettings = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({ ...defaultSettings, ...req.body });
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllBikes = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const bikes = await Bike.find().populate('renter', 'name email');
    res.json(bikes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
