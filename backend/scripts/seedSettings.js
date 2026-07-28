const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike';

const defaultFines = [
  { name: 'Beach Sand in Vehicle', amount: 1000, description: 'Fine for sand or dirt found in vehicle after return', isActive: true },
  { name: 'Helmet Missing/Damaged', amount: 2000, description: 'Fine for missing or damaged helmet', isActive: true },
  { name: 'Boundary Violation', amount: 5000, description: 'Vehicle taken outside permitted zone', isActive: true },
  { name: 'Speed Violation', amount: 3000, description: 'Excessive speed / traffic violation fine', isActive: true },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Settings = require('../models/Settings');

    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        basePricePerHour: 200,
        packages: [
          { name: '1-2 Hours', price: 200 },
          { name: '3-4 Hours', price: 175 },
          { name: '5+ Hours', price: 150 }
        ],
        businessRules: {
          fines: defaultFines
        }
      });
      console.log('Settings created with defaults');
    } else {
      let changed = false;
      if (!settings.businessRules) {
        settings.businessRules = {};
        changed = true;
      }
      const br = settings.businessRules;
      if (!br.fines || br.fines.length === 0) {
        br.fines = defaultFines;
        changed = true;
      }
      if (!br.booking) { br.booking = {}; changed = true; }
      if (!br.payment) { br.payment = {}; changed = true; }
      if (!br.cancellation) { br.cancellation = {}; changed = true; }
      if (!br.lateReturn) { br.lateReturn = {}; changed = true; }
      if (!br.verification) { br.verification = {}; changed = true; }
      if (!br.registration) { br.registration = {}; changed = true; }
      if (!br.vehicles) { br.vehicles = {}; changed = true; }

      if (!settings.branding) { settings.branding = {}; changed = true; }

      if (changed) {
        await settings.save();
        console.log('Settings updated with missing defaults');
      } else {
        console.log('Settings already up to date');
      }
    }

    await mongoose.disconnect();
    console.log('Seed settings complete');
  } catch (error) {
    console.error('Seed error:', error.message);
    process.exit(1);
  }
}

seed();
