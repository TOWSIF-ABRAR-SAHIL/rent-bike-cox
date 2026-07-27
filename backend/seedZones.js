require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Zone = require('./models/Zone');

const zones = [
  {
    name: 'Cox\'s Bazar City Center',
    slug: 'city-center',
    description: 'Main city area with hotels, restaurants, and the famous beach road (Marine Drive)',
    bounds: { north: 21.4600, south: 21.4200, east: 92.0150, west: 91.9800 },
    center: { lat: 21.4400, lng: 91.9975 },
    color: '#f59e0b',
    highlights: ['Marine Drive', 'Beach Road', 'Market'],
    distanceFromCenter: '0 km',
    typicalRentPrice: '200-300 TK/hr',
  },
  {
    name: 'Kolatoli',
    slug: 'kolatoli',
    description: 'Popular tourist beach area with luxury hotels and beach activities',
    bounds: { north: 21.4350, south: 21.4150, east: 92.0100, west: 91.9900 },
    center: { lat: 21.4250, lng: 92.0000 },
    color: '#3b82f6',
    highlights: ['Kolatoli Beach', 'Luxury Hotels', 'Water Sports'],
    distanceFromCenter: '2 km',
    typicalRentPrice: '250-350 TK/hr',
  },
  {
    name: 'Inani Beach',
    slug: 'inani-beach',
    description: 'Pristine beach with coral stones, 18 km south of city center. Quieter alternative.',
    bounds: { north: 21.2800, south: 21.2600, east: 92.0400, west: 92.0200 },
    center: { lat: 21.2700, lng: 92.0300 },
    color: '#10b981',
    highlights: ['Coral Beach', 'Snorkeling', 'Quiet Beach'],
    distanceFromCenter: '18 km',
    typicalRentPrice: '200-280 TK/hr',
  },
  {
    name: 'Himchari',
    slug: 'himchari',
    description: 'Hill track area with waterfall and scenic views, south of Cox\'s Bazar',
    bounds: { north: 21.2500, south: 21.2200, east: 92.0300, west: 92.0000 },
    center: { lat: 21.2350, lng: 92.0150 },
    color: '#8b5cf6',
    highlights: ['Himchari Waterfall', 'Hill Track', 'Scenic Views'],
    distanceFromCenter: '22 km',
    typicalRentPrice: '200-250 TK/hr',
  },
  {
    name: 'Teknaf',
    slug: 'teknaf',
    description: 'Gateway to St. Martin\'s Island, with ferry terminal and Naf River views',
    bounds: { north: 20.8800, south: 20.8600, east: 92.3100, west: 92.2900 },
    center: { lat: 20.8700, lng: 92.3000 },
    color: '#ef4444',
    highlights: ['Ferry Terminal', 'Naf River', 'St. Martin Gateway'],
    distanceFromCenter: '65 km',
    typicalRentPrice: '180-250 TK/hr',
  },
  {
    name: 'Saint Martin\'s Island',
    slug: 'st-martins',
    description: 'Bangladesh\'s only coral island. Accessible by ferry from Teknaf.',
    bounds: { north: 20.6400, south: 20.6200, east: 92.3300, west: 92.3100 },
    center: { lat: 20.6300, lng: 92.3200 },
    color: '#06b6d4',
    highlights: ['Coral Island', 'Snorkeling', 'Marine Life'],
    distanceFromCenter: '90 km',
    typicalRentPrice: '250-350 TK/hr',
  },
  {
    name: 'Ramu',
    slug: 'ramu',
    description: 'Historic Buddhist area with monasteries, 14 km from Cox\'s Bazar',
    bounds: { north: 21.4700, south: 21.4500, east: 92.0100, west: 91.9900 },
    center: { lat: 21.4600, lng: 92.0000 },
    color: '#f97316',
    highlights: ['Buddhist Monasteries', 'Traditional Crafts', 'Historic Sites'],
    distanceFromCenter: '14 km',
    typicalRentPrice: '180-220 TK/hr',
  },
  {
    name: 'Ukhia',
    slug: 'ukhia',
    description: 'Area near Rohingya refugee camps, with access to natural attractions',
    bounds: { north: 21.1800, south: 21.1500, east: 92.0800, west: 92.0500 },
    center: { lat: 21.1650, lng: 92.0650 },
    color: '#a855f7',
    highlights: ['Natural Attractions', 'Hill Areas'],
    distanceFromCenter: '35 km',
    typicalRentPrice: '150-200 TK/hr',
  },
];

async function seedZones() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const zone of zones) {
    const result = await Zone.findOneAndUpdate(
      { slug: zone.slug },
      { $set: zone },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✓ ${result.name} (${result._id})`);
  }

  await mongoose.disconnect();
  console.log(`\nDone! ${zones.length} zones seeded.`);
}

seedZones().catch(err => { console.error(err); process.exit(1); });
