const storage = require('../../services/cloudinaryService');

async function uploadSingle(file, moduleKey) {
  return storage.putObject({
    buffer: file.buffer,
    mimeType: file.mimetype,
    moduleKey,
    originalName: file.originalname,
  });
}

// Best-effort delete of a previously uploaded asset by its public URL.
async function removeByUrl(url) {
  return storage.deleteByUrl(url);
}

module.exports = { uploadSingle, removeByUrl };
