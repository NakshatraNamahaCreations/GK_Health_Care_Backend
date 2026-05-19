const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const service = require('./product.service');

exports.create = asyncHandler(async (req, res) => {
  const product = await service.createProduct(req.body, req.user._id);
  return ApiResponse.created(res, product, 'Product created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listProducts(req.query);
  return ApiResponse.ok(res, items, 'Products fetched', meta);
});

exports.get = asyncHandler(async (req, res) => {
  const product = await service.getProduct(req.params.id);
  return ApiResponse.ok(res, product, 'Product fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const product = await service.updateProduct(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, product, 'Product updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.softDeleteProduct(req.params.id, req.user._id);
  return ApiResponse.ok(res, data, 'Product deleted');
});

exports.importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Excel file is required (form field "file")');
  const result = await service.importFromExcel(req.file.buffer, req.user._id);
  return ApiResponse.ok(res, result, 'Import completed');
});
