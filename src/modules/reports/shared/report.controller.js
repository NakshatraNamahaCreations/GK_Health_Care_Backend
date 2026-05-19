const asyncHandler = require('../../../utils/asyncHandler');
const ApiResponse = require('../../../utils/ApiResponse');
const ApiError = require('../../../utils/ApiError');
const service = require('./report.service');
const { REPORT_KIND_TO_MODULE_KEY } = require('../../../constants/reportEnums');

// GET /reports?type=service&... — type is required, RBAC was already enforced
// at the route level via dynamic checkPermission. Service does the actual listing.
exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listReports(req.query);
  return ApiResponse.ok(res, items, 'Reports fetched', meta);
});

// GET /reports/:id — we don't know the kind in advance, so look across all
// three collections, then enforce the relevant module's read permission.
exports.get = asyncHandler(async (req, res) => {
  const found = await service.findReportAcrossKinds(req.params.id);
  if (!found) throw ApiError.notFound('Report not found');

  const moduleKey = REPORT_KIND_TO_MODULE_KEY[found.kind];
  if (!req.role.isSuperAdmin && !req.role.hasPermission(moduleKey, 'read')) {
    throw ApiError.forbidden(`Missing read permission for ${moduleKey}`);
  }

  return ApiResponse.ok(
    res,
    { ...found.report.toObject(), type: found.kind },
    'Report fetched'
  );
});
