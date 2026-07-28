const FAQ = require('../models/FAQ');
const { sanitize } = require('../utils/sanitize');
const logger = require('../utils/logger');

const defaultFaqs = [
  { question: 'What documents do I need to rent a vehicle?', answer: 'You need a valid NID (National ID) and a valid Driving License. Both must be uploaded during registration for verification.', category: 'Account', order: 1 },
  { question: 'How do I make a payment?', answer: 'We accept bKash, Nagad, credit/debit cards, and bank transfers via SSLCommerz. You pay an advance (50% for ≤24h, 30% for >24h) and the rest upon pickup.', category: 'Payment', order: 2 },
  { question: 'Can I cancel my booking?', answer: 'Yes. Full refund if cancelled 24+ hours before rental. 50% refund for 12-24 hours. No refund for less than 12 hours. No refund for no-shows.', category: 'Booking', order: 3 },
  { question: 'Is insurance included?', answer: 'Most vehicles are NOT insured. The renter is fully financially responsible for any accident or damage. Repair costs are deducted from your security deposit.', category: 'Booking', order: 4 },
  { question: 'What is the security deposit?', answer: 'A standard security deposit of ৳2,000 is collected at pickup. It is refunded after the vehicle is returned in good condition.', category: 'Payment', order: 5 },
  { question: 'Who pays for petrol?', answer: 'The customer/renter always pays for petrol. Vehicles are provided with minimum fuel. Refuel at your own expense.', category: 'Booking', order: 6 },
  { question: 'How do I become a renter/vehicle owner?', answer: 'Sign up with the Renter role. After admin verification, you can list your vehicles. Set pricing tiers, upload photos, and manage bookings from your dashboard.', category: 'Account', order: 7 },
  { question: 'What if I have an accident?', answer: 'Report any damage immediately. Since most vehicles are uninsured, the renter compensates the owner for all damages. Repair costs are deducted from the security deposit.', category: 'Safety', order: 8 },
  { question: 'How do refunds work?', answer: 'Refunds are processed within 5-7 business days to your original payment method. The amount depends on when you cancelled relative to the rental start time.', category: 'Payment', order: 9 },
  { question: 'Can I extend my rental period?', answer: 'Yes, you can extend through your booking dashboard if the vehicle is available for the additional period. Extension requests are sent to the owner for confirmation.', category: 'Booking', order: 10 },
];

let seeded = false;

exports.seedFaqs = async () => {
  if (seeded) return;
  const count = await FAQ.countDocuments();
  if (count === 0) {
    await FAQ.insertMany(defaultFaqs);
  }
  seeded = true;
};

exports.getActive = async (req, res) => {
  try {
    await exports.seedFaqs();
    const faqs = await FAQ.find({ isActive: true }).sort({ category: 1, order: 1 }).lean();
    const grouped = {};
    faqs.forEach(faq => {
      if (!grouped[faq.category]) grouped[faq.category] = [];
      grouped[faq.category].push(faq);
    });
    res.json({ categories: Object.keys(grouped), faqs: grouped });
  } catch (error) {
    logger.error('getActive faqs error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAll = async (req, res) => {
  try {
    await exports.seedFaqs();
    const faqs = await FAQ.find().sort({ category: 1, order: 1 }).lean();
    res.json(faqs);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { question, answer, category, order } = req.body;
    if (!question || !answer || !category) return res.status(400).json({ message: 'Question, answer, and category are required' });
    const faq = await FAQ.create({ question: sanitize(question), answer: sanitize(answer), category: sanitize(category), order: order || 0 });
    res.status(201).json(faq);
  } catch (error) {
    logger.error('create faq error:', error.message);
    res.status(500).json({ message: 'Failed to create FAQ' });
  }
};

exports.update = async (req, res) => {
  try {
    const { question, answer, category, order, isActive } = req.body;
    const update = {};
    if (question !== undefined) update.question = sanitize(String(question));
    if (answer !== undefined) update.answer = sanitize(String(answer));
    if (category !== undefined) update.category = sanitize(String(category));
    if (order !== undefined) update.order = order;
    if (isActive !== undefined) update.isActive = isActive;
    const faq = await FAQ.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    res.json(faq);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update FAQ' });
  }
};

exports.remove = async (req, res) => {
  try {
    const faq = await FAQ.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    res.json({ message: 'FAQ deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.reorder = async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) return res.status(400).json({ message: 'Orders array is required' });
    const ops = orders.map(({ id, order }) => FAQ.findByIdAndUpdate(id, { order }));
    await Promise.all(ops);
    res.json({ message: 'Reordered' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reorder' });
  }
};

exports.trackHelpful = async (req, res) => {
  try {
    const { helpful } = req.body;
    const field = helpful ? 'helpfulCount' : 'notHelpfulCount';
    const faq = await FAQ.findByIdAndUpdate(req.params.id, { $inc: { [field]: 1, viewCount: 1 } }, { new: true });
    if (!faq) return res.status(404).json({ message: 'FAQ not found' });
    res.json({ helpfulCount: faq.helpfulCount, notHelpfulCount: faq.notHelpfulCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
