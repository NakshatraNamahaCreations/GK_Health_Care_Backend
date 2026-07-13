/**
 * Backfills missing stateId / cityId references on customers that were imported
 * with only the denormalized state/city NAMES (so the edit form can pre-select
 * them). Purely additive — it only SETS a reference when there's a confident
 * name match; it never clears or overwrites an existing reference and never
 * deletes anything.
 *
 * Matching:
 *   - stateName → State (case/space-insensitive)
 *   - cityName  → City, scoped to the customer's state; skipped if ambiguous
 *     (same city name in multiple states and no state to disambiguate).
 *
 * DRY RUN by default — add `--apply` to write. Optional `--company <id>`.
 *
 *   node src/scripts/backfillCustomerLocations.js            # dry run
 *   node src/scripts/backfillCustomerLocations.js --apply    # write refs
 */

const mongoose = require('mongoose');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');
const companyArgIdx = process.argv.indexOf('--company');
const COMPANY_FILTER =
  companyArgIdx !== -1 ? process.argv[companyArgIdx + 1] : null;

const normName = (s) =>
  String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(
    `\n${APPLY ? '⚠️  APPLY MODE — references WILL be written' : '🔍 DRY RUN — no changes will be made'}\n`
  );

  const companyClause = COMPANY_FILTER
    ? { companyId: new mongoose.Types.ObjectId(COMPANY_FILTER) }
    : {};
  if (COMPANY_FILTER) console.log(`Scoped to company ${COMPANY_FILTER}\n`);

  const [states, cities] = await Promise.all([
    db.collection('states').find({}).project({ name: 1 }).toArray(),
    db.collection('cities').find({}).project({ name: 1, stateId: 1, stateName: 1 }).toArray(),
  ]);
  const stateByName = new Map(states.map((s) => [normName(s.name), s]));
  const cityByName = new Map(); // normName -> [cities]
  for (const c of cities) {
    const k = normName(c.name);
    const arr = cityByName.get(k) || [];
    arr.push(c);
    cityByName.set(k, arr);
  }

  const customers = await db
    .collection('customers')
    .find({ ...companyClause, isDeleted: { $ne: true } })
    .project({ hospitalName: 1, stateId: 1, stateName: 1, cityId: 1, cityName: 1 })
    .toArray();

  let stateFixed = 0;
  let cityFixed = 0;
  let cityAmbiguous = 0;
  let cityUnmatched = 0;
  const updates = [];

  for (const c of customers) {
    const set = {};

    // Resolve stateId from stateName if missing.
    let stateId = c.stateId || null;
    if (!stateId && c.stateName) {
      const st = stateByName.get(normName(c.stateName));
      if (st) {
        set.stateId = st._id;
        set.stateName = st.name;
        stateId = st._id;
        stateFixed += 1;
      }
    }

    // Resolve cityId from cityName if missing.
    if (!c.cityId && c.cityName) {
      const candidates = cityByName.get(normName(c.cityName)) || [];
      let match = null;
      if (stateId) {
        match = candidates.find((x) => String(x.stateId) === String(stateId)) || null;
      } else if (candidates.length === 1) {
        match = candidates[0];
      }
      if (match) {
        set.cityId = match._id;
        set.cityName = match.name;
        if (!stateId && match.stateId) {
          set.stateId = match.stateId;
          set.stateName = match.stateName;
        }
        cityFixed += 1;
      } else if (candidates.length > 1) {
        cityAmbiguous += 1;
        console.log(`  AMBIGUOUS city "${c.cityName}" for ${c.hospitalName} — ${candidates.length} matches, no state to disambiguate`);
      } else {
        cityUnmatched += 1;
        console.log(`  NO MATCH  city "${c.cityName}" for ${c.hospitalName}`);
      }
    }

    if (Object.keys(set).length) updates.push({ _id: c._id, set });
  }

  console.log(
    `\nSummary: ${customers.length} customers scanned.\n` +
      `  stateId backfilled: ${stateFixed}\n` +
      `  cityId backfilled:  ${cityFixed}\n` +
      `  city ambiguous:     ${cityAmbiguous}\n` +
      `  city unmatched:     ${cityUnmatched}`
  );

  if (APPLY && updates.length) {
    const ops = updates.map((u) => ({
      updateOne: { filter: { _id: u._id }, update: { $set: { ...u.set, updatedAt: new Date() } } },
    }));
    const res = await db.collection('customers').bulkWrite(ops, { ordered: false });
    console.log(`\n✅ Updated ${res.modifiedCount} customer(s).`);
  } else if (!APPLY && updates.length) {
    console.log(`\n${updates.length} customer(s) would be updated. Re-run with --apply.`);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error('\n❌ backfillCustomerLocations failed:', e.message);
  process.exit(1);
});
