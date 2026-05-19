const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./dashboard.service');

exports.summary = asyncHandler(async (req, res) => {
  const data = await service.summary();
  return ApiResponse.ok(res, data, 'Dashboard summary');
});

exports.mySummary = asyncHandler(async (req, res) => {
  const data = await service.mySummary(req.user._id);
  return ApiResponse.ok(res, data, 'My dashboard summary');
});
