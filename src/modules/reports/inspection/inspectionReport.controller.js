const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./inspectionReport.service');

exports.create = asyncHandler(async (req, res) => {
  const report = await service.createInspectionReport(req.body, req.user);
  return ApiResponse.created(res, report, 'Inspection report created');
});
