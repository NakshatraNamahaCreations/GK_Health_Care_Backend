/**
 * One-off cleanup for duplicate customers created by the old buggy import.
 *
 * Duplicates are grouped per company by `hospitalName + phone` (normalized) —
 * the same key the fixed import uses. Within each group one "keeper" is chosen
 * (the most-referenced record, tie-broken by oldest) and the remaining
 * duplicates are soft-deleted — BUT ONLY if they are not referenced by any
 * other record (quotation, order, machine, report, payment, …). A duplicate
 * that still has references is left untouched and flagged for manual review, so
 * nothing is ever orphaned.
 *
 * SAFE BY DEFAULT: this is a dry run and changes nothing. Add `--apply` to
 * actually soft-delete. Optional `--company <id>` limits to one tenant.
 *
 *   node src/scripts/dedupeCustomers.js                 # dry run (report only)
 *   node src/scripts/dedupeCustomers.js --apply         # perform soft-deletes
 *   node src/scripts/dedupeCustomers.js --company <id>  # scope to one company
 */

const mongoose = require('mongoose');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');
const companyArgIdx = process.argv.indexOf('--company');
const COMPANY_FILTER =
  companyArgIdx !== -1 ? process.argv[companyArgIdx + 1] : null;

// Every collection + field that points at a customer. Deleting a customer that
// appears in any of these would orphan data, so such duplicates are skipped.
const REFERENCES = [
  { coll: 'customercontacts', field: 'customerId' },
  { coll: 'customermachines', field: 'customerId' },
  { coll: 'leads', field: 'convertedCustomerId' },
  { coll: 'orderdocuments', field: 'customerId' },
  { coll: 'orders', field: 'customerId' },
  { coll: 'outstandings', field: 'customerId' },
  { coll: 'payments', field: 'customerId' },
  { coll: 'quotations', field: 'customerId' },
  { coll: 'tasks', field: 'customerId' },
  { coll: 'incidentreports', field: 'customerId' },
  { coll: 'inspectionreports', field: 'customerId' },
  { coll: 'installationreports', field: 'customerId' },
  { coll: 'preventivemaintenancereports', field: 'customerId' },
  { coll: 'servicereports', field: 'customerId' },
];

const normPhone = (p) => String(p || '').replace(/\D/g, '');
const normName = (s) =>
  String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
const dedupKey = (hospitalName, phone) =>
  `${normName(hospitalName)}|${normPhone(phone)}`;

async function countRefs(db, customerId) {
  const counts = {};
  let total = 0;
  for (const { coll, field } of REFERENCES) {
    // eslint-disable-next-line no-await-in-loop
    const n = await db.collection(coll).countDocuments({ [field]: customerId });
    if (n > 0) {
      counts[coll] = n;
      total += n;
    }
  }
  return { total, counts };
}

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(
    `\n${APPLY ? '⚠️  APPLY MODE — soft-deletes WILL be written' : '🔍 DRY RUN — no changes will be made'}\n`
  );

  const custFilter = { isDeleted: { $ne: true } };
  if (COMPANY_FILTER) {
    custFilter.companyId = new mongoose.Types.ObjectId(COMPANY_FILTER);
    console.log(`Scoped to company ${COMPANY_FILTER}\n`);
  }

  const customers = await db
    .collection('customers')
    .find(custFilter)
    .project({
      hospitalName: 1,
      phone: 1,
      customerCode: 1,
      companyId: 1,
      createdAt: 1,
    })
    .toArray();

  // Group by companyId + dedup key.
  const groups = new Map();
  for (const c of customers) {
    const key = `${c.companyId || 'none'}||${dedupKey(c.hospitalName, c.phone)}`;
    const arr = groups.get(key) || [];
    arr.push(c);
    groups.set(key, arr);
  }

  const dupGroups = [...groups.values()].filter((g) => g.length > 1);
  console.log(
    `${customers.length} active customers → ${dupGroups.length} duplicate group(s).\n`
  );

  const toDelete = [];
  let manualReview = 0;

  for (const group of dupGroups) {
    // Reference counts for each member.
    const withRefs = [];
    for (const member of group) {
      // eslint-disable-next-line no-await-in-loop
      const refs = await countRefs(db, member._id);
      withRefs.push({ ...member, refs });
    }
    // Keeper: most references, then oldest.
    withRefs.sort((a, b) => {
      if (b.refs.total !== a.refs.total) return b.refs.total - a.refs.total;
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    });
    const keeper = withRefs[0];
    const others = withRefs.slice(1);

    console.log(
      `• ${keeper.hospitalName}  (${normPhone(keeper.phone)})  —  ${group.length} records`
    );
    console.log(
      `    KEEP   ${keeper.customerCode}  [${keeper._id}]  refs=${keeper.refs.total}`
    );
    for (const o of others) {
      if (o.refs.total === 0) {
        toDelete.push(o);
        console.log(
          `    DELETE ${o.customerCode}  [${o._id}]  refs=0`
        );
      } else {
        manualReview += 1;
        console.log(
          `    SKIP   ${o.customerCode}  [${o._id}]  refs=${o.refs.total} ` +
            `${JSON.stringify(o.refs.counts)}  → keep & merge manually`
        );
      }
    }
  }

  console.log(
    `\nSummary: ${dupGroups.length} groups, ${toDelete.length} deletable duplicate(s), ` +
      `${manualReview} needing manual merge (still referenced).`
  );

  if (APPLY && toDelete.length) {
    const ids = toDelete.map((d) => d._id);
    const res = await db.collection('customers').updateMany(
      { _id: { $in: ids } },
      { $set: { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );
    console.log(`\n✅ Soft-deleted ${res.modifiedCount} duplicate customer(s).`);
  } else if (!APPLY && toDelete.length) {
    console.log('\nRe-run with --apply to soft-delete the DELETE rows above.');
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error('\n❌ dedupeCustomers failed:', e.message);
  process.exit(1);
});
