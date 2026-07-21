require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike');
  console.log('Connected to MongoDB');

  const exists = await User.findOne({ email: 'admin@rentbikecox.com' });
  if (exists) {
    console.log('Admin user already exists');
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('admin123', salt);

  await User.create({
    name: 'Admin',
    email: 'admin@rentbikecox.com',
    password: hashedPassword,
    role: 'Admin',
    phoneNumber: '01700000000',
    nid: '0000000000000',
    license: 'ADMIN000',
    isVerified: true
  });

  console.log('Admin user created successfully!');
  console.log('Email: admin@rentbikecox.com');
  console.log('Password: admin123');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
