const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./order.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await service.listOrders(req.query);
  return ApiResponse.ok(res, result.items, 'Orders fetched', result.meta);
});

exports.get = asyncHandler(async (req, res) => {
  const order = await service.getOrder(req.params.id);
  return ApiResponse.ok(res, order, 'Order fetched');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const order = await service.updateStatus(req.params.id, req.body.status, req.user._id);
  return ApiResponse.ok(res, order, 'Order status updated');
});
