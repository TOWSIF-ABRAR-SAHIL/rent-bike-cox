const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { name, email, password, nid, license, phoneNumber, address } = req.body;

    if (!name || !email || !password || !nid || !license || !phoneNumber) {
      return res.status(400).json({ message: 'Name, email, password, NID, license, and phone number are required' });
    }
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    if (name.length > 100) return res.status(400).json({ message: 'Name is too long' });

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const nidImage = req.files?.['nidImage']?.[0]?.path || '';
    const licenseImage = req.files?.['licenseImage']?.[0]?.path || '';

    user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'User',
      nid,
      license,
      nidImage,
      licenseImage,
      phoneNumber,
      address
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
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};
