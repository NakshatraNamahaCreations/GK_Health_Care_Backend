const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./expense.service');

exports.create = asyncHandler(async (req, res) => {
  const expense = await service.createExpense(req.body, req.user);
  return ApiResponse.created(res, expense, 'Expense submitted');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listExpenses(req.query);
  return ApiResponse.ok(res, items, 'Expenses fetched', meta);
});

exports.my = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMyExpenses(req.query, req.user._id);
  return ApiResponse.ok(res, items, 'My expenses fetched', meta);
});

exports.approve = asyncHandler(async (req, res) => {
  const expense = await service.approveExpense(req.params.id, req.body, req.user);
  return ApiResponse.ok(res, expense, 'Expense approved');
});

exports.reject = asyncHandler(async (req, res) => {
  const expense = await service.rejectExpense(req.params.id, req.body, req.user);
  return ApiResponse.ok(res, expense, 'Expense rejected');
});
