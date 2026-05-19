const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./quotation.service');

exports.create = asyncHandler(async (req, res) => {
  const q = await service.createQuotation(req.body, req.user);
  return ApiResponse.created(res, q, 'Quotation created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listQuotations(req.query);
  return ApiResponse.ok(res, items, 'Quotations fetched', meta);
});

exports.get = asyncHandler(async (req, res) => {
  const q = await service.getQuotation(req.params.id);
  return ApiResponse.ok(res, q, 'Quotation fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const q = await service.updateQuotation(req.params.id, req.body, req.user);
  return ApiResponse.ok(res, q, 'Quotation updated');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const q = await service.setStatus(req.params.id, req.body, req.user);
  return ApiResponse.ok(res, q, 'Quotation status updated');
});
