const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const service = require('./incidentReport.service');

exports.create = asyncHandler(async (req, res) => {
  const report = await service.createIncidentReport(req.body, req.user);
  return ApiResponse.created(res, report, 'Incident report created');
});
