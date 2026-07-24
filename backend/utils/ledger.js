const LedgerEntry = require('../models/LedgerEntry');

async function createJournalEntry({ bookingId, entries, source, reference, idempotencyKey }) {
  if (!entries || entries.length < 2) {
    throw new Error('Journal must have at least 2 entries (debit + credit)');
  }

  const totalDebit = entries
    .filter(e => e.type === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = entries
    .filter(e => e.type === 'credit')
    .reduce((sum, e) => sum + e.amount, 0);

  if (totalDebit !== totalCredit) {
    throw new Error(`Journal imbalance: debit=${totalDebit}, credit=${totalCredit}`);
  }

  const docs = entries.map(entry => ({
    bookingId,
    type: entry.type,
    account: entry.account,
    amount: Math.round(entry.amount),
    description: entry.description,
    reference: reference || entry.reference,
    source: source || entry.source || 'system',
    idempotencyKey: idempotencyKey || entry.idempotencyKey,
  }));

  return LedgerEntry.insertMany(docs, { ordered: true });
}

async function getBookingLedger(bookingId) {
  return LedgerEntry.find({ bookingId }).sort({ createdAt: 1 }).lean();
}

async function getDailySummary(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return LedgerEntry.aggregate([
    { $match: { createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { type: '$type', account: '$account' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.type': 1, '_id.account': 1 } },
  ]);
}

async function verifyLedgerBalance(bookingId) {
  const entries = await LedgerEntry.find({ bookingId }).lean();
  let debitTotal = 0;
  let creditTotal = 0;

  for (const entry of entries) {
    if (entry.type === 'debit') debitTotal += entry.amount;
    else creditTotal += entry.amount;
  }

  return {
    balanced: debitTotal === creditTotal,
    debitTotal,
    creditTotal,
    difference: debitTotal - creditTotal,
    entryCount: entries.length,
  };
}

module.exports = { createJournalEntry, getBookingLedger, getDailySummary, verifyLedgerBalance };
