const express = require('express');
const { authenticate } = require('../../middlewares/auth');
const { genericUpload } = require('../../middlewares/upload');
const controller = require('./upload.controller');

const router = express.Router();

router.use(authenticate);

// POST /api/v1/uploads/single
// multipart/form-data:
//   file:    <binary>            (required)
//   module:  signatures|photos|profiles|bills|reports|imports|products
router.post('/single', genericUpload.single('file'), controller.single);

// DELETE /api/v1/uploads
// body: { url: "<public asset url>" } — deletes the asset from storage.
router.delete('/', controller.remove);

module.exports = router;
