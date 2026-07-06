const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./companySettings.service');

exports.get = asyncHandler(async (req, res) => {
  const settings = await service.getSettings();
  return ApiResponse.ok(res, settings, 'Company settings fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const settings = await service.updateSettings(req.body, req.user._id);
  return ApiResponse.ok(res, settings, 'Company settings updated');
});
