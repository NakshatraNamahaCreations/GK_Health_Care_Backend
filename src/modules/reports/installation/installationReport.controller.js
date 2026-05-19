const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./installationReport.service');

exports.create = asyncHandler(async (req, res) => {
  const report = await service.createInstallationReport(req.body, req.user);
  return ApiResponse.created(res, report, 'Installation report created');
});
