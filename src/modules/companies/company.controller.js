const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./company.service');

// Companies the current user can switch between.
exports.listMine = asyncHandler(async (req, res) => {
  const companies = await service.listAccessible(req);
  return ApiResponse.ok(res, companies, 'Companies fetched');
});

exports.list = asyncHandler(async (req, res) => {
  const companies = await service.listAll();
  return ApiResponse.ok(res, companies, 'Companies fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const company = await service.getById(req.params.id);
  return ApiResponse.ok(res, company, 'Company fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const company = await service.createCompany(req.body, req.user._id);
  return ApiResponse.created(res, company, 'Company created');
});

exports.update = asyncHandler(async (req, res) => {
  const company = await service.updateCompany(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, company, 'Company updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await service.deleteCompany(req.params.id, req.user._id);
  return ApiResponse.ok(res, result, 'Company deleted');
});
