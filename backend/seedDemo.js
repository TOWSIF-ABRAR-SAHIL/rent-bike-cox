require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Category = require('./models/Category');
const Bike = require('./models/Bike');

const demoBikes = [
  {
    model: 'Yamaha FZ-S V3',
    brand: 'Yamaha',
    categorySlug: 'bike',
    description: 'Popular street bike with 149cc engine. Perfect for city rides and coastal roads in Cox\'s Bazar. Smooth handling, great mileage, and comfortable seating for two. Includes one helmet.',
    pricePerHour: 200,
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Honda CB Hornet 160R',
    brand: 'Honda',
    categorySlug: 'bike',
    description: 'Reliable Honda commuter with sporty looks. 162cc engine delivers great power for Inani Beach and Himchari rides. Excellent fuel efficiency. Helmet included.',
    pricePerHour: 200,
    images: [
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Bajaj Pulsar NS160',
    brand: 'Bajaj',
    categorySlug: 'bike',
    description: 'Sporty and aggressive naked streetfighter. Perfect for adventure seekers exploring Teknaf Marine Drive. 160cc oil-cooled engine with perimeter frame.',
    pricePerHour: 220,
    images: [
      'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'TVS Apache RTR 160',
    brand: 'TVS',
    categorySlug: 'bike',
    description: 'Racing-inspired commuter with race-tuned exhaust note. Great for both city cruising and long coastal rides. Comes with dual disc brakes and racing decals.',
    pricePerHour: 180,
    images: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Toyota Axio 2018',
    brand: 'Toyota',
    categorySlug: 'car',
    description: 'Comfortable sedan perfect for family trips around Cox\'s Bazar. Air conditioned, GPS navigation, and spacious boot. Seats 4 passengers comfortably. Petrol not included.',
    pricePerHour: 800,
    images: [
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Toyota Allion 2019',
    brand: 'Toyota',
    categorySlug: 'car',
    description: 'Premium sedan with leather seats and push-button start. Ideal for airport pickup and hotel transfers. Excellent air conditioning and smooth ride quality.',
    pricePerHour: 900,
    images: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Toyota Premio 2017',
    brand: 'Toyota',
    categorySlug: 'car',
    description: 'Reliable and fuel-efficient sedan. Perfect for day-long tours around Cox\'s Bazar with family. Automatic transmission, AC, power windows.',
    pricePerHour: 750,
    images: [
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Toyota HiAce Commuter',
    brand: 'Toyota',
    categorySlug: 'microbus',
    description: 'Spacious 12-seater microbus for group tours and corporate outings. Perfect for 8-12 person groups visiting Cox\'s Bazar attractions. AC and music system included.',
    pricePerHour: 1500,
    images: [
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Hyundai H1 Premium',
    brand: 'Hyundai',
    categorySlug: 'microbus',
    description: 'Luxury microbus with 9 comfortable seats. Push-button start, rear AC vents, and premium audio system. Great for VIP group transfers and tours.',
    pricePerHour: 1800,
    images: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  },
  {
    model: 'Hero Splendor Plus',
    brand: 'Hero',
    categorySlug: 'bike',
    description: 'India\'s most trusted commuter bike. 97cc engine with exceptional fuel economy. Perfect for short city rides and market visits in Cox\'s Bazar.',
    pricePerHour: 150,
    images: [
      'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&h=600&fit=crop'
    ],
    videoUrl: '',
    availability: true,
    isVerified: true
  }
];

async function seedDemoData() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike');
  console.log('Connected to MongoDB');

  // Create renter account (try multiple NIDs in case of duplicates)
  let renter = await User.findOne({ email: 'renter@rentbikecox.com' });
  if (!renter) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('renter123', salt);
    const renterNids = ['1234567890124', '1234567890125', '1234567890126'];
    for (const nid of renterNids) {
      try {
        renter = await User.create({
          name: 'Cox Bike Rentals',
          email: 'renter@rentbikecox.com',
          password: hashedPassword,
          role: 'Renter',
          nid: nid,
          license: 'DL-123456',
          phoneNumber: '01891154443',
          address: 'Cox\'s Bazar, Bangladesh',
          isVerified: true
        });
        console.log('Renter account created: renter@rentbikecox.com / renter123');
        break;
      } catch (e) {
        if (e.code === 11000) continue;
        throw e;
      }
    }
  } else {
    console.log('Renter already exists');
  }

  // Create test user
  let testUser = await User.findOne({ email: 'user@rentbikecox.com' });
  if (!testUser) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('user123', salt);
    const userNids = ['9876543210124', '9876543210125', '9876543210126'];
    for (const nid of userNids) {
      try {
        testUser = await User.create({
          name: 'Test Customer',
          email: 'user@rentbikecox.com',
          password: hashedPassword,
          role: 'User',
          nid: nid,
          license: 'DL-654321',
          phoneNumber: '01764466757',
          address: 'Dhaka, Bangladesh',
          isVerified: true
        });
        console.log('Test user created: user@rentbikecox.com / user123');
        break;
      } catch (e) {
        if (e.code === 11000) continue;
        throw e;
      }
    }
  } else {
    console.log('Test user already exists');
  }

  // Seed categories if empty
  const catCount = await Category.countDocuments();
  if (catCount === 0) {
    await Category.insertMany([
      { name: 'Bike', slug: 'bike' },
      { name: 'Car', slug: 'car' },
      { name: 'Microbus', slug: 'microbus' }
    ]);
    console.log('Default categories seeded');
  }

  // Get category map
  const categories = await Category.find();
  const catMap = {};
  categories.forEach(c => { catMap[c.slug] = c._id; });

  // Check existing bikes
  const existingBikes = await Bike.countDocuments();
  if (existingBikes >= 5) {
    console.log(`Already ${existingBikes} bikes in database. Skipping seed.`);
    process.exit(0);
  }

  // Delete old demo bikes and re-seed
  await Bike.deleteMany({ renter: renter._id });

  // Create demo bikes
  for (const bikeData of demoBikes) {
    const pph = bikeData.pricePerHour;
    const packages = [
      { label: '1 Hour', durationType: 'hour', durationValue: 1, price: pph },
      { label: '2 Hours', durationType: 'hour', durationValue: 2, price: pph * 2 },
      { label: '4 Hours', durationType: 'hour', durationValue: 4, price: pph * 4 },
      { label: '1 Day', durationType: 'day', durationValue: 1, price: Math.round(pph * 10) },
      { label: '1 Week', durationType: 'week', durationValue: 1, price: Math.round(pph * 50) },
    ];
    await Bike.create({
      model: bikeData.model,
      brand: bikeData.brand,
      category: catMap[bikeData.categorySlug],
      description: bikeData.description,
      pricePerHour: pph,
      images: bikeData.images,
      videoUrl: bikeData.videoUrl,
      availability: bikeData.availability,
      isVerified: bikeData.isVerified,
      renter: renter._id,
      packages
    });
    console.log(`Created: ${bikeData.brand} ${bikeData.model}`);
  }

  console.log(`\nSeeded ${demoBikes.length} demo vehicles successfully!`);
  console.log('Visit http://localhost:5173 to see them.');
  process.exit(0);
}

seedDemoData().catch(err => { console.error(err); process.exit(1); });
