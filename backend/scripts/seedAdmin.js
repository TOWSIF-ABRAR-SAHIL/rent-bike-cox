require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentbike');
    console.log('Connected to MongoDB for seeding...');

    const adminEmail = 'admin@rentbikecox.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Admin already exists.');
      process.exit();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    const admin = new User({
      name: 'System Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'Admin',
      nid: '0000000000', // Dummy for seed
      license: '0000000000', // Dummy for seed
      phoneNumber: '01891154443',
      address: 'Cox\'s Bazar, Bangladesh'
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@rentbikecox.com');
    console.log('Password: admin123');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
