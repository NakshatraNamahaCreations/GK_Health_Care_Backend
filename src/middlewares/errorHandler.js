const mongoose = require('mongoose');
const { ZodError } = require('zod');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const env = require('../config/env');

// 404 handler — mounted after all routes.
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// Normalizes any thrown error into an ApiError-like shape.
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // multer errors come through with `code` like LIMIT_FILE_SIZE / LIMIT_UNEXPECTED_FILE
  if (err && err.name === 'MulterError') {
    const map = {
      LIMIT_FILE_SIZE: [413, 'File too large'],
      LIMIT_UNEXPECTED_FILE: [400, `Unexpected file field: ${err.field}`],
    };
    const [status, msg] = map[err.code] || [400, `Upload error: ${err.message}`];
    return new ApiError(status, msg);
  }

  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return new ApiError(422, 'Validation failed', errors);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return new ApiError(422, 'Validation failed', errors);
  }

  if (err instanceof mongoose.Error.CastError) {
    return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
  }

  // Duplicate key
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    return new ApiError(409, `Duplicate value for field: ${field}`, [err.keyValue]);
  }

  if (err && err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Invalid token');
  }
  if (err && err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Token expired');
  }

  const statusCode = err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  return new ApiError(statusCode, err.message || 'Internal Server Error', [], false, err.stack);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiErr = normalizeError(err);

  if (apiErr.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} -> ${apiErr.statusCode}: ${apiErr.message}\n${apiErr.stack}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${apiErr.statusCode}: ${apiErr.message}`);
  }

  // In production, never leak unexpected 5xx error messages to clients.
  const messageForClient =
    env.isProd && apiErr.statusCode >= 500 && !apiErr.isOperational
      ? 'Internal Server Error'
      : apiErr.message;

  const body = {
    success: false,
    message: messageForClient,
    errors: apiErr.errors || [],
  };

  if (!env.isProd) {
    body.stack = apiErr.stack;
  }

  res.status(apiErr.statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
