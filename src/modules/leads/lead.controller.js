const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./lead.service');

exports.create = asyncHandler(async (req, res) => {
  const lead = await service.createLead(req.body, req.user._id);
  return ApiResponse.created(res, lead, 'Lead created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listLeads(req.query);
  return ApiResponse.ok(res, items, 'Leads fetched', meta);
});

exports.get = asyncHandler(async (req, res) => {
  const lead = await service.getLead(req.params.id);
  return ApiResponse.ok(res, lead, 'Lead fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const lead = await service.updateLead(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, lead, 'Lead updated');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const lead = await service.setStatus(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, lead, 'Lead status updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.softDeleteLead(req.params.id, req.user._id);
  return ApiResponse.ok(res, data, 'Lead deleted');
});

exports.addFollowUp = asyncHandler(async (req, res) => {
  const followUp = await service.addFollowUp(req.params.id, req.body, req.user._id);
  return ApiResponse.created(res, followUp, 'Follow-up added');
});

exports.listFollowUps = asyncHandler(async (req, res) => {
  const items = await service.listFollowUps(req.params.id);
  return ApiResponse.ok(res, items, 'Follow-ups fetched');
});

exports.convertToCustomer = asyncHandler(async (req, res) => {
  const result = await service.convertToCustomer(req.params.id, req.body, req.user._id);
  return ApiResponse.created(res, result, 'Lead converted to customer');
});
