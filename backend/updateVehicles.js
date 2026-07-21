require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');
const Bike = require('./models/Bike');

async function updateVehicles() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike');
  console.log('Connected to MongoDB');

  // Get renter user
  const User = require('./models/User');
  const renter = await User.findOne({ email: 'renter@rentbikecox.com' });
  if (!renter) { console.log('No renter found!'); process.exit(1); }

  // Delete microbus vehicles
  const microbusCat = await Category.findOne({ slug: 'microbus' });
  if (microbusCat) {
    const deleted = await Bike.deleteMany({ category: microbusCat._id });
    console.log(`Deleted ${deleted.deletedCount} microbus vehicles`);
    // Delete category
    await Category.findByIdAndDelete(microbusCat._id);
    console.log('Deleted Microbus category');
  }

  // Delete unused categories (SUV, Van)
  const suvCat = await Category.findOne({ slug: 'suv' });
  if (suvCat) {
    await Bike.deleteMany({ category: suvCat._id });
    await Category.findByIdAndDelete(suvCat._id);
    console.log('Deleted SUV category');
  }
  const vanCat = await Category.findOne({ slug: 'van' });
  if (vanCat) {
    await Bike.deleteMany({ category: vanCat._id });
    await Category.findByIdAndDelete(vanCat._id);
    console.log('Deleted Van category');
  }

  // Create Jeep category
  let jeepCat = await Category.findOne({ slug: 'jeep' });
  if (!jeepCat) {
    jeepCat = await Category.create({ name: 'Jeep', slug: 'jeep' });
    console.log('Created Jeep category');
  } else {
    console.log('Jeep category already exists');
  }

  // Delete any existing jeep vehicles and re-add
  await Bike.deleteMany({ category: jeepCat._id });

  // Add beach jeeps
  const jeeps = [
    {
      model: 'Open Top Beach Jeep',
      brand: 'Mahindra',
      category: jeepCat._id,
      description: 'Open-top jeep perfect for Cox\'s Bazar beach rides. Feel the sea breeze as you cruise along the world\'s longest beach. Seats 6 passengers. Driver included. Helmet provided.',
      pricePerHour: 1200,
      images: [
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&h=600&fit=crop'
      ],
      availability: true,
      isVerified: true,
      renter: renter._id
    },
    {
      model: 'Toyota Land Cruiser Prado',
      brand: 'Toyota',
      category: jeepCat._id,
      description: 'Premium 4x4 jeep for beach and hill track adventures. Perfect for Inani Beach, Himchari, and Teknaf Marine Drive trips. AC, power steering, comfortable for long rides. Seats 7.',
      pricePerHour: 1500,
      images: [
        'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=800&h=600&fit=crop'
      ],
      availability: true,
      isVerified: true,
      renter: renter._id
    },
    {
      model: 'Suzuki Jimny Beach Edition',
      brand: 'Suzuki',
      category: jeepCat._id,
      description: 'Compact and fun off-road jeep. Ideal for couples or small groups wanting a thrilling beach ride experience. 4x4 capable, open roof option. Seats 4.',
      pricePerHour: 800,
      images: [
        'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=600&fit=crop'
      ],
      availability: true,
      isVerified: true,
      renter: renter._id
    }
  ];

  for (const jeep of jeeps) {
    await Bike.create(jeep);
    console.log(`Created: ${jeep.brand} ${jeep.model} - ${jeep.pricePerHour} TK/hr`);
  }

  // Verify final state
  const bikes = await Bike.find().populate('category', 'name slug');
  const cats = await Category.find();
  console.log('\n=== FINAL STATE ===');
  console.log('Categories:', cats.map(c => `${c.name}(${c.slug})`).join(', '));
  console.log('Vehicles:', bikes.length);
  bikes.forEach(b => console.log(`  ${b.brand} ${b.model} - ${b.category?.name} - ${b.pricePerHour} TK/hr`));

  process.exit(0);
}

updateVehicles().catch(err => { console.error(err); process.exit(1); });
