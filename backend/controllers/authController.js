const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { sanitize } = require('../utils/sanitize');

exports.register = async (req, res) => {
  try {
    const { name, email, password, nid, license, phoneNumber, address } = req.body;
    const cleanName = sanitize(name);
    const cleanNid = sanitize(nid);
    const cleanLicense = sanitize(license);
    const cleanAddress = sanitize(address);

    if (!cleanName || !email || !password || !cleanNid || !cleanLicense || !phoneNumber) {
      return res.status(400).json({ message: 'Name, email, password, NID, license, and phone number are required' });
    }
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (!/[A-Z]/.test(password)) return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });
    if (!/[0-9]/.test(password)) return res.status(400).json({ message: 'Password must contain at least one number' });
    if (name.length > 100) return res.status(400).json({ message: 'Name is too long' });
    if (email.length > 254) return res.status(400).json({ message: 'Email is too long' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const nidImage = req.files?.['nidImage']?.[0]?.path || '';
    const licenseImage = req.files?.['licenseImage']?.[0]?.path || '';

    user = new User({
      name: cleanName,
      email,
      password: hashedPassword,
      role: 'User',
      nid: cleanNid,
      license: cleanLicense,
      nidImage,
      licenseImage,
      phoneNumber,
      address: cleanAddress
    });

    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: { id: user._id, name, email, role: user.role } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Email or NID already exists' });
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};
