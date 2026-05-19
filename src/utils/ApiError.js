// Custom application error. Throw these from services/controllers
// and the global error handler will format them into the standard response.
class ApiError extends Error {
  constructor(statusCode, message, errors = [], isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors = []) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Unauthorized', errors = []) {
    return new ApiError(401, message, errors);
  }
  static forbidden(message = 'Forbidden', errors = []) {
    return new ApiError(403, message, errors);
  }
  static notFound(message = 'Not Found', errors = []) {
    return new ApiError(404, message, errors);
  }
  static conflict(message = 'Conflict', errors = []) {
    return new ApiError(409, message, errors);
  }
  static unprocessable(message = 'Unprocessable Entity', errors = []) {
    return new ApiError(422, message, errors);
  }
  static internal(message = 'Internal Server Error', errors = []) {
    return new ApiError(500, message, errors, false);
  }
}

module.exports = ApiError;
