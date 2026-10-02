#!/usr/bin/env node
/**
 * Data migrations for the payment/booking/coupon fixes.
 *
 * Dry run by default — it prints exactly what it would change and writes nothing.
 * Pass --apply to make the changes.
 *
 *   node scripts/migrateFixes.js                  # report only
 *   node scripts/migrateFixes.js --apply          # run every migration
 *   node scripts/migrateFixes.js --apply --only=usedBy
 *
 * Migrations
 *   usedBy       Coupon.usedBy held bare ObjectIds in some rows (three call sites
 *                wrote `$addToSet: { usedBy: booking.user }`). Readers now accept
 *                both shapes, but normalising removes the ambiguity.
 *   hashes       Backfill nidHash/phoneHash for rows written before keyed hashing
 *                existed, so duplicate detection covers historical accounts.
 *                Requires PII_HASH_PEPPER or ENCRYPTION_KEY.
 *   availability Bike.availability used to be a global booking lock. Bikes still
 *                flagged false with no active booking were hidden from the
 *                marketplace by a booking that has since ended.
 *   campaigns    POST /admin/campaigns/:id/send used to email the whole audience
 *                inside the HTTP request and only recorded counts at the very end,
 *                so a request that died mid-send left the campaign in `sending` with
 *                no progress. The background sender now picks up `sending` campaigns
 *                and would resend to the entire audience from offset 0. Those rows are
 *                reported and, with --apply, marked `failed` for inspection.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Bike = require('../models/Bike');
const Booking = require('../models/Booking');
const EmailCampaign = require('../models/EmailCampaign');
const { hashIdentifier, isHashingAvailable } = require('../security/utils/piiHash');
const { ACTIVE_STATUSES } = require('../utils/bookingLock');

const APPLY = process.argv.includes('--apply');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;

function log(...args) {
  console.log(APPLY ? '[apply]' : '[dry-run]', ...args);
}

function shouldRun(name) {
  return !ONLY || ONLY === name;
}

async function migrateUsedBy() {
  const coupons = await Coupon.find({ 'usedBy.0': { $exists: true } }).lean();
  let touched = 0;
  let entries = 0;

  for (const coupon of coupons) {
    let changed = false;

    const normalised = (coupon.usedBy || []).map((entry) => {
      // Already the documented shape.
      if (entry && entry.user) return entry;

      // Legacy shapes: a bare ObjectId string, or a subdocument whose only field
      // is the generated _id holding that ObjectId.
      const rawId = entry && (entry._id || entry);
      if (!rawId || !mongoose.Types.ObjectId.isValid(String(rawId))) return entry;

      changed = true;
      entries += 1;
      return { user: rawId, usedAt: entry.usedAt || new Date() };
    });

    if (changed) {
      touched += 1;
      log(`coupon ${coupon.code}: normalising ${normalised.length} usedBy entries`);
      if (APPLY) {
        await Coupon.updateOne({ _id: coupon._id }, { $set: { usedBy: normalised } });
      }
    }
  }

  log(`usedBy: ${touched} coupon(s) need normalising (${entries} legacy entries)`);
  return { coupons: touched, entries };
}

async function migrateHashes() {
  if (!isHashingAvailable()) {
    log('hashes: skipped — set PII_HASH_PEPPER (or ENCRYPTION_KEY) first');
    return { users: 0, skipped: true };
  }

  // Plain find so the model's post hooks decrypt nid/phoneNumber for hashing.
  const users = await User.find({
    $or: [{ nidHash: { $exists: false } }, { nidHash: null }, { phoneHash: { $exists: false } }, { phoneHash: null }],
  });

  let updated = 0;

  for (const user of users) {
    const update = {};
    if (!user.nidHash) {
      const digest = hashIdentifier(user.nid);
      if (digest) update.nidHash = digest;
    }
    if (!user.phoneHash) {
      const digest = hashIdentifier(user.phoneNumber);
      if (digest) update.phoneHash = digest;
    }
    if (Object.keys(update).length === 0) continue;

    updated += 1;
    log(`user ${user._id}: backfilling ${Object.keys(update).join(', ')}`);
    if (APPLY) {
      // Targeted $set so the encrypted PII fields are not rewritten.
      await User.updateOne({ _id: user._id }, { $set: update });
    }
  }

  log(`hashes: ${updated} user(s) need backfilling`);
  return { users: updated };
}

async function migrateAvailability() {
  const stuck = await Bike.find({ availability: false, isUnderMaintenance: false }).select('_id model').lean();
  let restored = 0;

  for (const bike of stuck) {
    const active = await Booking.exists({ bike: bike._id, status: { $in: ACTIVE_STATUSES } });
    if (active) continue;

    restored += 1;
    log(`bike ${bike._id} (${bike.model}): out of service with no active booking -> back in service`);
    if (APPLY) {
      await Bike.updateOne({ _id: bike._id }, { $set: { availability: true } });
    }
  }

  log(`availability: ${restored} bike(s) would return to the marketplace`);
  return { bikes: restored };
}

/**
 * Campaigns abandoned mid-send by the old synchronous implementation.
 *
 * A campaign that genuinely got partway through either carries `progress` (the
 * background job writes it every batch) or `sentCount` (the new queued path). One with
 * neither was started but never recorded a single send, so resuming it would email
 * every recipient again.
 */
async function migrateStaleCampaigns() {
  const stale = await EmailCampaign.find({
    status: 'sending',
    'progress.sent': { $in: [null, 0] },
    'progress.failed': { $in: [null, 0] },
    sentCount: { $in: [null, 0] },
  }).select('_id name subject createdAt').lean();

  if (stale.length === 0) {
    log('campaigns: none stuck in `sending` with zero recorded progress');
    return { campaignIds: [] };
  }

  for (const c of stale) {
    log(`campaign ${c._id} "${c.name}" is \`sending\` with no progress — would be marked \`failed\` (created ${c.createdAt})`);
  }

  if (APPLY) {
    await EmailCampaign.updateMany(
      { _id: { $in: stale.map(c => c._id) } },
      { $set: { status: 'failed' } },
    );
  }

  log(`campaigns: ${stale.length} campaign(s) would stop being queued for resend`);
  return { campaignIds: stale.map(c => String(c._id)) };
}

/**
 * Leftover unique (non-sparse) index on `users.nid` from when NID itself was
 * unique. Customers now register with nid '' and the second one collides on
 * the empty string (11000 "Email or NID already exists"). Duplicate detection
 * lives on the sparse `nidHash`, so this index is safe to drop.
 */
async function migrateNidIndex() {
  const indexes = await mongoose.connection.db.collection('users').indexes();
  const stale = indexes.find(i => i.name === 'nid_1' && i.unique && !i.sparse);
  if (!stale) {
    log('nidIndex: no stale unique non-sparse nid_1 index');
    return { dropped: false };
  }
  log('nidIndex: stale unique non-sparse nid_1 index blocks customer signups — would drop it');
  if (APPLY) {
    await mongoose.connection.db.collection('users').dropIndex('nid_1');
  }
  return { dropped: true };
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_ATLAS;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  log(`connected (${APPLY ? 'APPLYING CHANGES' : 'no changes will be written'})`);

  try {
    if (shouldRun('usedBy')) await migrateUsedBy();
    if (shouldRun('hashes')) await migrateHashes();
    if (shouldRun('availability')) await migrateAvailability();
    if (shouldRun('campaigns')) await migrateStaleCampaigns();
    if (shouldRun('nidIndex')) await migrateNidIndex();
  } finally {
    await mongoose.disconnect();
  }

  if (!APPLY) log('re-run with --apply to write these changes');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
}
