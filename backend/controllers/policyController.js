const Policy = require('../models/Policy');
const { sanitize } = require('../utils/sanitize');

const defaultPolicies = [
  {
    title: 'Rental Terms & Conditions',
    content: 'Valid NID and Driving License are mandatory. Minimum rental age: 18 years. Renter must sign the invoice before pickup. Rental period begins and ends at scheduled times. Extensions must be communicated in advance.',
    type: 'terms',
    sortOrder: 1
  },
  {
    title: 'Fine Policies',
    content: 'Beach sand violation: 1,000 TK. Lost helmet: 2,000 TK. Helmet damage: 500 TK. Boundary violation (Teknaf Marine Drive Zero Point): 5,000 TK. Speed limit violation: As assessed.',
    type: 'fine',
    sortOrder: 2
  },
  {
    title: 'Safety Rules',
    content: 'Driving without helmet is a legal offense. Maximum 2 persons per bike. Speed limit: 50 km/h. All traffic laws must be followed. No driving under influence of alcohol or drugs.',
    type: 'safety',
    sortOrder: 3
  },
  {
    title: 'Petrol Policy',
    content: 'Petrol cost is borne entirely by the renter/customer. The owner will never bear petrol costs. Vehicles are provided with minimum fuel. Refuel at your own expense.',
    type: 'petrol',
    sortOrder: 4
  },
  {
    title: 'Accident & Legal Policy',
    content: 'Most bikes are NOT insured. Full financial responsibility lies with the renter. Renter must compensate the owner for all damages. Report any damage immediately. Repair costs deducted from security deposit.',
    type: 'legal',
    sortOrder: 5
  },
  {
    title: 'Refund Policy',
    content: '24+ hours before rental: Full refund. 12-24 hours before: 50% refund. Less than 12 hours: No refund. No-show: No refund. Refunds processed within 5-7 business days.',
    type: 'refund',
    sortOrder: 6
  }
];

let policiesSeeded = false;
const seedPolicies = async () => {
  if (policiesSeeded) return;
  const count = await Policy.countDocuments();
  if (count === 0) {
    await Policy.insertMany(defaultPolicies);
  }
  policiesSeeded = true;
};

exports.getPublicPolicies = async (req, res) => {
  try {
    await seedPolicies();
    res.set('Cache-Control', 'public, max-age=300');
    const policies = await Policy.find({ isActive: true }).sort({ sortOrder: 1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllPolicies = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    await seedPolicies();
    const policies = await Policy.find().sort({ sortOrder: 1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { title, content, type, sortOrder } = req.body;
    const cleanTitle = sanitize(title);
    const cleanContent = sanitize(content);
    if (!cleanTitle || !cleanContent) return res.status(400).json({ message: 'Title and content are required' });
    const policy = new Policy({ title: cleanTitle, content: cleanContent, type, sortOrder });
    await policy.save();
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const { title, content, type, sortOrder, isActive } = req.body;
    const update = {};
    if (title !== undefined) update.title = sanitize(title);
    if (content !== undefined) update.content = sanitize(content);
    if (type !== undefined) update.type = type;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;
    if (isActive !== undefined) update.isActive = isActive;
    const policy = await Policy.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    res.json(policy);
  } catch (error) {
    console.error('[Policy] updatePolicy error:', error.message);
    res.status(500).json({ message: 'Failed to update policy' });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ message: 'Policy not found' });
    res.json({ message: 'Policy deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
