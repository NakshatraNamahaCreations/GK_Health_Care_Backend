const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const service = require('./sparePart.service');

exports.create = asyncHandler(async (req, res) => {
  const part = await service.createSparePart(req.body, req.user._id);
  return ApiResponse.created(res, part, 'Spare part created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listSpareParts(req.query);
  return ApiResponse.ok(res, items, 'Spare parts fetched', meta);
});

exports.get = asyncHandler(async (req, res) => {
  const part = await service.getSparePart(req.params.id);
  return ApiResponse.ok(res, part, 'Spare part fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const part = await service.updateSparePart(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, part, 'Spare part updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.softDeleteSparePart(req.params.id, req.user._id);
  return ApiResponse.ok(res, data, 'Spare part deleted');
});

exports.importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Excel file is required (form field "file")');
  const result = await service.importFromExcel(req.file.buffer, req.user._id);
  return ApiResponse.ok(res, result, 'Import completed');
});
