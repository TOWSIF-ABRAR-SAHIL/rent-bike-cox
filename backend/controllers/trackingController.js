const mongoose = require('mongoose');
const Bike = require('../models/Bike');
const Category = require('../models/Category');
const LocationHistory = require('../models/LocationHistory');
const logger = require('../utils/logger');

let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

async function updateLocation(req, res) {
  try {
    const apiKey = req.headers['x-api-key'] || req.body.apiKey;
    if (!apiKey || apiKey !== process.env.IOT_API_KEY) {
      return res.status(401).json({ message: 'Invalid API key' });
    }

    const { bikeId, lat, lng, speed = 0, heading = 0, battery = 100, accuracy = 0 } = req.body;
    if (!bikeId || lat == null || lng == null) {
      return res.status(400).json({ message: 'bikeId, lat, and lng are required' });
    }

    const coords = [Number(lng), Number(lat)];
    const now = new Date();

    const bike = await Bike.findByIdAndUpdate(bikeId, {
      currentLocation: {
        type: 'Point',
        coordinates: coords,
        updatedAt: now,
      },
    }, { new: true }).select('model brand currentLocation category images renter');

    if (!bike) {
      return res.status(404).json({ message: 'Bike not found' });
    }

    await LocationHistory.create({
      bike: bikeId,
      coordinates: { type: 'Point', coordinates: coords },
      speed: Number(speed),
      heading: Number(heading),
      battery: Number(battery),
      accuracy: Number(accuracy),
      recordedAt: now,
    });

    if (ioInstance) {
      ioInstance.emit('location:update', {
        bikeId: bike._id,
        model: bike.model,
        brand: bike.brand,
        category: bike.category?.name || 'Vehicle',
        image: bike.images?.[0] || null,
        coordinates: coords,
        speed: Number(speed),
        heading: Number(heading),
        battery: Number(battery),
        accuracy: Number(accuracy),
        updatedAt: now,
      });
    }

    res.json({ message: 'Location updated', bikeId: bike._id });
  } catch (err) {
    logger.error('Tracking update error', { error: err.message });
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getLocations(req, res) {
  try {
    const minLat = parseFloat(req.query.minLat);
    const maxLat = parseFloat(req.query.maxLat);
    const minLng = parseFloat(req.query.minLng);
    const maxLng = parseFloat(req.query.maxLng);

    const match = { 'currentLocation.coordinates.0': { $ne: 0 } };

    if (!isNaN(minLat) && !isNaN(maxLat) && !isNaN(minLng) && !isNaN(maxLng)) {
      match['currentLocation.coordinates.0'] = { $gte: minLng, $lte: maxLng };
      match['currentLocation.coordinates.1'] = { $gte: minLat, $lte: maxLat };
    }

    const bikes = await Bike.find(match)
      .select('model brand currentLocation category images')
      .populate('category', 'name');

    const bikeIds = bikes.map(b => b._id);

    const recentHistory = await LocationHistory.aggregate([
      { $match: { bike: { $in: bikeIds } } },
      { $sort: { recordedAt: -1 } },
      { $group: { _id: '$bike', speed: { $first: '$speed' }, heading: { $first: '$heading' }, battery: { $first: '$battery' } } },
    ]);

    const statsMap = {};
    recentHistory.forEach(h => { statsMap[h._id.toString()] = h; });

    res.json(bikes.map(b => {
      const s = statsMap[b._id.toString()] || {};
      return {
        _id: b._id,
        model: b.model,
        brand: b.brand,
        category: b.category?.name || 'Vehicle',
        image: b.images?.[0] || null,
        coordinates: b.currentLocation.coordinates,
        speed: s.speed || 0,
        heading: s.heading || 0,
        battery: s.battery || 100,
        updatedAt: b.currentLocation.updatedAt,
      };
    }));
  } catch (err) {
    logger.error('Get locations error', { error: err.message });
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getBikeLocation(req, res) {
  try {
    const bike = await Bike.findById(req.params.bikeId)
      .select('model brand currentLocation category images renter')
      .populate('category', 'name');

    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const latestHistory = await LocationHistory.findOne({ bike: bike._id })
      .sort({ recordedAt: -1 })
      .select('speed heading battery accuracy -_id');

    res.json({
      _id: bike._id,
      model: bike.model,
      brand: bike.brand,
      category: bike.category?.name || 'Vehicle',
      image: bike.images?.[0] || null,
      coordinates: bike.currentLocation.coordinates,
      speed: latestHistory?.speed || 0,
      heading: latestHistory?.heading || 0,
      battery: latestHistory?.battery || 100,
      accuracy: latestHistory?.accuracy || 0,
      updatedAt: bike.currentLocation.updatedAt,
    });
  } catch (err) {
    logger.error('Get bike location error', { error: err.message });
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getHistory(req, res) {
  try {
    const { bikeId } = req.params;
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const bike = await Bike.findById(bikeId).select('_id');
    if (!bike) return res.status(404).json({ message: 'Bike not found' });

    const points = await LocationHistory.find({
      bike: bikeId,
      recordedAt: { $gte: from, $lte: to },
    })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .select('coordinates speed heading battery accuracy recordedAt -_id');

    res.json(points.reverse());
  } catch (err) {
    logger.error('Get history error', { error: err.message });
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getStats(req, res) {
  try {
    const match = { 'currentLocation.coordinates.0': { $ne: 0 } };
    if (req.query.category) {
      const cat = await Category.findOne({ name: { $regex: req.query.category, $options: 'i' } });
      if (cat) match.category = cat._id;
    }

    const bikes = await Bike.find(match).select('_id currentLocation');
    const bikeIds = bikes.map(b => b._id);

    const stats = await LocationHistory.aggregate([
      { $match: { bike: { $in: bikeIds } } },
      { $sort: { recordedAt: -1 } },
      { $group: {
        _id: '$bike',
        lastSpeed: { $first: '$speed' },
        lastBattery: { $first: '$battery' },
        lastHeading: { $first: '$heading' },
        totalPoints: { $sum: 1 },
        avgSpeed: { $avg: '$speed' },
        maxSpeed: { $max: '$speed' },
      }},
    ]);

    const statsMap = {};
    stats.forEach(s => { statsMap[s._id.toString()] = s; });

    const result = bikes.map(b => {
      const s = statsMap[b._id.toString()] || {};
      return {
        bikeId: b._id,
        totalPoints: s.totalPoints || 0,
        lastSpeed: s.lastSpeed || 0,
        lastBattery: s.lastBattery || 100,
        lastHeading: s.lastHeading || 0,
        avgSpeed: Math.round((s.avgSpeed || 0) * 10) / 10,
        maxSpeed: s.maxSpeed || 0,
        lastUpdated: b.currentLocation.updatedAt,
      };
    });

    res.json(result);
  } catch (err) {
    logger.error('Get stats error', { error: err.message });
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = { setIO, updateLocation, getLocations, getBikeLocation, getHistory, getStats };
