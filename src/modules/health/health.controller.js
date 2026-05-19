const mongoose = require('mongoose');
const asyncHandler = require('../../utils/asyncHandler');
const ApiResponse = require('../../utils/ApiResponse');

const dbStateMap = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

exports.getHealth = asyncHandler(async (req, res) => {
  const data = {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    db: dbStateMap[mongoose.connection.readyState] || 'unknown',
    env: process.env.NODE_ENV || 'development',
    version: require('../../../package.json').version,
  };
  return ApiResponse.ok(res, data, 'Service is healthy');
});
