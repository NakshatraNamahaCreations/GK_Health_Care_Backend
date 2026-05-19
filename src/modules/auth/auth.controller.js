const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const authService = require('./auth.service');

// API_CONTRACTS specifies a non-standard login envelope with a top-level `token`.
exports.login = asyncHandler(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token: accessToken,
    refreshToken,
    data: user,
  });
});

exports.me = asyncHandler(async (req, res) => {
  const data = await authService.me(req.user._id);
  return ApiResponse.ok(res, data, 'Current user fetched');
});

exports.changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(req.user._id, req.body);
  return ApiResponse.ok(res, data, 'Password changed');
});
