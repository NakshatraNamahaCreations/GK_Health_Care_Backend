const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
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

exports.exportCsv = asyncHandler(async (req, res) => {
  const csv = await service.exportCustomers(req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
  return res.send('﻿' + csv); // BOM so Excel opens UTF-8 correctly
});

exports.importTemplate = asyncHandler(async (req, res) => {
  const csv = service.importTemplateCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="customer-import-template.csv"');
  return res.send(`﻿${csv}`);
});

exports.importFile = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('A CSV or Excel file is required (form field "file")');
  const result = await service.importCustomers(req.file, req.user._id);
  return ApiResponse.ok(res, result, 'Import completed');
});
