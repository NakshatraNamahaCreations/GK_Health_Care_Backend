const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./customerContact.service');

exports.create = asyncHandler(async (req, res) => {
  const contact = await service.createContact(req.body, req.user._id);
  return ApiResponse.created(res, contact, 'Contact created');
});

exports.listByCustomer = asyncHandler(async (req, res) => {
  const items = await service.listByCustomer(req.params.customerId);
  return ApiResponse.ok(res, items, 'Contacts fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const contact = await service.updateContact(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, contact, 'Contact updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const data = await service.softDeleteContact(req.params.id, req.user._id);
  return ApiResponse.ok(res, data, 'Contact deleted');
});
