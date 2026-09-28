const crypto = require('crypto');
const LedgerEntry = require('../models/LedgerEntry');
const logger = require('./logger');

/**
 * Derive a stable key from everything that defines a ledger row. Two retries of
 * the same journal hash identically and dedupe; two legitimately different
 * journals on the same reference (e.g. the advance and remaining-balance halves
 * of one payment) differ in account and amount and so stay distinct.
 */
function rowKey({ bookingId, source, reference, type, account, amount, index }) {
  const content = [bookingId, source, reference || '', type, account, amount, index].join('|');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 40);
}

/**
 * Write a balanced double-entry journal.
 *
 * Every row gets a deterministic `idempotencyKey`, and the model indexes it
 * uniquely (sparse, so pre-existing rows without a key are unaffected). That
 * matters because journals are written from inside transactions that MongoDB
 * may retry: without the key a retry would silently duplicate the money.
 *
 * @param {object} args
 * @param {string} args.bookingId
 * @param {Array<{type: 'debit'|'credit', account: string, amount: number, description: string, reference?: string}>} args.entries
 * @param {string} [args.source]  system | ipn | redirect | manual | admin | walkin | reconciliation
 * @param {string} [args.reference]
 * @param {string} [args.idempotencyKey] overrides the derived key
 * @param {import('mongoose').ClientSession|null} [args.session] join the caller's transaction
 */
async function createJournalEntry({ bookingId, entries, source, reference, idempotencyKey, session = null }) {
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

  const journalSource = source || 'system';
  const journalReference = reference || undefined;

  const docs = entries.map((entry, index) => {
    const amount = Math.round(entry.amount);
    return {
      bookingId,
      type: entry.type,
      account: entry.account,
      amount,
      description: entry.description,
      reference: journalReference || entry.reference,
      source: journalSource,
      idempotencyKey: idempotencyKey
        ? `${idempotencyKey}:${index}`
        : rowKey({
          bookingId: String(bookingId),
          source: journalSource,
          reference: journalReference,
          type: entry.type,
          account: entry.account,
          amount,
          index,
        }),
    };
  });

  const opts = { ordered: false };
  if (session) opts.session = session;

  try {
    return await LedgerEntry.insertMany(docs, opts);
  } catch (err) {
    // A retried transaction recomputes the same keys; those rows already exist.
    if (err.code === 11000 || (Array.isArray(err.writeErrors) && err.writeErrors.every(e => e.code === 11000))) {
      logger.info('Journal already recorded — skipping duplicate rows', {
        bookingId: String(bookingId),
        reference: journalReference,
        source: journalSource,
      });
      return { duplicate: true };
    }
    throw err;
  }
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
