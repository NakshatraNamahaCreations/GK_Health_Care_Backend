const Expense = require('./expense.model');
const ExpenseCategory = require('../expenseCategories/expenseCategory.model');
const ApiError = require('../../utils/ApiError');

const { auditLegacy: audit } = require('../../services/auditService');

async function assertCategory(categoryId) {
  const cat = await ExpenseCategory.findById(categoryId);
  if (!cat) throw ApiError.badRequest('Invalid categoryId');
  return cat;
}

async function createExpense(payload, actor) {
  const cat = await assertCategory(payload.categoryId);
  const expense = await Expense.create({
    userId: actor._id,
    categoryId: cat._id,
    categoryName: cat.name,
    amount: payload.amount,
    expenseDate: payload.expenseDate || new Date(),
    description: payload.description || '',
    attachmentUrl: payload.attachmentUrl || '',
    status: 'Pending',
    createdBy: actor._id,
    updatedBy: actor._id,
  });
  audit('EXPENSE_CREATED', expense._id, actor._id, null, expense.toObject());
  return expense;
}

async function updateExpense(id, payload, actor) {
  const expense = await Expense.findOne({ _id: id, isDeleted: false });
  if (!expense) throw ApiError.notFound('Expense not found');
  if (expense.status !== 'Pending') {
    throw ApiError.badRequest(`Cannot edit a ${expense.status.toLowerCase()} expense`);
  }
  // A user can only edit their own pending expenses (admins/super admin can edit any).
  if (
    expense.userId.toString() !== actor._id.toString() &&
    !actor?.populated &&
    !(actor.role && actor.role.isSuperAdmin)
  ) {
    // Note: middleware enforces RBAC; this is a defence-in-depth check.
    throw ApiError.forbidden('You can only edit your own expenses');
  }

  if (payload.categoryId) {
    const cat = await assertCategory(payload.categoryId);
    expense.categoryId = cat._id;
    expense.categoryName = cat.name;
  }
  if (payload.amount !== undefined) expense.amount = payload.amount;
  if (payload.expenseDate) expense.expenseDate = payload.expenseDate;
  if (typeof payload.description === 'string') expense.description = payload.description;
  if (typeof payload.attachmentUrl === 'string') expense.attachmentUrl = payload.attachmentUrl;
  expense.updatedBy = actor._id;

  await expense.save();
  return expense;
}

function buildListFilter(q) {
  const filter = { isDeleted: false };
  if (q.status) filter.status = q.status;
  if (q.userId) filter.userId = q.userId;
  if (q.categoryId) filter.categoryId = q.categoryId;
  if (q.fromDate || q.toDate) {
    filter.expenseDate = {};
    if (q.fromDate) filter.expenseDate.$gte = q.fromDate;
    if (q.toDate) filter.expenseDate.$lte = q.toDate;
  }
  if (q.search) {
    const re = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ description: re }, { categoryName: re }];
  }
  return filter;
}

async function listExpenses(q) {
  const filter = buildListFilter(q);
  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Expense.find(filter)
      .populate('userId', 'name mobileNumber department')
      .populate('approvedBy', 'name mobileNumber')
      .sort({ expenseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(q.limit),
    Expense.countDocuments(filter),
  ]);
  return { items, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 } };
}

async function listMyExpenses(q, userId) {
  // Force userId filter to caller — users can only see their own.
  const filter = buildListFilter(q);
  filter.userId = userId;

  const skip = (q.page - 1) * q.limit;
  const [items, total] = await Promise.all([
    Expense.find(filter)
      .populate('approvedBy', 'name mobileNumber')
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(q.limit),
    Expense.countDocuments(filter),
  ]);
  return { items, meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit) || 1 } };
}

async function approveExpense(id, { approvalRemarks }, actor) {
  const expense = await Expense.findOne({ _id: id, isDeleted: false });
  if (!expense) throw ApiError.notFound('Expense not found');
  if (expense.status !== 'Pending') {
    throw ApiError.badRequest(`Expense is already ${expense.status.toLowerCase()}`);
  }
  expense.status = 'Approved';
  expense.approvedBy = actor._id;
  expense.approvedAt = new Date();
  expense.approvalRemarks = approvalRemarks || '';
  expense.updatedBy = actor._id;
  await expense.save();
  audit('EXPENSE_APPROVED', expense._id, actor._id, null, expense.toObject());
  return expense;
}

async function rejectExpense(id, { approvalRemarks }, actor) {
  const expense = await Expense.findOne({ _id: id, isDeleted: false });
  if (!expense) throw ApiError.notFound('Expense not found');
  if (expense.status !== 'Pending') {
    throw ApiError.badRequest(`Expense is already ${expense.status.toLowerCase()}`);
  }
  expense.status = 'Rejected';
  expense.approvedBy = actor._id;
  expense.approvedAt = new Date();
  expense.approvalRemarks = approvalRemarks;
  expense.updatedBy = actor._id;
  await expense.save();
  audit('EXPENSE_REJECTED', expense._id, actor._id, null, expense.toObject());
  return expense;
}

module.exports = {
  createExpense,
  updateExpense,
  listExpenses,
  listMyExpenses,
  approveExpense,
  rejectExpense,
};
