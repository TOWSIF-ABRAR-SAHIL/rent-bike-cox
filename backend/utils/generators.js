const { v4: uuidv4 } = require('uuid');
const counter = require('../models/Counter');

async function generateIntentId() {
  const year = new Date().getFullYear();
  const seq = await counter.findOneAndUpdate(
    { name: 'paymentIntent' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `PI-${year}-${String(seq.seq).padStart(6, '0')}`;
}

async function generateRefundId() {
  const year = new Date().getFullYear();
  const seq = await counter.findOneAndUpdate(
    { name: 'refund' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `RF-${year}-${String(seq.seq).padStart(6, '0')}`;
}

async function generatePayoutId() {
  const year = new Date().getFullYear();
  const seq = await counter.findOneAndUpdate(
    { name: 'payout' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `PO-${year}-${String(seq.seq).padStart(6, '0')}`;
}

async function generateBookingCode() {
  const year = new Date().getFullYear();
  const seq = await counter.findOneAndUpdate(
    { name: 'bookingCode' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `RBC-${year}-${String(seq.seq).padStart(6, '0')}`;
}

module.exports = { generateIntentId, generateRefundId, generatePayoutId, generateBookingCode };
