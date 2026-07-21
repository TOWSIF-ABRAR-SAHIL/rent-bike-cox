require('dotenv').config();
const mongoose = require('mongoose');
const Bike = require('./models/Bike');
const Category = require('./models/Category');

async function fixImages() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike');
  console.log('Connected');

  const replacements = {
    'photo-1558618666-fcd25c85f82e': 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=600&fit=crop'
  };

  // Also replace all images with known-good bike/car/jeep images
  const bikeImages = [
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1622185135505-2d795003994a?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&h=600&fit=crop'
  ];

  const carImages = [
    'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=600&fit=crop'
  ];

  const jeepImages = [
    'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=800&h=600&fit=crop'
  ];

  // Test new bike images
  for (const url of [...bikeImages, ...carImages, ...jeepImages]) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const status = res.status;
      if (status !== 200) console.log('BROKEN: ' + url + ' -> ' + status);
    } catch(e) {
      console.log('ERROR: ' + url);
    }
  }

  // Fix broken URLs in existing bikes
  const allBikes = await Bike.find();
  let fixedCount = 0;
  for (const bike of allBikes) {
    let changed = false;
    bike.images = bike.images.map(img => {
      if (img.includes('photo-1558618666-fcd25c85f82e')) {
        changed = true;
        return bikeImages[0]; // good bike image
      }
      return img;
    });
    if (changed) {
      await bike.save();
      fixedCount++;
      console.log('Fixed: ' + bike.brand + ' ' + bike.model);
    }
  }
  console.log('Total fixed: ' + fixedCount);

  process.exit(0);
}

fixImages().catch(e => { console.error(e); process.exit(1); });
