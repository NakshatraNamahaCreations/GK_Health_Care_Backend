const Customer = require('./customer.model');
const State = require('../locations/state.model');
const City = require('../locations/city.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { nextCode, reserveCodes } = require('../../utils/codeGenerator');
const { ROLE_STATUS } = require('../../constants/status');
const { auditLegacy: audit } = require('../../services/auditService');
const { parseFirstSheet } = require('../../services/excelService');
const { rowsFromCsv, toCsv } = require('../../utils/csv');
const { importRow: importRowSchema } = require('./customer.validation');

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Resolves and denormalizes state/city/assignedTo into the customer doc.
async function resolveDenormalized(payload) {
  const denorm = {};

  if (payload.stateId) {
    const state = await State.findById(payload.stateId);
    if (!state) throw ApiError.badRequest('Invalid stateId');
    denorm.stateId = state._id;
    denorm.stateName = state.name;
  }

  if (payload.cityId) {
    const city = await City.findById(payload.cityId);
    if (!city) throw ApiError.badRequest('Invalid cityId');
    if (payload.stateId && city.stateId.toString() !== payload.stateId) {
      throw ApiError.badRequest('City does not belong to the specified state');
    }
    denorm.cityId = city._id;
    denorm.cityName = city.name;
    // If the caller omitted stateId, infer it from the city.
    if (!denorm.stateId) {
      denorm.stateId = city.stateId;
      denorm.stateName = city.stateName;
    }
  }

  if (payload.assignedTo) {
    const u = await User.findById(payload.assignedTo);
    if (!u) throw ApiError.badRequest('Invalid assignedTo user');
    denorm.assignedTo = u._id;
  }

  return denorm;
}

async function createCustomer(payload, actorId) {
  const denorm = await resolveDenormalized(payload);
  const customerCode = await nextCode('customer', 'CUST', 5);

  const customer = await Customer.create({
    ...payload,
    ...denorm,
    customerCode,
    createdBy: actorId,
    updatedBy: actorId,
  });
  audit('CUSTOMER_CREATED', customer._id, actorId, null, customer.toObject());
  return customer;
}

// Shared list/export filter — keeps the customers grid and the CSV export in sync.
function buildCustomerFilter({ search, status, stateId, cityId, customerType, assignedTo }) {
  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (stateId) filter.stateId = stateId;
  if (cityId) filter.cityId = cityId;
  if (customerType) filter.customerType = customerType;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (search) {
    const re = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { customerName: re },
      { hospitalName: re },
      { phone: re },
      { email: re },
      { customerCode: re },
    ];
  }
  return filter;
}

async function listCustomers(q) {
  const { page, limit } = q;
  const filter = buildCustomerFilter(q);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Customer.find(filter)
      .populate('assignedTo', 'name mobileNumber email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Customer.countDocuments(filter),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

async function getCustomer(id) {
  const customer = await Customer.findOne({ _id: id, isDeleted: false }).populate(
    'assignedTo',
    'name mobileNumber email'
  );
  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

async function updateCustomer(id, payload, actorId) {
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) throw ApiError.notFound('Customer not found');

  const oldValue = customer.toObject();
  const denorm = await resolveDenormalized(payload);
  Object.assign(customer, payload, denorm, { updatedBy: actorId });
  await customer.save();
  audit('CUSTOMER_UPDATED', customer._id, actorId, oldValue, customer.toObject());
  return customer;
}

async function softDeleteCustomer(id, actorId) {
  const customer = await Customer.findOne({ _id: id, isDeleted: false });
  if (!customer) throw ApiError.notFound('Customer not found');

  customer.isDeleted = true;
  customer.deletedAt = new Date();
  customer.deletedBy = actorId;
  customer.status = ROLE_STATUS.INACTIVE;
  customer.updatedBy = actorId;
  await customer.save();
  audit('CUSTOMER_DELETED', customer._id, actorId);
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// CSV / Excel import & export
// ---------------------------------------------------------------------------

// Canonical columns (also the export header order). Import recognizes these
// plus common aliases; any unrecognized columns (e.g. customerCode) are ignored,
// so an exported file can be edited and re-imported.
const IMPORT_COLUMNS = [
  'customerName',
  'phone',
  'email',
  'hospitalName',
  'gstin',
  'address',
  'state',
  'city',
  'pincode',
  'customerType',
  'assignedTo',
  'status',
];

const HEADER_ALIASES = {
  customername: 'customerName',
  contactname: 'customerName',
  contact: 'customerName',
  name: 'customerName',
  phone: 'phone',
  mobile: 'phone',
  mobilenumber: 'phone',
  contactnumber: 'phone',
  email: 'email',
  emailaddress: 'email',
  hospitalname: 'hospitalName',
  hospital: 'hospitalName',
  gstin: 'gstin',
  gst: 'gstin',
  gstinuin: 'gstin',
  address: 'address',
  state: 'state',
  statename: 'state',
  city: 'city',
  cityname: 'city',
  pincode: 'pincode',
  pin: 'pincode',
  zip: 'pincode',
  zipcode: 'pincode',
  customertype: 'customerType',
  type: 'customerType',
  assignedto: 'assignedTo',
  assigned: 'assignedTo',
  salesperson: 'assignedTo',
  owner: 'assignedTo',
  status: 'status',
};

function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map a raw sheet row (keyed by original headers) to canonical keys.
// Excel cells typed as numbers (phones, pincodes) are coerced to strings so
// they validate the same as CSV input.
function mapImportRow(data) {
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(data)) {
    const canon = HEADER_ALIASES[normalizeHeader(rawKey)];
    if (!canon) continue;
    let val = rawVal;
    if (typeof val === 'number') val = String(val);
    else if (typeof val === 'string') val = val.trim();
    if (out[canon] === undefined || out[canon] === '') out[canon] = val;
  }
  return out;
}

async function parseImportFile(file) {
  const name = (file.originalname || '').toLowerCase();
  const isCsv =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/csv' ||
    name.endsWith('.csv');
  if (isCsv) return rowsFromCsv(file.buffer.toString('utf8'));
  return parseFirstSheet(file.buffer);
}

// Normalizers for duplicate detection — digits-only phone + collapsed lowercase
// name make the match resilient to formatting/whitespace/case differences.
function normPhone(p) {
  return String(p || '').replace(/\D/g, '');
}
function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}
function dedupKey(hospitalName, phone) {
  return `${normName(hospitalName)}|${normPhone(phone)}`;
}

// Build a customer doc from a validated import row using in-memory lookup maps
// (no per-row DB queries). Mirrors resolveImportPayload's matching rules.
function buildImportDoc(row, maps) {
  const doc = {
    customerName: row.customerName,
    phone: row.phone,
    email: row.email || undefined,
    hospitalName: row.hospitalName,
    gstin: row.gstin ? row.gstin.toUpperCase() : undefined,
    address: row.address || undefined,
    pincode: row.pincode || undefined,
    customerType: row.customerType,
    status: row.status || undefined,
  };

  let stateDoc = null;
  if (row.state) {
    stateDoc = maps.stateByName.get(normName(row.state)) || null;
    if (stateDoc) {
      doc.stateId = stateDoc._id;
      doc.stateName = stateDoc.name;
    } else {
      doc.stateName = row.state; // keep raw name; no reference
    }
  }

  if (row.city) {
    const candidates = maps.cityByName.get(normName(row.city)) || [];
    let cityDoc = null;
    if (stateDoc) {
      cityDoc = candidates.find((c) => String(c.stateId) === String(stateDoc._id)) || null;
    } else {
      cityDoc = candidates[0] || null;
    }
    if (cityDoc) {
      doc.cityId = cityDoc._id;
      doc.cityName = cityDoc.name;
      if (!doc.stateId && cityDoc.stateId) {
        doc.stateId = cityDoc.stateId;
        doc.stateName = cityDoc.stateName;
      }
    } else {
      doc.cityName = row.city;
    }
  }

  if (row.assignedTo) {
    const term = row.assignedTo;
    const uid =
      maps.userLookup.get(normName(term)) ||
      maps.userLookup.get(term.toLowerCase()) ||
      maps.userLookup.get(String(term));
    if (uid) doc.assignedTo = uid;
  }

  return doc;
}

async function importCustomers(file, actorId) {
  const { rows } = await parseImportFile(file);
  const result = {
    total: rows.length,
    created: 0,
    skipped: 0,
    duplicates: 0,
    errors: [],
  };

  // Preload every lookup once instead of hitting the DB per row. States/cities
  // are global reference data; users and existing customers are tenant-scoped.
  const [states, cities, users, existing] = await Promise.all([
    State.find({}).select('name').lean(),
    City.find({}).select('name stateId stateName').lean(),
    User.find({}).select('name email mobileNumber').lean(),
    Customer.find({ isDeleted: false }).select('hospitalName phone').lean(),
  ]);

  const stateByName = new Map(states.map((s) => [normName(s.name), s]));
  const cityByName = new Map();
  for (const c of cities) {
    const k = normName(c.name);
    const arr = cityByName.get(k) || [];
    arr.push(c);
    cityByName.set(k, arr);
  }
  const userLookup = new Map();
  for (const u of users) {
    if (u.name) userLookup.set(normName(u.name), u._id);
    if (u.email) userLookup.set(String(u.email).toLowerCase(), u._id);
    if (u.mobileNumber) userLookup.set(String(u.mobileNumber), u._id);
  }
  const maps = { stateByName, cityByName, userLookup };

  // Seed with existing customers so re-importing a file (or a retry after a
  // timeout) skips records already in the DB instead of duplicating them.
  const seen = new Set(existing.map((c) => dedupKey(c.hospitalName, c.phone)));

  const toCreate = [];
  for (const { rowNumber, data } of rows) {
    const mapped = mapImportRow(data);
    const parsed = importRowSchema.safeParse(mapped);
    if (!parsed.success) {
      result.skipped += 1;
      result.errors.push({
        row: rowNumber,
        errors: parsed.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
      continue;
    }
    const row = parsed.data;
    const key = dedupKey(row.hospitalName, row.phone);
    if (seen.has(key)) {
      // Already in the DB or earlier in this same file.
      result.duplicates += 1;
      continue;
    }
    seen.add(key);
    toCreate.push({ rowNumber, doc: buildImportDoc(row, maps) });
  }

  if (toCreate.length) {
    const codes = await reserveCodes('customer', 'CUST', toCreate.length);
    const docs = toCreate.map((t, i) => ({
      ...t.doc,
      customerCode: codes[i],
      createdBy: actorId,
      updatedBy: actorId,
    }));
    try {
      const inserted = await Customer.insertMany(docs, { ordered: false });
      result.created += inserted.length;
    } catch (err) {
      // ordered:false → valid docs still inserted; failures reported per index.
      const insertedCount = Array.isArray(err.insertedDocs)
        ? err.insertedDocs.length
        : 0;
      result.created += insertedCount;
      const writeErrors = err.writeErrors || [];
      for (const we of writeErrors) {
        result.skipped += 1;
        const idx = typeof we.index === 'number' ? we.index : -1;
        result.errors.push({
          row: idx >= 0 && toCreate[idx] ? toCreate[idx].rowNumber : undefined,
          errors: [{ message: we.errmsg || we.err?.errmsg || 'Insert failed' }],
        });
      }
      // Non-bulk error (e.g. validation before insert) with no writeErrors.
      if (!writeErrors.length && !insertedCount) {
        throw err;
      }
    }
  }

  audit('CUSTOMERS_IMPORTED', null, actorId, null, {
    total: result.total,
    created: result.created,
    duplicates: result.duplicates,
    skipped: result.skipped,
  });

  return result;
}

async function exportCustomers(q) {
  const filter = buildCustomerFilter(q);
  const items = await Customer.find(filter)
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 });

  // Export header = import columns + read-only reference columns at the end.
  const headers = ['customerCode', ...IMPORT_COLUMNS, 'totalOutstanding', 'createdAt'];
  const records = items.map((c) => [
    c.customerCode || '',
    c.customerName || '',
    c.phone || '',
    c.email || '',
    c.hospitalName || '',
    c.gstin || '',
    c.address || '',
    c.stateName || '',
    c.cityName || '',
    c.pincode || '',
    c.customerType || '',
    (c.assignedTo && c.assignedTo.name) || '',
    c.status || '',
    c.totalOutstanding == null ? 0 : c.totalOutstanding,
    c.createdAt ? new Date(c.createdAt).toISOString() : '',
  ]);

  return toCsv(headers, records);
}

// Blank template with one example row, so users know the expected shape.
function importTemplateCsv() {
  const example = [
    'Dr. Anjana',
    '9108703981',
    'anjana@gmail.com',
    'New Hospital',
    '29ABCDE1234F1Z5',
    '12 MG Road',
    'Karnataka',
    'Mysuru',
    '570001',
    'Hospital',
    'Sathish',
    'Active',
  ];
  return toCsv(IMPORT_COLUMNS, [example]);
}

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  softDeleteCustomer,
  importCustomers,
  exportCustomers,
  importTemplateCsv,
};
