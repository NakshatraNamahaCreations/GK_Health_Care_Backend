const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./expenseCategory.service');

exports.create = asyncHandler(async (req, res) => {
  const cat = await service.createCategory(req.body, req.user._id);
  return ApiResponse.created(res, cat, 'Expense category created');
});

exports.list = asyncHandler(async (req, res) => {
  const items = await service.listCategories(req.query);
  return ApiResponse.ok(res, items, 'Expense categories fetched');
});
