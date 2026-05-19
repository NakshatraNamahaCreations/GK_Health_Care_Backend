const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./payment.service');

exports.create = asyncHandler(async (req, res) => {
  const p = await service.createPayment(req.body, req.user);
  return ApiResponse.created(res, p, 'Payment recorded');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listPayments(req.query);
  return ApiResponse.ok(res, items, 'Payments fetched', meta);
});

exports.listByCustomer = asyncHandler(async (req, res) => {
  const items = await service.listByCustomer(req.params.customerId);
  return ApiResponse.ok(res, items, 'Payments fetched');
});
