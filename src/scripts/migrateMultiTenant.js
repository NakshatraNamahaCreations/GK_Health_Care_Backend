/**
 * One-time migration to multi-tenancy.
 *
 *   node src/scripts/migrateMultiTenant.js
 *
 * - Creates a default Company from the existing CompanySettings (or sensible
 *   defaults) if no company exists yet.
 * - Stamps every existing tenant document with that company's id.
 * - Assigns every user (without companies) to that company.
 * - Re-keys existing counters under the company so numbering continues.
 * - Drops the old GLOBAL unique indexes that are now per-company compound
 *   indexes (Mongoose builds the new ones automatically).
 *
 * Safe to re-run: it no-ops where data is already migrated.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../config/db');

const Company = require('../modules/companies/company.model');
const CompanySettings = require('../modules/companySettings/companySettings.model');
const User = require('../modules/users/user.model');

// Tenant models to stamp.
const tenantModels = [
  '../modules/customers/customer.model',
  '../modules/customerContacts/customerContact.model',
  '../modules/customerMachines/customerMachine.model',
  '../modules/leads/lead.model',
  '../modules/leads/leadFollowUp.model',
  '../modules/tasks/task.model',
  '../modules/products/product.model',
  '../modules/spareParts/sparePart.model',
  '../modules/quotations/quotation.model',
  '../modules/payments/payment.model',
  '../modules/outstandings/outstanding.model',
  '../modules/expenses/expense.model',
  '../modules/expenseCategories/expenseCategory.model',
  '../modules/reports/incident/incidentReport.model',
  '../modules/reports/inspection/inspectionReport.model',
  '../modules/reports/installation/installationReport.model',
  '../modules/reports/preventiveMaintenance/pmReport.model',
  '../modules/reports/service/serviceReport.model',
  '../modules/notifications/notification.model',
].map((p) => require(p));

// Old global unique indexes to drop (collection -> index name).
const OLD_INDEXES = [
  ['customers', 'customerCode_1'],
  ['tasks', 'taskNumber_1'],
  ['products', 'productCode_1'],
  ['spareparts', 'partCode_1'],
  ['quotations', 'quotationNumber_1'],
  ['expensecategories', 'name_1'],
  ['customermachines', 'serialNumber_1'],
  ['outstandings', 'customerId_1_invoiceNumber_1'],
  ['incidentreports', 'reportNumber_1'],
  ['inspectionreports', 'reportNumber_1'],
  ['installationreports', 'reportNumber_1'],
  ['preventivemaintenancereports', 'reportNumber_1'],
  ['servicereports', 'reportNumber_1'],
];

async function ensureDefaultCompany() {
  const existing = await Company.findOne().sort({ createdAt: 1 });
  if (existing) return existing;

  const settings = await CompanySettings.findOne();
  const base = settings
    ? settings.toObject()
    : {
        name: 'G K Health Care',
        tagline: 'Dialysis Machines · Spare Parts · Service',
        address: '(Doddabettahalli), Vidyaranyapura Post\nBengaluru 560 097',
        phone: '7338107453 / 82962 22357',
        email: 'gkhealthcare9@gmail.com',
        gstin: '29CVQPR4106K1ZX',
        stateName: 'Karnataka',
        stateCode: '29',
      };

  return Company.create({
    name: base.name || 'G K Health Care',
    tagline: base.tagline || '',
    address: base.address || '',
    phone: base.phone || '',
    email: base.email || '',
    gstin: base.gstin || '',
    stateName: base.stateName || '',
    stateCode: base.stateCode || '',
    logoUrl: base.logoUrl || '',
  });
}

async function dropOldIndexes() {
  for (const [coll, name] of OLD_INDEXES) {
    try {
      await mongoose.connection.db.collection(coll).dropIndex(name);
      console.log(`  dropped index ${coll}.${name}`);
    } catch (err) {
      if (err.codeName === 'IndexNotFound' || /index not found/i.test(err.message)) {
        // Already gone — fine.
      } else {
        console.log(`  (skip) ${coll}.${name}: ${err.message}`);
      }
    }
  }
}

async function migrateCounters(cid) {
  const Counter = require('../modules/counters/counter.model');
  const prefix = `${cid.toString()}:`;
  const all = await Counter.find({});
  for (const c of all) {
    if (c._id.startsWith(prefix)) continue; // already scoped
    const newId = prefix + c._id;
    const exists = await Counter.findById(newId);
    if (!exists) {
      await Counter.create({ _id: newId, seq: c.seq });
      await Counter.deleteOne({ _id: c._id });
      console.log(`  counter ${c._id} -> ${newId} (seq ${c.seq})`);
    }
  }
}

async function run() {
  await connectDB();
  console.log('Connected. Starting multi-tenant migration...');

  const company = await ensureDefaultCompany();
  const cid = company._id;
  console.log(`Default company: ${company.name} (${cid})`);

  console.log('Dropping old global unique indexes...');
  await dropOldIndexes();

  console.log('Stamping tenant collections...');
  for (const Model of tenantModels) {
    const res = await Model.updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: cid } }
    );
    console.log(`  ${Model.modelName}: ${res.modifiedCount} updated`);
  }

  console.log('Assigning users to the default company...');
  const userRes = await User.updateMany(
    { $or: [{ companyIds: { $exists: false } }, { companyIds: { $size: 0 } }] },
    { $set: { companyIds: [cid] } }
  );
  console.log(`  users: ${userRes.modifiedCount} updated`);

  console.log('Migrating counters...');
  await migrateCounters(cid);

  console.log('Building new indexes...');
  for (const Model of tenantModels) {
    try {
      await Model.createIndexes();
    } catch (err) {
      console.log(`  (skip) ${Model.modelName} indexes: ${err.message}`);
    }
  }

  console.log('Migration complete.');
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
