const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Errors MongoDB raises when the connected deployment cannot run
 * multi-document transactions — a standalone `mongod` (typical local dev)
 * rather than a replica set (Atlas, Docker replica-set setups).
 */
const TRANSACTION_UNSUPPORTED = /Transaction numbers are only allowed|replica set member or mongos|Transactions are not supported|does not support transactions/i;

function isTransactionUnsupported(err) {
  if (!err) return false;
  if (err.code === 20 || err.code === 48) return true;
  if (err.codeName === 'IllegalOperation') return true;
  return TRANSACTION_UNSUPPORTED.test(err.message || '');
}

/**
 * Run `fn(session)` inside a transaction when the deployment supports one and
 * fall back to running it once without a session otherwise.
 *
 * Controllers previously called `session.withTransaction(...)` directly, which
 * throws outright against a standalone `mongod` — so the payment callbacks could
 * not be exercised locally at all. `fn` receives the session (or null) so it can
 * pass it to every query it makes; nothing inside `fn` may touch the HTTP
 * response, because the callback can run more than once on retry.
 *
 * @param {(session: import('mongoose').ClientSession|null) => Promise<any>} fn
 * @returns {Promise<any>} whatever `fn` resolves to
 */
async function withOptionalTransaction(fn) {
  let session;
  try {
    session = await mongoose.startSession();
    await session.startTransaction({
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });
  } catch (err) {
    if (session) await session.endSession();
    if (isTransactionUnsupported(err)) {
      logger.warn('Transactions unsupported on this deployment — continuing without a session');
      return fn(null);
    }
    throw err;
  }

  try {
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    try { await session.abortTransaction(); } catch { /* already aborted */ }
    if (isTransactionUnsupported(err)) {
      logger.warn('Transactions unsupported on this deployment — retrying without a session');
      return fn(null);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

module.exports = { withOptionalTransaction, isTransactionUnsupported };
