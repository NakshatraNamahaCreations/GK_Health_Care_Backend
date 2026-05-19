const { z } = require('zod');
const { UPLOAD_MODULE_MIMES } = require('../../middlewares/upload');

const moduleEnum = z.enum(Object.keys(UPLOAD_MODULE_MIMES));

const single = z.object({
  module: moduleEnum,
});

module.exports = { single };
