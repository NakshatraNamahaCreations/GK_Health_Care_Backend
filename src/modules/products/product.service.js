const Product = require('./product.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
const { ROLE_STATUS } = require('../../constants/status');
const { parseFirstSheet } = require('../../services/excelService');
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

// Excel import skeleton.
// Expected columns (case-sensitive, exact header names):
//   productName, productType, category, manufacturer, modelNumber,
//   description, price, gstPercentage, hsnCode, warrantyMonths
async function importFromExcel(buffer, actorId) {
  const { rows } = await parseFirstSheet(buffer);

  const result = { total: rows.length, created: 0, skipped: 0, errors: [] };

  for (const { rowNumber, data } of rows) {
    const parsed = createSchema.safeParse(data);
    if (!parsed.success) {
      result.skipped += 1;
      result.errors.push({
        row: rowNumber,
        errors: parsed.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
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

module.exports = {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  softDeleteProduct,
  importFromExcel,
};
