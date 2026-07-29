require('dotenv').config();
const mongoose = require('mongoose');
require('./models/Category');
const Bike = require('./models/Bike');
const LocationHistory = require('./models/LocationHistory');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_ATLAS;

async function seedTracking() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const bikes = await Bike.find({}).populate('category', 'name');
    console.log(`Found ${bikes.length} bikes`);

    const baseLoc = [92.0100, 21.4200];
    const roadPoints = [
      { lng: 92.0100, lat: 21.4200 },
      { lng: 92.0150, lat: 21.4250 },
      { lng: 92.0200, lat: 21.4300 },
      { lng: 92.0250, lat: 21.4280 },
      { lng: 92.0300, lat: 21.4250 },
      { lng: 92.0280, lat: 21.4200 },
      { lng: 92.0220, lat: 21.4150 },
      { lng: 92.0150, lat: 21.4100 },
      { lng: 92.0080, lat: 21.4050 },
      { lng: 92.0000, lat: 21.4000 },
    ];

    const offset = Math.floor(Math.random() * 5);

    for (let i = 0; i < bikes.length; i++) {
      const bike = bikes[i];
      const startIdx = (i * 3 + offset) % roadPoints.length;
      const baseSpeed = Math.floor(Math.random() * 30) + 5;
      const baseBattery = Math.floor(Math.random() * 60) + 20;
      const baseHeading = Math.floor(Math.random() * 360);

      const basePoint = roadPoints[startIdx];
      const lng = basePoint.lng + (Math.random() - 0.5) * 0.008;
      const lat = basePoint.lat + (Math.random() - 0.5) * 0.008;

      await Bike.findByIdAndUpdate(bike._id, {
        currentLocation: {
          type: 'Point',
          coordinates: [lng, lat],
          updatedAt: new Date(),
        },
      });

      await LocationHistory.create({
        bike: bike._id,
        coordinates: { type: 'Point', coordinates: [lng, lat] },
        speed: baseSpeed,
        heading: baseHeading,
        battery: baseBattery,
        accuracy: Math.floor(Math.random() * 10) + 3,
        recordedAt: new Date(),
      });

      const trailCount = Math.floor(Math.random() * 15) + 10;
      for (let j = 1; j <= trailCount; j++) {
        const frac = j / (trailCount + 1);
        const histPoint = roadPoints[(startIdx + j) % roadPoints.length];
        const hlng = histPoint.lng + (Math.random() - 0.5) * 0.005;
        const hlat = histPoint.lat + (Math.random() - 0.5) * 0.005;
        const decayBattery = Math.max(10, baseBattery - j * 2);

        await LocationHistory.create({
          bike: bike._id,
          coordinates: { type: 'Point', coordinates: [hlng, hlat] },
          speed: Math.max(0, baseSpeed + Math.floor((Math.random() - 0.5) * 20)),
          heading: (baseHeading + Math.floor((Math.random() - 0.5) * 60) + 360) % 360,
          battery: decayBattery,
          accuracy: Math.floor(Math.random() * 10) + 3,
          recordedAt: new Date(Date.now() - (trailCount - j) * 30000),
        });
      }

      const catName = bike.category?.name || 'Vehicle';
      console.log(`  ${bike.brand} ${bike.model} [${catName}] → (${lng.toFixed(4)}, ${lat.toFixed(4)}) ${baseSpeed}km/h ${baseBattery}%`);
    }

    console.log('\nTracking seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seedTracking();
