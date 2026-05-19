const s3 = require('../../services/s3Service');

async function uploadSingle(file, moduleKey) {
  return s3.putObject({
    buffer: file.buffer,
    mimeType: file.mimetype,
    moduleKey,
    originalName: file.originalname,
  });
}

module.exports = { uploadSingle };
