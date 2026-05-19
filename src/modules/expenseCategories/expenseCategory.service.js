const ExpenseCategory = require('./expenseCategory.model');
const ApiError = require('../../utils/ApiError');

async function createCategory(payload, actorId) {
  const dupe = await ExpenseCategory.findOne({ name: payload.name });
  if (dupe) throw ApiError.conflict('Category name already exists');
  return ExpenseCategory.create({ ...payload, createdBy: actorId, updatedBy: actorId });
}

async function listCategories({ status, search }) {
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  return ExpenseCategory.find(filter).sort({ name: 1 });
}

module.exports = { createCategory, listCategories };
