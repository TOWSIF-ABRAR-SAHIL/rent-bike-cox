const Bike = require('../models/Bike');
const User = require('../models/User');

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

// --- Admin Actions ---

// Using a simple Settings model or just a mock for global fees for now
// In a real app, you'd have a Settings schema
let globalSettings = {
  basePricePerHour: 200,
  packages: [
    { name: '1 Day', price: 2000 },
    { name: '2 Days', price: 3500 },
    { name: '1 Week', price: 10000 }
  ]
};

exports.getGlobalSettings = async (req, res) => {
  res.json(globalSettings);
};

exports.updateGlobalSettings = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    globalSettings = { ...globalSettings, ...req.body };
    res.json(globalSettings);
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
