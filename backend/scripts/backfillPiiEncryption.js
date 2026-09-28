#!/usr/bin/env node
'use strict';

/**
 * Backfill at-rest encryption for historical PII (nid / license / phoneNumber).
 *
 * Background: models/User.js encrypts those fields on save only when
 * ENCRYPTION_KEY is set, so rows written before the audit-hardening merge hold
 * cleartext. Reads already tolerate both forms (decryptField falls back), and
 * any profile update re-encrypts automatically — this script closes the gap
 * for rows that are never re-saved.
 *
 * Detection: a value counts as ciphertext only if it matches
 * iv:tag:ciphertext hex shape AND decrypts successfully. Anything else that is
 * non-empty is treated as cleartext and encrypted in place.
 *
 * Safety: dry run by default; --apply to write. Uses updateOne (bypasses the
 * pre-save hook, which would double-encrypt). Each written field is read back
 * and decrypted to prove the round-trip before moving on.
 *
 *   node scripts/backfillPiiEncryption.js            # dry run
 *   node scripts/backfillPiiEncryption.js --apply    # write
 *
 * Requires ENCRYPTION_KEY (same key the server boots with — a different key
 * writes values the server cannot read).
 */

require('dotenv').config({ path: `${__dirname}/../.env` });
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const FIELDS = ['nid', 'license', 'phoneNumber'];
const CIPHER_RE = /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/;

function log(...a) {
  console.log(`[${APPLY ? 'apply' : 'dry-run'}]`, ...a);
}

async function main() {
  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY is not set');
    process.exit(1);
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  // Late require so the file is import-safe (CI syntax check requires it).
  const { encrypt, decrypt } = require('../security/utils/cryptoUtils');
  const User = require('../models/User');

  await mongoose.connect(uri);
  log(`connected (${APPLY ? 'APPLYING CHANGES' : 'no changes will be written'})`);

  const users = await User.find({}).select([...FIELDS, 'email']).lean();
  let encrypted = 0;
  let skipped = 0;

  for (const u of users) {
    const set = {};
    for (const f of FIELDS) {
      const val = u[f];
      if (!val || typeof val !== 'string') continue;
      let isCipher = false;
      if (CIPHER_RE.test(val)) {
        try {
          const back = decrypt(val);
          isCipher = back !== val;
        } catch {
          isCipher = false;
        }
      }
      if (!isCipher) set[f] = encrypt(val);
    }
    const names = Object.keys(set);
    if (!names.length) {
      skipped += 1;
      continue;
    }
    log(`user ${u._id} (${u.email || 'no email'}): encrypting ${names.join(', ')}`);
    if (APPLY) {
      await User.updateOne({ _id: u._id }, { $set: set });
      // Round-trip proof: read back and decrypt every written field.
      const fresh = await User.findById(u._id).select(FIELDS).lean();
      for (const f of names) {
        const back = decrypt(fresh[f]);
        if (back !== u[f]) throw new Error(`round-trip mismatch on ${f} for user ${u._id} — aborting`);
      }
      encrypted += 1;
    }
  }

  log(`${APPLY ? 'encrypted' : 'would encrypt'} ${APPLY ? encrypted : users.length - skipped} user(s), ${skipped} already encrypted`);
  await mongoose.disconnect();
  if (!APPLY) log('re-run with --apply to write these changes');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Backfill failed:', err.message);
    process.exit(1);
  });
}
