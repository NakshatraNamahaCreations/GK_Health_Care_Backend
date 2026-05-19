const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./serviceReport.service');

exports.create = asyncHandler(async (req, res) => {
  const report = await service.createServiceReport(req.body, req.user);
  return ApiResponse.created(res, report, 'Service report created');
});
