const SparePart = require('./sparePart.model');
const ApiError = require('../../utils/ApiError');
const { nextCode } = require('../../utils/codeGenerator');
const { ROLE_STATUS } = require('../../constants/status');
const { parseFirstSheet } = require('../../services/excelService');
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

// Expected columns: partName, compatibleMachine, category, manufacturer,
// rate, gstPercentage, stockQuantity, description
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
      await createSparePart(parsed.data, actorId);
      result.created += 1;
    } catch (err) {
      result.skipped += 1;
      result.errors.push({ row: rowNumber, errors: [{ message: err.message }] });
    }
  }
  return result;
}

module.exports = {
  createSparePart,
  listSpareParts,
  getSparePart,
  updateSparePart,
  softDeleteSparePart,
  importFromExcel,
};
