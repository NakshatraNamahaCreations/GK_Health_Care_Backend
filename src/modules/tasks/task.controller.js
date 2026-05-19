const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./task.service');

exports.create = asyncHandler(async (req, res) => {
  const task = await service.createTask(req.body, req.user);
  return ApiResponse.created(res, task, 'Task created');
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listTasks(req.query);
  return ApiResponse.ok(res, items, 'Tasks fetched', meta);
});

exports.myTasks = asyncHandler(async (req, res) => {
  const { items, meta } = await service.listMyTasks(req.query, req.user._id);
  return ApiResponse.ok(res, items, 'My tasks fetched', meta);
});

exports.get = asyncHandler(async (req, res) => {
  const task = await service.getTask(req.params.id);
  return ApiResponse.ok(res, task, 'Task fetched');
});

exports.update = asyncHandler(async (req, res) => {
  const task = await service.updateTask(req.params.id, req.body, req.user);
  return ApiResponse.ok(res, task, 'Task updated');
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const task = await service.setStatus(req.params.id, req.body, req.user);
  return ApiResponse.ok(res, task, 'Task status updated');
});
