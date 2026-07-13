/**
 * Permanently deletes the soft-deleted DUPLICATE customers produced by
 * dedupeCustomers.js — and nothing else.
 *
 * To avoid nuking customers that were soft-deleted for other (legitimate)
 * reasons, a soft-deleted customer is only purged when ALL of these hold:
 *   1. isDeleted === true
 *   2. it has ZERO references anywhere (quotation/order/machine/report/…)
 *   3. an ACTIVE customer with the same company + hospitalName + phone still
 *      exists (i.e. it really is a duplicate whose keeper survived)
 * Anything failing those checks is left alone and reported.
 *
 * HARD DELETE IS IRREVERSIBLE. Dry run by default — add `--apply` to delete.
 * Optional `--company <id>` limits to one tenant.
 *
 *   node src/scripts/purgeDuplicateCustomers.js            # dry run
 *   node src/scripts/purgeDuplicateCustomers.js --apply    # permanent delete
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const APPLY = process.argv.includes('--apply');
const companyArgIdx = process.argv.indexOf('--company');
const COMPANY_FILTER =
  companyArgIdx !== -1 ? process.argv[companyArgIdx + 1] : null;

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
    `\n${APPLY ? '⚠️  APPLY MODE — records will be PERMANENTLY deleted' : '🔍 DRY RUN — no changes will be made'}\n`
  );

  const companyClause = COMPANY_FILTER
    ? { companyId: new mongoose.Types.ObjectId(COMPANY_FILTER) }
    : {};
  if (COMPANY_FILTER) console.log(`Scoped to company ${COMPANY_FILTER}\n`);

  // Active customers → the set of surviving keepers (company + dedup key).
  const active = await db
    .collection('customers')
    .find({ ...companyClause, isDeleted: { $ne: true } })
    .project({ hospitalName: 1, phone: 1, companyId: 1 })
    .toArray();
  const activeKeys = new Set(
    active.map((c) => `${c.companyId || 'none'}||${dedupKey(c.hospitalName, c.phone)}`)
  );

  // Soft-deleted customers — candidates for permanent removal.
  const deleted = await db
    .collection('customers')
    .find({ ...companyClause, isDeleted: true })
    .project({
      hospitalName: 1,
      phone: 1,
      customerCode: 1,
      companyId: 1,
      deletedAt: 1,
    })
    .toArray();

  console.log(`${deleted.length} soft-deleted customer(s) to evaluate.\n`);

  const toPurge = [];
  let skippedNoKeeper = 0;
  let skippedReferenced = 0;

  for (const d of deleted) {
    const key = `${d.companyId || 'none'}||${dedupKey(d.hospitalName, d.phone)}`;
    const hasKeeper = activeKeys.has(key);
    // eslint-disable-next-line no-await-in-loop
    const refs = await countRefs(db, d._id);

    if (refs.total > 0) {
      skippedReferenced += 1;
      console.log(
        `  SKIP  ${d.customerCode} [${d._id}] "${d.hospitalName}" — still referenced ${JSON.stringify(refs.counts)}`
      );
      continue;
    }
    if (!hasKeeper) {
      skippedNoKeeper += 1;
      console.log(
        `  SKIP  ${d.customerCode} [${d._id}] "${d.hospitalName}" — no active keeper (not a dedupe duplicate)`
      );
      continue;
    }
    toPurge.push(d);
  }

  console.log(
    `\nSummary: ${deleted.length} soft-deleted, ${toPurge.length} to permanently delete, ` +
      `${skippedReferenced} skipped (referenced), ${skippedNoKeeper} skipped (no active keeper).`
  );

  if (APPLY && toPurge.length) {
    const ids = toPurge.map((d) => d._id);

    // Safety net: dump the FULL documents before deleting, so they can be
    // restored (re-inserted) if this was ever a mistake.
    const fullDocs = await db
      .collection('customers')
      .find({ _id: { $in: ids } })
      .toArray();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      __dirname,
      `purged-customers-backup-${stamp}.json`
    );
    fs.writeFileSync(backupPath, JSON.stringify(fullDocs, null, 2));
    console.log(`\n💾 Backup of ${fullDocs.length} record(s) written to:\n   ${backupPath}`);

    const res = await db
      .collection('customers')
      .deleteMany({ _id: { $in: ids } });
    console.log(`✅ Permanently deleted ${res.deletedCount} duplicate customer(s).`);
  } else if (!APPLY && toPurge.length) {
    console.log('\nRe-run with --apply to permanently delete the above.');
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error('\n❌ purgeDuplicateCustomers failed:', e.message);
  process.exit(1);
});
