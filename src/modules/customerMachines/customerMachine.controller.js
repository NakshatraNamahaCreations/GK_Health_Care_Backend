const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./customerMachine.service');

exports.create = asyncHandler(async (req, res) => {
  const machine = await service.createMachine(req.body, req.user._id);
  return ApiResponse.created(res, machine, 'Customer machine created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMachines(req.query);
  return ApiResponse.ok(res, items, 'Customer machines fetched', meta);
});

exports.listByCustomer = asyncHandler(async (req, res) => {
  const items = await service.listByCustomer(req.params.customerId);
  return ApiResponse.ok(res, items, 'Customer machines fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const machine = await service.getMachine(req.params.id);
  return ApiResponse.ok(res, machine, 'Customer machine fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const machine = await service.updateMachine(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, machine, 'Customer machine updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.softDeleteMachine(req.params.id, req.user._id);
  return ApiResponse.ok(res, data, 'Customer machine deleted');
});
