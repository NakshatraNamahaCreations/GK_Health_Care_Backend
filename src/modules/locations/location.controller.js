const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');
const service = require('./location.service');

exports.listStates = asyncHandler(async (req, res) => {
  const items = await service.listStates(req.query);
  return ApiResponse.ok(res, items, 'States fetched');
});

exports.createState = asyncHandler(async (req, res) => {
  const state = await service.createState(req.body, req.user._id);
  return ApiResponse.created(res, state, 'State created');
});

exports.listCities = asyncHandler(async (req, res) => {
  const items = await service.listCities(req.query);
  return ApiResponse.ok(res, items, 'Cities fetched');
});

exports.createCity = asyncHandler(async (req, res) => {
  const city = await service.createCity(req.body, req.user._id);
  return ApiResponse.created(res, city, 'City created');
});
