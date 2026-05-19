const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./user.service');

exports.create = asyncHandler(async (req, res) => {
  const user = await service.createUser(req.body, req.user._id);
  return ApiResponse.created(res, user, 'User created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listUsers(req.query);
  return ApiResponse.ok(res, items, 'Users fetched', meta);
});

exports.get = asyncHandler(async (req, res) => {
  const user = await service.getUser(req.params.id);
  return ApiResponse.ok(res, user, 'User fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const user = await service.updateUser(req.params.id, req.body, req.user._id);
  return ApiResponse.ok(res, user, 'User updated');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const user = await service.setStatus(req.params.id, req.body.status, req.user._id);
  return ApiResponse.ok(res, user, 'User status updated');
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const data = await service.resetPassword(req.params.id, req.body.newPassword, req.user._id);
  return ApiResponse.ok(res, data, 'Password reset');
});
