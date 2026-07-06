const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./orderDocument.service');

exports.create = asyncHandler(async (req, res) => {
  const doc = await service.createDocument(req.body, req.user._id);
  return ApiResponse.created(res, doc, 'Document created');
});

exports.list = asyncHandler(async (req, res) => {
  const docs = await service.listDocuments(req.query);
  return ApiResponse.ok(res, docs, 'Documents fetched');
});

exports.get = asyncHandler(async (req, res) => {
  const doc = await service.getDocument(req.params.id);
  return ApiResponse.ok(res, doc, 'Document fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const doc = await service.updateDocument(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, doc, 'Document updated');
});
