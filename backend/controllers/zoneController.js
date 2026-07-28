const Zone = require('../models/Zone');
const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const logger = require('../utils/logger');

exports.createZone = async (req, res) => {
  try {
    const { name, description, bounds, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Zone name is required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await Zone.findOne({ slug });
    if (existing) return res.status(400).json({ message: 'A zone with this name already exists' });

    const zone = await Zone.create({ name, slug, description, bounds, color });
    res.status(201).json(zone);
  } catch (error) {
    logger.error('createZone error', { message: error.message });
    res.status(500).json({ message: 'Failed to create zone' });
  }
};

exports.getZones = async (req, res) => {
  try {
    const zones = await Zone.find().sort({ name: 1 });
    res.json(zones);
  } catch (error) {
    logger.error('getZones error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch zones' });
  }
};

exports.getActiveZones = async (req, res) => {
  try {
    const zones = await Zone.find({ isActive: true }).sort({ name: 1 });
    res.json(zones);
  } catch (error) {
    logger.error('getActiveZones error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch zones' });
  }
};

exports.getZoneById = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    res.json(zone);
  } catch (error) {
    logger.error('getZoneById error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch zone' });
  }
};

exports.updateZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });

    const { name, description, bounds, color, isActive } = req.body;
    if (name) zone.name = name;
    if (description !== undefined) zone.description = description;
    if (bounds) zone.bounds = bounds;
    if (color) zone.color = color;
    if (isActive !== undefined) zone.isActive = isActive;

    await zone.save();
    res.json(zone);
  } catch (error) {
    logger.error('updateZone error', { message: error.message });
    res.status(500).json({ message: 'Failed to update zone' });
  }
};

exports.deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });

    const bikeCount = await Bike.countDocuments({ zone: zone._id });
    if (bikeCount > 0) {
      return res.status(400).json({ message: `Cannot delete zone: ${bikeCount} bike(s) are assigned to it` });
    }

    await Zone.findByIdAndDelete(req.params.id);
    res.json({ message: 'Zone deleted' });
  } catch (error) {
    logger.error('deleteZone error', { message: error.message });
    res.status(500).json({ message: 'Failed to delete zone' });
  }
};

exports.getGeoJson = async (req, res) => {
  try {
    const zones = await Zone.find({ isActive: true }).sort({ name: 1 }).lean();
    const features = [];
    for (const zone of zones) {
      try {
        let geometry = null;
        if (zone.polygon && zone.polygon.length >= 3) {
          geometry = { type: 'Polygon', coordinates: [zone.polygon.map(p => [p[1], p[0]])] };
        } else if (zone.center && zone.center.lat != null && zone.center.lng != null) {
          geometry = { type: 'Point', coordinates: [zone.center.lng, zone.center.lat] };
        }
        if (geometry) {
          features.push({
            type: 'Feature',
            properties: {
              id: zone._id,
              name: zone.name,
              slug: zone.slug,
              color: zone.color,
              bikeCount: zone.bikeCount,
              highlights: zone.highlights || [],
              distanceFromCenter: zone.distanceFromCenter,
              typicalRentPrice: zone.typicalRentPrice,
            },
            geometry,
          });
        }
      } catch (zoneErr) {
        logger.error('getGeoJson zone error', { zoneId: zone._id, error: zoneErr.message });
      }
    }
    res.json({ type: 'FeatureCollection', features });
  } catch (error) {
    logger.error('getGeoJson error', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Failed to generate GeoJSON' });
  }
};

exports.getZoneStats = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });

    const totalBikes = await Bike.countDocuments({ zone: zone._id });
    const availableBikes = await Bike.countDocuments({ zone: zone._id, availability: true, isUnderMaintenance: false });
    const activeBookings = await Booking.countDocuments({
      bike: { $in: await Bike.find({ zone: zone._id }).select('_id') },
      status: { $in: ['Pending', 'Confirmed'] },
    });

    const recentBookings = await Booking.find({
      bike: { $in: await Bike.find({ zone: zone._id }).select('_id') },
    })
      .populate('bike', 'model brand')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      zone: { id: zone._id, name: zone.name, color: zone.color },
      totalBikes,
      availableBikes,
      rentedBikes: totalBikes - availableBikes,
      activeBookings,
      recentBookings,
    });
  } catch (error) {
    logger.error('getZoneStats error', { message: error.message });
    res.status(500).json({ message: 'Failed to fetch zone stats' });
  }
};
