const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./customer.service');

exports.create = asyncHandler(async (req, res) => {
  const customer = await service.createCustomer(req.body, req.user._id);
  return ApiResponse.created(res, customer, 'Customer created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listCustomers(req.query);
  return ApiResponse.ok(res, items, 'Customers fetched', meta);
});

exports.get = asyncHandler(async (req, res) => {
  const customer = await service.getCustomer(req.params.id);
  return ApiResponse.ok(res, customer, 'Customer fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const customer = await service.updateCustomer(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, customer, 'Customer updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.softDeleteCustomer(req.params.id, req.user._id);
  return ApiResponse.ok(res, data, 'Customer deleted');
});
