const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./notification.service');

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMine(req.user._id, req.query);
  return ApiResponse.ok(res, items, 'Notifications fetched', meta);
});

exports.markRead = asyncHandler(async (req, res) => {
  const n = await service.markRead(req.params.id, req.user._id);
  return ApiResponse.ok(res, n, 'Marked as read');
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const data = await service.markAllRead(req.user._id);
  return ApiResponse.ok(res, data, 'All notifications marked as read');
});

exports.saveFcmToken = asyncHandler(async (req, res) => {
  const data = await service.saveFcmToken(req.user._id, req.body.token);
  return ApiResponse.ok(res, data, 'FCM token saved');
});
