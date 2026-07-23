const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./termsTemplate.service');

exports.create = asyncHandler(async (req, res) => {
  const doc = await service.createTemplate(req.body, req.user._id);
  return ApiResponse.created(res, doc, 'Terms template created');
});

exports.list = asyncHandler(async (req, res) => {
  const items = await service.listTemplates(req.query);
  return ApiResponse.ok(res, items, 'Terms templates fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const doc = await service.updateTemplate(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, doc, 'Terms template updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.deleteTemplate(req.params.id, req.user._id);
  return ApiResponse.ok(res, data, 'Terms template deleted');
});
