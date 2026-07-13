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

exports.importFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('A CSV or Excel file is required (form field "file")');
  const result = await service.importProducts(req.file, req.user._id);
  return ApiResponse.ok(res, result, 'Import completed');
});

exports.importTemplate = asyncHandler(async (req, res) => {
  const csv = service.importTemplateCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
  return res.send(`﻿${csv}`); // BOM so Excel opens UTF-8 correctly
});
