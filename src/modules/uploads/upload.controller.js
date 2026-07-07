const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const { assertAllowedForModule } = require('../../middlewares/upload');
const service = require('./upload.service');

exports.single = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('File is required (form field "file")');
  if (!req.body || !req.body.module) {
    throw ApiError.badRequest('Form field "module" is required');
  }

  assertAllowedForModule(req.file, req.body.module);

  const result = await service.uploadSingle(req.file, req.body.module);
  return ApiResponse.created(res, result, 'File uploaded');
});

// DELETE /api/v1/uploads — remove a previously uploaded asset by its public URL.
exports.remove = asyncHandler(async (req, res) => {
  const url = req.body && req.body.url;
  if (!url || typeof url !== 'string') {
    throw ApiError.badRequest('Field "url" is required');
  }
  const deleted = await service.removeByUrl(url);
  return ApiResponse.ok(res, { deleted }, deleted ? 'File deleted' : 'Nothing to delete');
});
