const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./pmReport.service');

exports.create = asyncHandler(async (req, res) => {
  const report = await service.createPmReport(req.body, req.user);
  return ApiResponse.created(res, report, 'Preventive maintenance report created');
});
