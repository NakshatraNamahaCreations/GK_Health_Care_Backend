const Product = require('./product.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
const { ROLE_STATUS } = require('../../constants/status');
const { parseFirstSheet } = require('../../services/excelService');
const { rowsFromCsv, toCsv } = require('../../utils/csv');
const { create: createSchema } = require('./product.validation');

async function createProduct(payload, actorId) {
  const productCode = await nextCode('product', 'PROD', 5);
  return Product.create({
    ...payload,
    productCode,
    createdBy: actorId,
    updatedBy: actorId,
  });
}

async function listProducts({ page, limit, search, status, productType, category }) {
  const filter = { isDeleted: false };
  if (status) filter.status = status;
  if (productType) filter.productType = productType;
  if (category) filter.category = category;

  if (search) {
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { productCode: re },
      { productName: re },
      { manufacturer: re },
      { modelNumber: re },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Product.countDocuments(filter),
  ]);

  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function getProduct(id) {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function updateProduct(id, payload, actorId) {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw ApiError.notFound('Product not found');
  Object.assign(product, payload, { updatedBy: actorId });
  await product.save();
  return product;
}

async function softDeleteProduct(id, actorId) {
  const product = await Product.findOne({ _id: id, isDeleted: false });
  if (!product) throw ApiError.notFound('Product not found');
  product.isDeleted = true;
  product.deletedAt = new Date();
  product.deletedBy = actorId;
  product.status = ROLE_STATUS.INACTIVE;
  product.updatedBy = actorId;
  await product.save();
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// CSV / Excel import
// ---------------------------------------------------------------------------

// Canonical columns (also the template header order).
const IMPORT_COLUMNS = [
  'productName',
  'productType',
  'category',
  'manufacturer',
  'modelNumber',
  'description',
  'price',
  'gstPercentage',
  'hsnCode',
  'warrantyMonths',
  'status',
];

// Recognized header spellings → canonical key. Headers are normalized (lowercased,
// non-alphanumerics stripped), so "Product Name", "GST %", "Model No." all map.
const HEADER_ALIASES = {
  productname: 'productName',
  product: 'productName',
  name: 'productName',
  producttype: 'productType',
  type: 'productType',
  category: 'category',
  cat: 'category',
  manufacturer: 'manufacturer',
  make: 'manufacturer',
  brand: 'manufacturer',
  modelnumber: 'modelNumber',
  model: 'modelNumber',
  modelno: 'modelNumber',
  description: 'description',
  desc: 'description',
  price: 'price',
  rate: 'price',
  mrp: 'price',
  amount: 'price',
  gstpercentage: 'gstPercentage',
  gst: 'gstPercentage',
  gstpercent: 'gstPercentage',
  tax: 'gstPercentage',
  hsncode: 'hsnCode',
  hsn: 'hsnCode',
  hsnsac: 'hsnCode',
  warrantymonths: 'warrantyMonths',
  warranty: 'warrantyMonths',
  warrantyperiod: 'warrantyMonths',
  status: 'status',
};

function normalizeHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map a raw sheet row (keyed by original headers) to canonical keys, trimming
// strings and dropping empty cells so optional fields stay unset (an empty
// string would otherwise coerce to 0 for numeric columns like price).
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

async function importProducts(file, actorId) {
  const { rows } = await parseImportFile(file);
  const result = { total: rows.length, created: 0, skipped: 0, errors: [] };

  for (const { rowNumber, data } of rows) {
    const mapped = mapImportRow(data);
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
    try {
      await createProduct(parsed.data, actorId);
      result.created += 1;
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
    'Fresenius Dialysis Machine 4008S NG', // productName
    'Dialysis Machine', // productType
    'Hemodialysis', // category
    'Fresenius Medical Care', // manufacturer
    '4008S NG', // modelNumber
    'Next-gen hemodialysis machine', // description
    '375000', // price
    '5', // gstPercentage
    '9018', // hsnCode
    '24', // warrantyMonths
    'Active', // status
  ];
  return toCsv(IMPORT_COLUMNS, [example]);
}

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  softDeleteProduct,
  importProducts,
  importTemplateCsv,
};
