// One-shot: drops legacy indexes left behind by pre-reconciliation schemas.
// Safe to run multiple times — non-existent indexes are ignored.
//
//   node src/scripts/dropLegacyIndexes.js

require('../config/env');
const mongoose = require('mongoose');
const logger = require('../config/logger');
const { connectDB, disconnectDB } = require('../config/db');

// (collection, indexName) pairs to drop if present.
const LEGACY_INDEXES = [
  ['roles', 'name_1'],         // old { name: 1, unique: true } — replaced by roleName
  ['users', 'role_1'],         // any stray index on old `role` field
];

async function dropIfExists(collection, indexName) {
  const coll = mongoose.connection.collection(collection);
  try {
    const indexes = await coll.indexes();
    if (!indexes.some((i) => i.name === indexName)) {
      logger.info(`[skip] ${collection}.${indexName} not present`);
      return;
    }
    await coll.dropIndex(indexName);
    logger.info(`[drop] ${collection}.${indexName} removed`);
  } catch (err) {
    logger.warn(`[fail] ${collection}.${indexName}: ${err.message}`);
  }
}

async function run() {
  try {
    await connectDB();
    for (const [coll, idx] of LEGACY_INDEXES) {
      // eslint-disable-next-line no-await-in-loop
      await dropIfExists(coll, idx);
    }
    logger.info('Done.');
  } catch (err) {
    logger.error(`Index cleanup failed: ${err.stack || err.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

run();
