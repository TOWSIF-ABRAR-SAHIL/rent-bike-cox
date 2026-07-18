const Counter = require('../models/Counter');

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { name: 'invoice' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const padded = String(counter.seq).padStart(6, '0');
  return `RBC-${year}-${padded}`;
}

module.exports = { generateInvoiceNumber };
