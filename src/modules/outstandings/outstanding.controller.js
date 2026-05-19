const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./outstanding.service');

exports.create = asyncHandler(async (req, res) => {
  const out = await service.createOutstanding(req.body, req.user._id);
  return ApiResponse.created(res, out, 'Outstanding created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listOutstandings(req.query);
  return ApiResponse.ok(res, items, 'Outstandings fetched', meta);
});

exports.listByCustomer = asyncHandler(async (req, res) => {
  const items = await service.listByCustomer(req.params.customerId);
  return ApiResponse.ok(res, items, 'Outstandings fetched');
});
