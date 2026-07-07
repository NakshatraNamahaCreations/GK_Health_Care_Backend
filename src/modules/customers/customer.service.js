const Customer = require('./customer.model');
const State = require('../locations/state.model');
const City = require('../locations/city.model');
const User = require('../users/user.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
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
function mapImportRow(data) {
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(data)) {
    const canon = HEADER_ALIASES[normalizeHeader(rawKey)];
    if (!canon) continue;
    const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
    if (out[canon] === undefined || out[canon] === '') out[canon] = val;
  }
  return out;
}

// Turn validated names into a createCustomer payload. State/city/owner are
// matched case-insensitively; unmatched-but-present names are kept as plain
// text (the schema allows denormalized stateName/cityName) rather than failing.
async function resolveImportPayload(row) {
  const payload = {
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
    stateDoc = await State.findOne({ name: new RegExp(`^${escapeRegex(row.state)}$`, 'i') });
    if (stateDoc) payload.stateId = stateDoc._id;
    else payload.stateName = row.state; // keep raw name; no reference
  }

  if (row.city) {
    const cityQuery = { name: new RegExp(`^${escapeRegex(row.city)}$`, 'i') };
    if (stateDoc) cityQuery.stateId = stateDoc._id;
    const cityDoc = await City.findOne(cityQuery);
    if (cityDoc) payload.cityId = cityDoc._id;
    else payload.cityName = row.city;
  }

  if (row.assignedTo) {
    const term = row.assignedTo;
    const userDoc = await User.findOne({
      $or: [
        { name: new RegExp(`^${escapeRegex(term)}$`, 'i') },
        { email: term.toLowerCase() },
        { mobileNumber: term },
      ],
    });
    if (userDoc) payload.assignedTo = userDoc._id;
    // Unmatched owner → leave unassigned (not fatal).
  }

  return payload;
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

async function importCustomers(file, actorId) {
  const { rows } = await parseImportFile(file);
  const result = { total: rows.length, created: 0, skipped: 0, errors: [] };

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
    try {
      const payload = await resolveImportPayload(parsed.data);
      await createCustomer(payload, actorId);
      result.created += 1;
    } catch (err) {
      result.skipped += 1;
      result.errors.push({ row: rowNumber, errors: [{ message: err.message }] });
    }
  }

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
