// Standard success response wrapper.
class ApiResponse {
  constructor(statusCode, data = {}, message = 'Success', meta = {}) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
      meta: this.meta,
    });
  }

  static ok(res, data = {}, message = 'Success', meta = {}) {
    return new ApiResponse(200, data, message, meta).send(res);
  }
  static created(res, data = {}, message = 'Created', meta = {}) {
    return new ApiResponse(201, data, message, meta).send(res);
  }
  static noContent(res) {
    return res.status(204).send();
  }
}

module.exports = ApiResponse;
