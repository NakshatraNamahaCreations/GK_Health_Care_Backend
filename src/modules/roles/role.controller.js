const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const { APP_MODULES } = require('../../constants/modules');
const service = require('./role.service');

exports.create = asyncHandler(async (req, res) => {
  const role = await service.createRole(req.body, req.user._id);
  return ApiResponse.created(res, role, 'Role created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listRoles(req.query);
  // Include the module catalog as meta so frontends can render the matrix without a second call.
  return ApiResponse.ok(res, items, 'Roles fetched', { ...meta, modules: APP_MODULES });
});

exports.get = asyncHandler(async (req, res) => {
  const role = await service.getRole(req.params.id);
  return ApiResponse.ok(res, role, 'Role fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const role = await service.updateRole(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, role, 'Role updated');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const role = await service.setStatus(req.params.id, req.body.status, req.user._id);
  return ApiResponse.ok(res, role, 'Role status updated');
});
