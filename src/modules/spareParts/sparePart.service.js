const SparePart = require('./sparePart.model');
const Product = require('../products/product.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
const { ROLE_STATUS } = require('../../constants/status');
const { parseFirstSheet } = require('../../services/excelService');
const { rowsFromCsv, toCsv } = require('../../utils/csv');
const { create: createSchema } = require('./sparePart.validation');

async function createSparePart(payload, actorId) {
  const partCode = await nextCode('sparePart', 'SPR', 5);
  return SparePart.create({ ...payload, partCode, createdBy: actorId, updatedBy: actorId });
}

async function listSpareParts({ page, limit, search, status, category, compatibleMachine }) {
  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (compatibleMachine) filter.compatibleMachine = compatibleMachine;

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { partCode: re },
      { partName: re },
      { manufacturer: re },
      { compatibleMachine: re },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SparePart.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SparePart.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function getSparePart(id) {
  const part = await SparePart.findOne({ _id: id, isDeleted: false });
  if (!part) throw ApiError.notFound('Spare part not found');
  return part;
}

async function updateSparePart(id, payload, actorId) {
  const part = await SparePart.findOne({ _id: id, isDeleted: false });
  if (!part) throw ApiError.notFound('Spare part not found');
  Object.assign(part, payload, { updatedBy: actorId });
  await part.save();
  return part;
}

async function softDeleteSparePart(id, actorId) {
  const part = await SparePart.findOne({ _id: id, isDeleted: false });
  if (!part) throw ApiError.notFound('Spare part not found');
  part.isDeleted = true;
  part.deletedAt = new Date();
  part.deletedBy = actorId;
  part.status = ROLE_STATUS.INACTIVE;
  part.updatedBy = actorId;
  await part.save();
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// CSV / Excel import
// ---------------------------------------------------------------------------

// Canonical columns (also the template header order).
const IMPORT_COLUMNS = [
  'partName',
  'compatibleMachine',
  'category',
  'manufacturer',
  'rate',
  'gstPercentage',
  'stockQuantity',
  'description',
  'status',
];

// Recognized header spellings → canonical key. Headers are normalized (lowercased,
// non-alphanumerics stripped), so "Part Name", "GST %", "Compatible Machine" map.
const HEADER_ALIASES = {
  partname: 'partName',
  name: 'partName',
  part: 'partName',
  compatiblemachine: 'compatibleMachine',
  compatible: 'compatibleMachine',
  machine: 'compatibleMachine',
  fits: 'compatibleMachine',
  category: 'category',
  cat: 'category',
  manufacturer: 'manufacturer',
  make: 'manufacturer',
  brand: 'manufacturer',
  rate: 'rate',
  price: 'rate',
  mrp: 'rate',
  amount: 'rate',
  gstpercentage: 'gstPercentage',
  gst: 'gstPercentage',
  gstpercent: 'gstPercentage',
  tax: 'gstPercentage',
  stockquantity: 'stockQuantity',
  stock: 'stockQuantity',
  quantity: 'stockQuantity',
  qty: 'stockQuantity',
  description: 'description',
  desc: 'description',
  status: 'status',
};

function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map a raw sheet row (keyed by original headers) to canonical keys, trimming
// strings and dropping empty cells so optional numeric columns (rate, stock)
// stay unset instead of coercing an empty string to 0.
function mapImportRow(data) {
  const out = {};
  for (const [rawKey, rawVal] of Object.entries(data)) {
    const canon = HEADER_ALIASES[normalizeHeader(rawKey)];
    if (!canon) continue;
    let val = rawVal;
    if (typeof val === 'string') val = val.trim();
    if (val === '' || val === null || val === undefined) continue;
    if (out[canon] === undefined) out[canon] = val;
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

// `compatibleMachine` is stored as the product NAME (a soft text link — the
// same thing the New Spare Part form saves). Normalize for matching so an
// imported value snaps to the exact catalogue product name.
const normMachine = (s) =>
  String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// What to do when an imported row matches an existing spare part:
//   skip      — leave the existing record untouched (default)
//   update    — apply only the columns present in the file
//   overwrite — the row replaces the record; absent columns reset to defaults
const DUPLICATE_MODES = ['skip', 'update', 'overwrite'];

// Defaults used by overwrite mode for importable columns missing from the row.
// `status` is intentionally excluded — imports never flip Active/Inactive
// unless the file explicitly says so.
const IMPORT_FIELD_DEFAULTS = {
  compatibleMachine: '',
  category: '',
  manufacturer: '',
  rate: 0,
  gstPercentage: 0,
  stockQuantity: 0,
  description: '',
};

// A spare part is identified by its name + the machine it fits.
const dedupKeyOf = (partName, compatibleMachine) =>
  `${normMachine(partName)}|${normMachine(compatibleMachine)}`;

async function importSpareParts(file, actorId, duplicateMode = 'skip') {
  const mode = DUPLICATE_MODES.includes(duplicateMode) ? duplicateMode : 'skip';
  const { rows } = await parseImportFile(file);
  const result = {
    total: rows.length,
    created: 0,
    updated: 0,
    duplicates: 0,
    skipped: 0,
    errors: [],
  };

  // Preload once: product names (so `compatibleMachine` snaps to the exact
  // catalogue name) and existing spare parts (duplicate detection).
  const [products, existing] = await Promise.all([
    Product.find({ isDeleted: { $ne: true } }).select('productName').lean(),
    SparePart.find({ isDeleted: false })
      .select('partName compatibleMachine')
      .lean(),
  ]);
  const productByName = new Map(
    products.map((p) => [normMachine(p.productName), p.productName])
  );
  const existingByKey = new Map(
    existing.map((sp) => [dedupKeyOf(sp.partName, sp.compatibleMachine), sp._id])
  );

  for (const { rowNumber, data } of rows) {
    const mapped = mapImportRow(data);
    if (mapped.compatibleMachine) {
      const canonical = productByName.get(normMachine(mapped.compatibleMachine));
      if (canonical) mapped.compatibleMachine = canonical;
    }
    const parsed = createSchema.safeParse(mapped);
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
    const key = dedupKeyOf(row.partName, row.compatibleMachine);
    const existingId = existingByKey.get(key);

    try {
      if (!existingId) {
        const createdDoc = await createSparePart(row, actorId);
        // Register the new record so a repeat of the same part later in the
        // file follows the duplicate mode instead of creating another copy.
        existingByKey.set(key, createdDoc._id);
        result.created += 1;
      } else if (mode === 'skip') {
        result.duplicates += 1;
      } else {
        const set = { updatedBy: actorId };
        for (const [k, v] of Object.entries(row)) {
          if (v !== undefined) set[k] = v;
        }
        if (mode === 'overwrite') {
          for (const [k, dflt] of Object.entries(IMPORT_FIELD_DEFAULTS)) {
            if (set[k] === undefined) set[k] = dflt;
          }
        }
        await SparePart.updateOne({ _id: existingId }, { $set: set });
        result.updated += 1;
      }
    } catch (err) {
      result.skipped += 1;
      result.errors.push({ row: rowNumber, errors: [{ message: err.message }] });
    }
  }
  return result;
}

// A ready-to-fill CSV template: canonical headers + one example row.
function importTemplateCsv() {
  const example = [
    'Carbon Brush', // partName
    'Fresenius Dialysis Machine 4008S NG', // compatibleMachine
    'Motor', // category
    'Fresenius Medical Care', // manufacturer
    '5699', // rate
    '18', // gstPercentage
    '10', // stockQuantity
    'Replacement carbon brush for the dialysis pump motor', // description
    'Active', // status
  ];
  return toCsv(IMPORT_COLUMNS, [example]);
}

module.exports = {
  createSparePart,
  listSpareParts,
  getSparePart,
  updateSparePart,
  softDeleteSparePart,
  importSpareParts,
  importTemplateCsv,
};
